// App evaluation: screenshots (desktop + portrait phone) of the key places, dives, languages and follow + peek,
// bytes loaded, and frame timings (idle, zoom flights, a 3-level dive, follow, the place morph) at 1× and 6× CPU
// throttle.
// Usage: npm run build && npx vite preview --port 5318 &  npm run evaluate [-- baseUrl] [--only=shots|perf] [--style=id]
// Writes docs/img/app-<style>-*.jpg and merges into docs/app-metrics.json (other styles' entries are kept).
import { chromium } from 'playwright';
import { gzipSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const BASE = args.find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:5318/';
const ONLY = flag('only');
const STYLES = flag('style')
  ? [flag('style')]
  : readdirSync('content/themes').filter((d) => existsSync(`content/themes/${d}/meta.json`))
      .sort((a, b) => JSON.parse(readFileSync(`content/themes/${a}/meta.json`)).order - JSON.parse(readFileSync(`content/themes/${b}/meta.json`)).order);
const VIEWS = { desktop: { w: 1440, h: 900, dpr: 1 }, phone: { w: 390, h: 844, dpr: 2, touch: true } };
// GPU-backed headless where available (macOS: Metal via ANGLE); CPU swiftshader otherwise.
const ARGS = process.env.SWIFTSHADER ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];

mkdirSync('docs/img', { recursive: true });
const browser = await chromium.launch({ args: ARGS });
const metricsPath = 'docs/app-metrics.json';
const old = existsSync(metricsPath) ? JSON.parse(readFileSync(metricsPath, 'utf8')).metrics : {};
const metrics = { ...old };

async function open(view, url) {
  const v = VIEWS[view];
  const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr, hasTouch: !!v.touch, isMobile: !!v.touch });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('  pageerror', e.message));
  p.on('console', (m) => m.type() === 'error' && console.log('  console', m.text()));
  await p.goto(url);
  await p.waitForFunction(() => window.__app, null, { timeout: 15000 });
  await p.evaluate(() => document.fonts.ready);
  return { ctx, p };
}
const settle = (p) => p.waitForFunction(() => !window.__app.busy(), null, { timeout: 8000 }).then(() => p.waitForTimeout(400));
/** `where` is the hash after the language, e.g. 'home/watch-video/internet'. */
const url = (style, lang, where, q = '') => `${BASE}?style=${style}${q}#/${lang}/${where}`;

/** Frame times over `ms` (rAF deltas) plus main-thread busy time per frame (CDP TaskDuration). */
async function sample(p, cdp, ms, during) {
  const busy = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'TaskDuration').value;
  const b0 = await busy();
  const run = p.evaluate((ms) => new Promise((res) => {
    const d = []; let last = performance.now(); const t0 = last;
    const f = (t) => { d.push(t - last); last = t; if (t - t0 < ms) requestAnimationFrame(f); else res(d); };
    requestAnimationFrame(f);
  }), ms);
  if (during) await during();
  const d = (await run).slice(1).sort((a, b) => a - b);
  const b1 = await busy();
  const q = (x) => +d[Math.min(d.length - 1, Math.floor(d.length * x))].toFixed(1);
  return { fps: Math.round((d.length * 1000) / d.reduce((a, b) => a + b, 0)), p50: q(0.5), p95: q(0.95), worst: q(1), cpuMsPerFrame: +(((b1 - b0) * 1000) / d.length).toFixed(2) };
}

