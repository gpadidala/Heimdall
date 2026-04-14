'use strict';

/**
 * Dashboard full-page screenshot capture.
 *
 * Parallels the JSON snapshot flow (services/snapshot.js) but instead of
 * saving dashboard JSON, it opens each matched dashboard in a real headless
 * Chromium (via Playwright), scrolls it end-to-end to force lazy panels to
 * render, takes a single full-page PNG, and packages everything as a zip.
 *
 * Scope filters:
 *   - all                  → every dashboard in the instance
 *   - uids: string[]       → exact uid list
 *   - datasourceUid: string → dashboards referencing that datasource uid
 *   - datasourceType: string → dashboards referencing any DS of that type
 *   - pluginId: string     → dashboards using the plugin as a panel type
 *                            OR referencing a datasource of that type
 *
 * Output layout on disk:
 *   .screenshot-bundles/
 *     {timestamp}_{slug}/
 *       manifest.json
 *       dashboards/
 *         {uid}.png
 *         {uid}.json
 *       bundle.zip
 *
 * The zip is built once at the end of the run so downloads are instant.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');
const { chromium } = require('playwright');

const GrafanaClient = require('./grafanaClient');
const logger = require('../utils/logger');

const BASE_DIR = path.join(__dirname, '../../.screenshot-bundles');
const VIEWPORT = { width: 1920, height: 1080 };
const NAV_TIMEOUT_MS = 45_000;
const PANEL_SETTLE_MS = 2_500;
const SCROLL_STEP_PX = 700;
const SCROLL_PAUSE_MS = 400;
const PER_DASHBOARD_HARD_TIMEOUT_MS = 90_000;

// ─── helpers ────────────────────────────────────────────────────────
function slugify(str) {
  return String(str || 'bundle')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'bundle';
}

function timestamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function safeEmit(onProgress, evt) {
  if (typeof onProgress !== 'function') return;
  try { onProgress(evt); } catch (err) {
    logger.warn('screenshot onProgress threw', { error: err.message });
  }
}

function ensureBaseDir() {
  if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR, { recursive: true });
  return BASE_DIR;
}

function flattenPanels(panels) {
  const out = [];
  if (!Array.isArray(panels)) return out;
  for (const p of panels) {
    if (p.type === 'row' && Array.isArray(p.panels)) out.push(...p.panels);
    else if (p.type !== 'row') out.push(p);
  }
  return out;
}

// Decide whether a dashboard model matches the scope filter. The filter is
// applied in-process so we only Playwright the dashboards that actually
// matter — screenshots are the expensive part.
function dashboardMatches(dashModel, filter) {
  if (!filter || filter.all) return true;
  if (Array.isArray(filter.uids) && filter.uids.length) {
    return filter.uids.includes(dashModel.uid);
  }
  const panels = flattenPanels(dashModel.panels || []);
  const dsUid = filter.datasourceUid || null;
  const dsType = filter.datasourceType || null;
  const pluginId = filter.pluginId || null;

  for (const p of panels) {
    if (pluginId && p.type === pluginId) return true;

    const ds = p.datasource;
    if (ds && typeof ds === 'object') {
      if (dsUid && ds.uid === dsUid) return true;
      if (dsType && ds.type === dsType) return true;
      if (pluginId && ds.type === pluginId) return true;
    }
    if (Array.isArray(p.targets)) {
      for (const t of p.targets) {
        const td = t.datasource;
        if (td && typeof td === 'object') {
          if (dsUid && td.uid === dsUid) return true;
          if (dsType && td.type === dsType) return true;
          if (pluginId && td.type === pluginId) return true;
        }
      }
    }
  }
  return false;
}

// ─── public API ─────────────────────────────────────────────────────

async function captureDashboardScreenshots({
  grafanaUrl,
  token,
  orgId,
  name,
  filter = { all: true },
  maxDashboards = 500,
  onProgress,
} = {}) {
  const startedAt = Date.now();
  const bundleId = crypto.randomUUID();

  const client = new GrafanaClient(grafanaUrl, token, orgId);

  // 1. health check
  safeEmit(onProgress, { stage: 'health-check' });
  const health = await client.getHealth();
  if (!health.ok) {
    throw new Error(`Grafana unreachable: ${health.error || 'status=' + health.status}`);
  }

  // 2. list all dashboards
  safeEmit(onProgress, { stage: 'searching-dashboards' });
  const searchRes = await client.searchDashboards('', 5000);
  if (!searchRes.ok) {
    throw new Error(`Dashboard search failed: ${searchRes.error || 'status=' + searchRes.status}`);
  }
  const hits = Array.isArray(searchRes.data) ? searchRes.data : [];

  // 3. resolve filter → matching uids (walk JSON for each hit)
  safeEmit(onProgress, { stage: 'resolving-filter', total: hits.length, completed: 0 });
  const matches = [];
  let scanned = 0;
  for (const hit of hits) {
    if (!hit.uid) { scanned += 1; continue; }
    // Short-circuit for the simple cases so we don't fetch JSON we don't need.
    if (filter && filter.all) {
      matches.push({ uid: hit.uid, title: hit.title, folder: hit.folderTitle || '' });
    } else if (Array.isArray(filter?.uids)) {
      if (filter.uids.includes(hit.uid)) {
        matches.push({ uid: hit.uid, title: hit.title, folder: hit.folderTitle || '' });
      }
    } else {
      // Need to read the dashboard json to check datasource/plugin usage
      const res = await client.getDashboardByUid(hit.uid);
      if (res.ok && res.data && res.data.dashboard) {
        const dash = res.data.dashboard;
        if (dashboardMatches(dash, filter)) {
          matches.push({
            uid: hit.uid,
            title: dash.title || hit.title,
            folder: (res.data.meta && res.data.meta.folderTitle) || hit.folderTitle || '',
          });
        }
      }
    }
    scanned += 1;
    if (scanned % 25 === 0) {
      safeEmit(onProgress, { stage: 'resolving-filter', total: hits.length, completed: scanned, matched: matches.length });
    }
    if (matches.length >= maxDashboards) break;
  }

  safeEmit(onProgress, {
    stage: 'filter-resolved',
    total: hits.length,
    matched: matches.length,
    truncated: matches.length >= maxDashboards,
  });

  if (matches.length === 0) {
    throw new Error('No dashboards matched the filter');
  }

  // 4. create output dir
  ensureBaseDir();
  const dirName = `${timestamp()}_${slugify(name || 'screenshots')}_${bundleId.slice(0, 8)}`;
  const bundleDir = path.join(BASE_DIR, dirName);
  const dashDir = path.join(bundleDir, 'dashboards');
  fs.mkdirSync(dashDir, { recursive: true });

  // 5. launch browser + authenticate once
  safeEmit(onProgress, { stage: 'launching-browser' });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: VIEWPORT,
    // Token header is set per-request; not strictly needed for /d/ routes but
    // ensures API XHRs from the dashboard are authorized.
    extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const page = await context.newPage();

  // Warm-up navigation so cookies/session are established if the Grafana
  // deployment uses session cookies rather than bearer tokens.
  try {
    await page.goto(grafanaUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
  } catch (err) {
    logger.warn('screenshot warm-up navigation failed', { error: err.message });
  }

  // 6. capture each dashboard
  const captures = [];
  let completed = 0;
  for (const m of matches) {
    completed += 1;
    const evtBase = { stage: 'capturing', total: matches.length, completed, current: m.title, uid: m.uid };
    safeEmit(onProgress, evtBase);

    const pngPath = path.join(dashDir, `${m.uid}.png`);
    const metaPath = path.join(dashDir, `${m.uid}.json`);

    const dashUrl = buildDashboardUrl(grafanaUrl, m.uid, orgId);
    const captureStart = Date.now();
    let error = null;
    let bytes = 0;

    try {
      await Promise.race([
        captureOne(page, dashUrl, pngPath),
        new Promise((_, reject) => setTimeout(() => reject(new Error('hard timeout')), PER_DASHBOARD_HARD_TIMEOUT_MS)),
      ]);
      bytes = fs.statSync(pngPath).size;
    } catch (err) {
      error = err.message || String(err);
      logger.warn('dashboard screenshot failed', { uid: m.uid, error });
      safeEmit(onProgress, { ...evtBase, failed: true, error });
    }

    const meta = {
      uid: m.uid,
      title: m.title,
      folder: m.folder,
      url: dashUrl,
      bytes,
      capturedAt: new Date().toISOString(),
      durationMs: Date.now() - captureStart,
      error,
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    captures.push(meta);
  }

  // 7. close browser
  try { await context.close(); } catch {}
  try { await browser.close(); } catch {}

  // 8. manifest
  const durationMs = Date.now() - startedAt;
  const succeeded = captures.filter((c) => !c.error).length;
  const failed = captures.length - succeeded;
  const totalBytes = captures.reduce((acc, c) => acc + (c.bytes || 0), 0);

  const manifest = {
    id: bundleId,
    name: name || 'Screenshot bundle',
    grafanaUrl,
    filter,
    createdAt: new Date().toISOString(),
    durationMs,
    dashboardCount: captures.length,
    succeeded,
    failed,
    totalBytes,
    dashboards: captures,
  };
  const manifestPath = path.join(bundleDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  // 9. zip it
  safeEmit(onProgress, { stage: 'zipping', dashboardCount: captures.length });
  const zipPath = path.join(bundleDir, 'bundle.zip');
  const zipBytes = await zipBundle(bundleDir, zipPath);

  safeEmit(onProgress, {
    stage: 'complete',
    id: bundleId,
    bundleDir,
    zipPath,
    zipBytes,
    dashboardCount: captures.length,
    succeeded,
    failed,
    durationMs,
  });

  logger.info('Screenshot bundle created', {
    id: bundleId,
    name,
    dashboardCount: captures.length,
    succeeded,
    failed,
    zipBytes,
    durationMs,
  });

  return {
    id: bundleId,
    name: manifest.name,
    bundleDir,
    zipPath,
    zipBytes,
    manifest,
  };
}

function buildDashboardUrl(grafanaUrl, uid, orgId) {
  const base = String(grafanaUrl || '').replace(/\/$/, '');
  const qs = new URLSearchParams({
    kiosk: 'tv',                // hides chrome but keeps panels
    refresh: '0',               // don't auto-refresh during capture
    from: 'now-6h',
    to: 'now',
  });
  if (orgId) qs.set('orgId', String(orgId));
  return `${base}/d/${encodeURIComponent(uid)}?${qs.toString()}`;
}

// Capture one dashboard: navigate → wait for panels → scroll end-to-end →
// screenshot full page. Scrolling is critical — without it, lazy panels
// below the fold render as empty placeholders in the screenshot.
async function captureOne(page, url, outPath) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });

  // Try to wait for networkidle but don't hang forever on background refreshes
  try {
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
  } catch {
    // some dashboards keep sockets open — that's fine
  }

  // Wait for at least one panel content block to appear (Grafana 9/10/11/12
  // all expose one of these markers). Best-effort — continue on timeout.
  try {
    await page.waitForSelector(
      '[data-testid="data-testid panel content"], .panel-content, .react-grid-item, [class*="panel-container"]',
      { timeout: 12_000, state: 'attached' }
    );
  } catch { /* render anyway */ }

  await page.waitForTimeout(PANEL_SETTLE_MS);

  // Walk the page top → bottom in steps so lazy-loaded panels mount before
  // we screenshot. Each step hands control back to the page so it can fetch.
  const totalHeight = await page.evaluate(() => document.body.scrollHeight || document.documentElement.scrollHeight || 0);
  let y = 0;
  while (y < totalHeight) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(SCROLL_PAUSE_MS);
    y += SCROLL_STEP_PX;
  }
  // Final scroll to the absolute bottom to catch any panels that expanded
  // in height during the walk, then settle + return to top for the capture.
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(SCROLL_PAUSE_MS);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(500);

  await page.screenshot({ path: outPath, fullPage: true, type: 'png' });
}

