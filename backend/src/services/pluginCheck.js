'use strict';

/**
 * Plugin check service.
 *
 * Powers the Heimdall Plugins page workflow:
 *   1. List every installed plugin with current version + status
 *   2. Look up the latest version + decommission/deprecation status
 *      from grafana.com's public plugin catalog
 *   3. Compute breaking-change warnings (major version, AngularJS,
 *      signature change, decommission)
 *   4. Find every dashboard + alert rule that references this plugin
 *      so the user can validate them in a real browser before upgrading
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

const GRAFANA_COM_API = config.plugins.grafanaComApi || 'https://grafana.com/api';
const GRAFANA_COM_TIMEOUT_MS = 8000;

// Plugin slugs known to be deprecated/decommissioned by Grafana Labs.
// Used as a fallback when grafana.com doesn't expose the field.
const KNOWN_DECOMMISSIONED = new Set([
  'grafana-piechart-panel',     // built into core since 8.x
  'grafana-worldmap-panel',     // replaced by Geomap
  'grafana-polystat-panel',     // unmaintained
  'natel-discrete-panel',       // unmaintained
  'pr0ps-trackmap-panel',       // unmaintained
]);

const KNOWN_ANGULAR_PLUGINS = new Set([
  'grafana-piechart-panel',
  'grafana-worldmap-panel',
  'grafana-polystat-panel',
  'natel-discrete-panel',
  'natel-plotly-panel',
  'natel-influx-admin-panel',
  'briangann-datatable-panel',
]);

// ─── Semver helpers ────────────────────────────────────────────────
function parseSemver(version) {
  if (!version) return null;
  const clean = String(version).replace(/^v/, '').split('-')[0];
  const parts = clean.split('.');
  if (parts.length < 2) return null;
  return {
    major: parseInt(parts[0], 10) || 0,
    minor: parseInt(parts[1], 10) || 0,
    patch: parseInt(parts[2], 10) || 0,
    raw: version,
  };
}

function compareSemver(a, b) {
  const sa = parseSemver(a);
  const sb = parseSemver(b);
  if (!sa || !sb) return 0;
  if (sa.major !== sb.major) return sa.major - sb.major;
  if (sa.minor !== sb.minor) return sa.minor - sb.minor;
  return sa.patch - sb.patch;
}

function getUpdateType(fromVersion, toVersion) {
  const from = parseSemver(fromVersion);
  const to = parseSemver(toVersion);
  if (!from || !to) return 'unknown';
  if (to.major > from.major) return 'major';
  if (to.minor > from.minor) return 'minor';
  if (to.patch > from.patch) return 'patch';
  if (to.major === from.major && to.minor === from.minor && to.patch === from.patch) return 'none';
  return 'older';
}

// ─── Helpers for walking dashboard panels ─────────────────────────
function flattenPanels(panels) {
  const out = [];
  if (!Array.isArray(panels)) return out;
  for (const p of panels) {
    if (p.type === 'row' && Array.isArray(p.panels)) out.push(...p.panels);
    else if (p.type !== 'row') out.push(p);
  }
  return out;
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * List every installed plugin from the target Grafana, enriched with
 * angular/deprecation flags from local heuristics. Does NOT call out
 * to grafana.com — call getUpdateInfo() per plugin for that.
 */