for (const style of STYLES) {
  console.log(style);
  const m = (metrics[style] = { ...(metrics[style] ?? {}) });

  if (ONLY !== 'shots') {
    // 1. bytes actually fetched from dist/ for an English start (js/css gzipped, fonts as-is)
    const files = new Set();
    const { ctx, p } = await open('phone', url(style, 'en', 'home/watch-video'));
    p.on('requestfinished', (r) => { const u = new URL(r.url()); if (u.href.startsWith(BASE)) files.add(u.pathname); });
    await p.reload();
    await p.waitForFunction(() => window.__app);
    await p.waitForTimeout(2500);
    const size = { js: 0, css: 0, font: 0 };
    for (const f of files) {
      const path = `dist${f.endsWith('/') ? f + 'index.html' : f}`;
      if (!existsSync(path)) continue;
      const buf = readFileSync(path);
      const kind = f.endsWith('.js') ? 'js' : f.endsWith('.css') ? 'css' : /\.woff2?$/.test(f) ? 'font' : null;
      if (kind) size[kind] += kind === 'font' ? buf.length : gzipSync(buf).length;
    }
    m.kB = Object.fromEntries(Object.entries(size).map(([k, v]) => [k, +(v / 1024).toFixed(1)]));

    // 2. frame timings on the portrait phone viewport (DPR 2), at 1× and 6× CPU throttle
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Performance.enable');
    const go = (loc) => p.evaluate((l) => window.__app.go(l), loc);
    m.perf = {};
    for (const rate of [1, 6]) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      const r = (m.perf[`${rate}x`] = {});
      await go({ places: ['home'], path: [], stop: null }); await settle(p);
      r.idle = await sample(p, cdp, 2000);
      r.flyToFibre = await sample(p, cdp, 1600, () => go({ path: ['router-internet'] }));
      await settle(p);
      r.fibreIdle = await sample(p, cdp, 1500);
      r.flyOut = await sample(p, cdp, 1600, () => go({ path: [] }));
      await settle(p);
      // three levels down: overview → inside the internet → the access fibre (GPON)
      r.flyDeep = await sample(p, cdp, 2400, () => go({ path: ['internet', 'home-cabinet'] }));
      await settle(p);
      r.deepIdle = await sample(p, cdp, 1500);
      await go({ path: [] }); await settle(p);
      await p.evaluate(() => window.__app.follow('video'));
      await p.waitForTimeout(600);
      r.follow = await sample(p, cdp, 2000);
      await p.keyboard.press('Escape');
      await settle(p);
      // the place morph: the house slides away, the street slides in
      r.morphToStreet = await sample(p, cdp, 1200, () => go({ places: ['street'] }));
      await settle(p);
      r.streetIdle = await sample(p, cdp, 1500);
      r.flyTo5G = await sample(p, cdp, 1600, () => go({ path: ['phone-cell-tower'] }));
      await settle(p);
      r.nrIdle = await sample(p, cdp, 1500);
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await ctx.close();
    console.log(' ', JSON.stringify(m));
  }

  if (ONLY !== 'perf') {
    // 3. screenshots
    const shots = [];
    for (const view of Object.keys(VIEWS)) {
      shots.push({ view, where: 'home/watch-video', name: `home-${view}` });
      shots.push({ view, where: 'street/watch-video', name: `street-${view}` });
      shots.push({ view, where: 'home/watch-video/phone-ap', name: `wifi-${view}` });
      shots.push({ view, where: 'street/watch-video/phone-cell-tower', name: `5g-${view}` });
      shots.push({ view, where: 'home/watch-video/internet', name: `internet-${view}` });
      shots.push({ view, where: 'street/watch-video/internet', name: `internet-street-${view}` });
      shots.push({ view, where: 'home/watch-video/internet/home-cabinet', name: `gpon-${view}` });
    }
    shots.push({ view: 'desktop', where: 'desk/watch-video', name: 'desk-desktop' });
    shots.push({ view: 'desktop', where: 'home/watch-video/router-internet', name: 'fibre-desktop' });
    shots.push({ view: 'desktop', where: 'home/watch-video', q: '&level=nerd', name: 'home-nerd-desktop' });
    shots.push({ view: 'phone', where: 'street/watch-video/internet', lang: 'da', q: '&level=nerd', name: 'internet-street-nerd-da-phone' });
    shots.push({ view: 'desktop', where: 'home/watch-video', lang: 'ar', name: 'home-ar-desktop' });
    shots.push({ view: 'desktop', where: 'home/watch-video', follow: true, name: 'peek-desktop' });
    shots.push({ view: 'phone', where: 'street/watch-video', follow: true, name: 'peek-street-phone' });
    shots.push({ view: 'desktop', where: 'home/watch-video', picker: true, name: 'picker-desktop' });
    shots.push({ view: 'phone', where: 'home/watch-video', picker: true, name: 'picker-phone' });
    shots.push({ view: 'desktop', where: 'home/watch-video', morph: true, name: 'morph-desktop' });
    for (const s of shots) {
      const { ctx, p } = await open(s.view, url(style, s.lang ?? 'en', s.where, s.q ?? ''));
      await settle(p);
      // a fixed clock so packets sit in the same spots across runs
      // (not for follow shots: jumping the clock can hand follow() a packet that is about to arrive)
      if (!s.follow) await p.evaluate(() => window.__app.setClock(5.2));
      if (s.follow) {
        await p.evaluate(() => window.__app.follow('video'));
        await p.waitForTimeout(2600);
      } else if (s.picker) {
        await p.evaluate(() => window.__app.picker(true));
        await p.waitForTimeout(500);
      } else if (s.morph) {
        // mid-morph: the house on its way out, the street on its way in
        await p.evaluate(() => window.__app.go({ places: ['street'] }));
        await p.waitForTimeout(330);
      } else await p.waitForTimeout(700);
      await p.screenshot({ path: `docs/img/app-${style}-${s.name}.jpg`, type: 'jpeg', quality: s.view === 'phone' ? 68 : 74 });
      await ctx.close();
    }
    console.log(`  ${shots.length} screenshots`);
  }
}
writeFileSync(metricsPath, JSON.stringify({ generated: new Date().toISOString(), gpu: !process.env.SWIFTSHADER, viewport: 'perf: 390×844 @2x (portrait phone)', metrics }, null, 2) + '\n');
await browser.close();