function zipBundle(sourceDir, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } }); // PNGs are already compressed

    output.on('close', () => resolve(archive.pointer()));
    archive.on('warning', (err) => logger.warn('screenshot zip warning', { error: err.message }));
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    // Only include the dashboards dir + manifest — skip the bundle.zip itself
    archive.file(path.join(sourceDir, 'manifest.json'), { name: 'manifest.json' });
    archive.directory(path.join(sourceDir, 'dashboards'), 'dashboards');
    archive.finalize();
  });
}

// ─── bundle listing / read helpers for the API layer ───────────────

function listBundles() {
  if (!fs.existsSync(BASE_DIR)) return [];
  const entries = fs.readdirSync(BASE_DIR)
    .map((name) => {
      const dir = path.join(BASE_DIR, name);
      const manifestPath = path.join(dir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) return null;
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const zipPath = path.join(dir, 'bundle.zip');
        const zipExists = fs.existsSync(zipPath);
        const zipBytes = zipExists ? fs.statSync(zipPath).size : 0;
        return {
          id: manifest.id,
          name: manifest.name,
          dir,
          zipPath: zipExists ? zipPath : null,
          zipBytes,
          createdAt: manifest.createdAt,
          dashboardCount: manifest.dashboardCount,
          succeeded: manifest.succeeded,
          failed: manifest.failed,
          grafanaUrl: manifest.grafanaUrl,
          filter: manifest.filter,
          durationMs: manifest.durationMs,
        };
      } catch (err) {
        logger.warn('listBundles: failed to read manifest', { dir, error: err.message });
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return entries;
}

function getBundle(id) {
  return listBundles().find((b) => b.id === id) || null;
}

function deleteBundle(id) {
  const b = getBundle(id);
  if (!b) return false;
  try {
    fs.rmSync(b.dir, { recursive: true, force: true });
    return true;
  } catch (err) {
    logger.error('deleteBundle failed', { id, error: err.message });
    return false;
  }
}

module.exports = {
  BASE_DIR,
  captureDashboardScreenshots,
  listBundles,
  getBundle,
  deleteBundle,
};