async function listInstalledPlugins(client, { includeCore = true, includeEmbedded = true } = {}) {
  const r = await client.getPlugins();
  if (!r.ok) throw new Error(`getPlugins failed: ${r.error || 'unknown'}`);

  const raw = Array.isArray(r.data) ? r.data : [];

  const list = raw.map((p) => {
    const id = p.id || p.slug;
    const installedVersion = (p.info && p.info.version) || p.version || 'unknown';
    const angular = (p.angular && p.angular.detected === true)
      || p.angularDetected === true
      || KNOWN_ANGULAR_PLUGINS.has(id);
    const decommissioned = KNOWN_DECOMMISSIONED.has(id);

    // Grafana exposes category via `category` (string) and flags core/embedded
    // plugins via `signatureType === 'grafana'` + the `category` field. The
    // exact schema varies across 9.x → 12.x, so we probe multiple fields.
    const category = p.category || (p.signatureType === 'grafana' ? 'core' : 'external');
    const isCore = category === 'core'
      || p.signatureType === 'grafana'
      || (typeof id === 'string' && id.startsWith('grafana-') && p.signature === 'internal');
    const isEmbedded = p.embedded === true || p.parent != null;

    return {
      id,
      name: p.name || id,
      type: p.type || 'unknown',          // 'panel' | 'datasource' | 'app' | 'renderer'
      installedVersion,
      signature: p.signature || p.signatureType || 'unknown',
      enabled: p.enabled !== false,
      hasUpdate: p.hasUpdate === true,
      angular,
      decommissioned,
      core: isCore,
      embedded: isEmbedded,
      category,
      parent: p.parent || null,           // app plugin id this one is embedded in, if any
      info: {
        author: (p.info && p.info.author && p.info.author.name) || null,
        description: (p.info && p.info.description) || null,
        logos: (p.info && p.info.logos) || null,
      },
    };
  });

  const filtered = list.filter((p) => {
    if (!includeCore && p.core) return false;
    if (!includeEmbedded && p.embedded) return false;
    return true;
  });

  // Stable sort: external first (most interesting for upgrade planning),
  // then core, then embedded. Within each group: panel → datasource → app → renderer, alphabetical.
  const typeOrder = { panel: 0, datasource: 1, app: 2, renderer: 3, unknown: 4 };
  const groupOrder = (p) => (p.embedded ? 2 : (p.core ? 1 : 0));
  filtered.sort((a, b) => {
    const ga = groupOrder(a);
    const gb = groupOrder(b);
    if (ga !== gb) return ga - gb;
    const oa = typeOrder[a.type] ?? 99;
    const ob = typeOrder[b.type] ?? 99;
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name);
  });

  logger.info('Heimdall: listed installed plugins', {
    total: filtered.length,
    raw: raw.length,
    core: filtered.filter((p) => p.core).length,
    embedded: filtered.filter((p) => p.embedded).length,
    external: filtered.filter((p) => !p.core && !p.embedded).length,
  });

  return filtered;
}

/**
 * Look up a plugin in grafana.com's catalog. Returns latest version,
 * status, deprecation/decommission notes, and a list of likely
 * breaking changes when upgrading from the installed version.
 *
 * Best-effort: returns a safe fallback if the network call fails.
 */
async function getUpdateInfo(installed) {
  const id = installed.id;
  const installedVersion = installed.installedVersion;
  const result = {
    pluginId: id,
    installedVersion,
    latestVersion: null,
    updateType: 'unknown',
    updateAvailable: false,
    deprecated: false,
    decommissioned: installed.decommissioned || false,
    statusMessage: null,
    breakingChanges: [],
    catalogUrl: `https://grafana.com/grafana/plugins/${encodeURIComponent(id)}/`,
    fetched: false,
  };

  try {
    const url = `${GRAFANA_COM_API}/plugins/${encodeURIComponent(id)}`;
    const r = await axios.get(url, { timeout: GRAFANA_COM_TIMEOUT_MS, validateStatus: () => true });
    if (r.status === 200 && r.data) {
      result.fetched = true;
      result.latestVersion = r.data.version || null;
      result.statusMessage = r.data.statusMessage || r.data.status || null;
      // grafana.com flags decommissioned plugins via `status: "deprecated"`
      // or `statusContext: "..."` — fall back to heuristics if absent
      if (r.data.status === 'deprecated' || r.data.status === 'archived') {
        result.deprecated = true;
        result.decommissioned = true;
      }
      if (result.latestVersion) {
        result.updateType = getUpdateType(installedVersion, result.latestVersion);
        result.updateAvailable = compareSemver(installedVersion, result.latestVersion) < 0;
      }
    }
  } catch (err) {
    logger.warn('grafana.com plugin lookup failed', { id, error: err.message });
  }

  // Heuristic breaking-change detection — runs regardless of whether the
  // grafana.com lookup succeeded so we still get useful warnings offline
  result.breakingChanges = analyzeBreakingChanges(installed, result);
  return result;
}

