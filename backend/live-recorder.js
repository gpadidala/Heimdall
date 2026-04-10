const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = '/tmp/live-test-2';
if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  console.log('🎬 Launching Chrome with FULL click + element tracking...');
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1600,1000'] });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    recordVideo: { dir: OUT, size: { width: 1600, height: 1000 } },
  });
  const page = await context.newPage();

  const events = [];

  await page.exposeFunction('logEvent', (info) => {
    events.push(info);
    const t = new Date().toISOString().slice(11, 19);
    console.log(`[${t}] ${info.type.padEnd(6)} ${info.url.padEnd(15)} ${info.x},${info.y} → ${info.tag}.${info.id || ''}#${info.cls || ''} "${info.text}"`);
  });

  await page.addInitScript(() => {
    if (window.__installed) return;
    window.__installed = true;
    const log = (type, e) => {
      const t = e.target;
      window.logEvent && window.logEvent({
        type,
        url: window.location.pathname,
        x: e.clientX, y: e.clientY,
        tag: t.tagName,
        id: t.id || '',
        cls: (t.className?.toString() || '').slice(0, 40),
        text: (t.innerText || t.textContent || '').slice(0, 50).trim(),
        // Walk up to find the closest button/clickable
        closest: (() => {
          let el = t;
          let chain = [];
          for (let i = 0; i < 5 && el; i++) {
            chain.push(`${el.tagName}${el.id ? '#'+el.id : ''}`);
            el = el.parentElement;
          }
          return chain.join(' > ');
        })(),
      });
    };
    document.addEventListener('click', (e) => log('CLICK', e), true);
    document.addEventListener('mousedown', (e) => log('DOWN', e), true);
  });

  await page.goto('http://localhost:3001', { waitUntil: 'load', timeout: 30000 });
  console.log('\n✅ READY — Reproduce the bug now.\n');

  process.on('SIGINT', async () => {
    fs.writeFileSync(path.join(OUT, 'events.json'), JSON.stringify(events, null, 2));
    await context.close();
    await browser.close();
    const files = fs.readdirSync(OUT).filter(f => f.endsWith('.webm'));
    if (files.length) fs.renameSync(path.join(OUT, files[0]), path.join(OUT, 'recording.webm'));
    console.log('\n💾 Saved to', OUT);
    process.exit(0);
  });
  setInterval(() => {}, 1000);
})();