function analyzeBreakingChanges(installed, updateInfo) {
  const warnings = [];

  if (updateInfo.decommissioned || installed.decommissioned) {
    warnings.push({
      level: 'critical',
      message: `${installed.name} is decommissioned. Migrate to a maintained alternative before upgrading Grafana.`,
    });
  }

  if (installed.angular) {
    warnings.push({
      level: 'critical',
      message: 'AngularJS plugin — Grafana 11+ removes AngularJS support. This plugin will stop working after the upgrade.',
    });
  }

  if (updateInfo.updateType === 'major') {
    warnings.push({
      level: 'high',
      message: `Major version bump (${installed.installedVersion} → ${updateInfo.latestVersion}). Expect breaking API or schema changes — review the release notes.`,
    });
  }

  if (installed.signature === 'unsigned') {
    warnings.push({
      level: 'medium',
      message: 'Plugin is unsigned. Grafana may refuse to load it depending on your allow_loading_unsigned_plugins setting.',
    });
  }

  if (installed.signature === 'modified' || installed.signature === 'invalid') {
    warnings.push({
      level: 'critical',
      message: `Plugin signature is "${installed.signature}" — files may have been tampered with.`,
    });
  }

  return warnings;
}

/**
 * Find every dashboard (and alert rule, for datasource plugins) that
 * references the given plugin id. Used to drive the impact preview
 * and to scope the Playwright validation run.
 */
async function getPluginImpact(client, pluginId) {
  const search = await client.searchDashboards();
  const hits = (search.ok && Array.isArray(search.data)) ? search.data : [];

  const impactedDashboards = [];
  let totalAffectedPanels = 0;

  for (const hit of hits) {
    if (!hit.uid) continue;
    try {
      const dash = await client.getDashboardByUid(hit.uid);
      if (!dash.ok || !dash.data || !dash.data.dashboard) continue;
      const model = dash.data.dashboard;
      const panels = flattenPanels(model.panels || []);

      // Match either by panel.type === pluginId (panel plugin) OR by
      // datasource.type === pluginId (datasource plugin used in this dash)
      const matching = panels.filter((p) => {
        if (p.type === pluginId) return true;
        if (p.datasource && typeof p.datasource === 'object' && p.datasource.type === pluginId) return true;
        if (Array.isArray(p.targets)) {
          return p.targets.some((t) => t.datasource && typeof t.datasource === 'object' && t.datasource.type === pluginId);
        }
        return false;
      });

      if (matching.length > 0) {
        totalAffectedPanels += matching.length;
        impactedDashboards.push({
          uid: hit.uid,
          title: model.title || hit.title,
          folder: hit.folderTitle || '',
          panelCount: panels.length,
          affectedPanels: matching.length,
          panelTitles: matching.slice(0, 5).map((p) => p.title || `panel-${p.id}`),
        });
      }
    } catch (_) { /* skip */ }
  }

  // Alert rules: for datasource plugins, walk rules and check data[].datasourceUid
  // We can't fully resolve uid → type without a second call, so we collect
  // rules whose query model.datasource.type matches the plugin id.
  let impactedAlerts = [];
  try {
    const rulesRes = await client.getAlertRules();
    const allRules = [];
    if (rulesRes.ok) {
      if (Array.isArray(rulesRes.data)) allRules.push(...rulesRes.data);
      else if (typeof rulesRes.data === 'object' && rulesRes.data) {
        for (const folder of Object.values(rulesRes.data)) {
          if (Array.isArray(folder)) {
            for (const group of folder) {
              if (Array.isArray(group.rules)) allRules.push(...group.rules);
            }
          }
        }
      }
    }
    impactedAlerts = allRules
      .filter((r) => {
        const data = r.data || [];
        return data.some((q) => {
          const m = q.model || {};
          const dsType = (m.datasource && m.datasource.type) || (q.datasource && q.datasource.type);
          return dsType === pluginId;
        });
      })
      .map((r) => ({
        uid: r.uid,
        title: r.title || r.alert || r.name || 'Unnamed',
        folderUID: r.folderUID || null,
      }));
  } catch (_) { /* alerts may not be available */ }

  return {
    pluginId,
    dashboards: impactedDashboards,
    alerts: impactedAlerts,
    summary: {
      dashboardCount: impactedDashboards.length,
      alertCount: impactedAlerts.length,
      totalAffectedPanels,
    },
  };
}

module.exports = {
  listInstalledPlugins,
  getUpdateInfo,
  getPluginImpact,
  analyzeBreakingChanges,
  // exported for tests
  parseSemver,
  compareSemver,
  getUpdateType,
};
