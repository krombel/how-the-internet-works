// App evaluation: screenshots (desktop + portrait phone, and a few short-landscape phone) of the key places, dives,
// layer dives, languages and a caught packet (pause + step, the peek and its detail tree), bytes loaded, and frame
// timings (idle, zoom flights, a 3-level dive, sideways travel between dives, catching and stepping a packet, the place
// morph, opening a layer dive from the peek and stepping up the stack) at 1× and 6× CPU throttle.
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
const VIEWS = { desktop: { w: 1440, h: 900, dpr: 1 }, phone: { w: 390, h: 844, dpr: 2, touch: true }, short: { w: 844, h: 390, dpr: 2, touch: true } };
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
      // all the way down: the copper cable's signal, then the Wi‑Fi envelope at the access point
      r.flyToCopper = await sample(p, cdp, 1600, () => go({ path: ['ap-router'] }));
      await settle(p);
      r.copperIdle = await sample(p, cdp, 1500);
      await go({ path: ['ap~wifi'] }); await settle(p);
      r.frameIdle = await sample(p, cdp, 1500);
      await go({ path: [] }); await settle(p);
      // three levels down: overview → inside the internet → the access fibre (GPON)
      r.flyDeep = await sample(p, cdp, 2400, () => go({ path: ['internet', 'home-cabinet'] }));
      await settle(p);
      r.deepIdle = await sample(p, cdp, 1500);
      // sideways at dive level: zoom out, travel the path, zoom in. Two quick steps (access → metro → backbone fibre)
      // join into one glide; then the long-haul and metro fibre idle.
      r.travelInternet = await sample(p, cdp, 4200, async () => {
        await p.keyboard.press('ArrowRight'); await p.waitForTimeout(350); await p.keyboard.press('ArrowRight');
      });
      await settle(p);
      r.backboneIdle = await sample(p, cdp, 1500);
      await go({ path: ['internet', 'cabinet-backhaul'] }); await settle(p);
      r.metroIdle = await sample(p, cdp, 1500);
      // and on the overview: the Wi‑Fi dive to the copper dive, past the access point
      await go({ path: ['phone-ap'] }); await settle(p);
      r.travelRoot = await sample(p, cdp, 3000, () => p.keyboard.press('ArrowRight'));
      await settle(p);
      await go({ path: [] }); await settle(p);
      // catch a packet (traffic pauses), then step it two hops on
      r.catchStep = await sample(p, cdp, 2400, async () => {
        await p.evaluate(() => window.__app.catch('video'));
        for (const _ of [1, 2]) { await p.waitForTimeout(800); await p.evaluate(() => window.__app.step(1)); }
      });
      await p.keyboard.press('Escape');
      await settle(p);
      // the place morph: the house slides away, the street slides in
      r.morphToStreet = await sample(p, cdp, 1200, () => go({ places: ['street'] }));
      await settle(p);
      r.streetIdle = await sample(p, cdp, 1500);
      r.flyTo5G = await sample(p, cdp, 1600, () => go({ path: ['phone-cell-tower'] }));
      await settle(p);
      r.nrIdle = await sample(p, cdp, 1500);
      // a layer dive: tap IP in the peek (the envelope grows into the dive), idle there, step up the stack
      await go({ places: ['home'], path: [], stop: null }); await settle(p);
      await p.evaluate(() => window.__app.catch('video'));
      await p.waitForSelector('.peek');
      await p.waitForTimeout(600);
      r.openLayer = await sample(p, cdp, 1600, () => p.evaluate(() => window.__app.openLayer('ip')));
      await settle(p);
      r.layerIdle = await sample(p, cdp, 1500);
      r.layerStep = await sample(p, cdp, 1600, () => p.keyboard.press('ArrowUp'));
      await settle(p);
      r.layerStepIdle = await sample(p, cdp, 1500);
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await ctx.close();
    console.log(' ', JSON.stringify(m));
  }

  if (ONLY !== 'perf') {
    // 3. screenshots
    const shots = [];
    for (const view of ['desktop', 'phone']) {
      shots.push({ view, where: 'home/watch-video', name: `home-${view}` });
      shots.push({ view, where: 'street/watch-video', name: `street-${view}` });
      shots.push({ view, where: 'home/watch-video/phone-ap', name: `wifi-${view}` });
      shots.push({ view, where: 'street/watch-video/phone-cell-tower', name: `5g-${view}` });
      shots.push({ view, where: 'home/watch-video/internet', name: `internet-${view}` });
      shots.push({ view, where: 'street/watch-video/internet', name: `internet-street-${view}` });
      shots.push({ view, where: 'home/watch-video/internet/home-cabinet', name: `gpon-${view}` });
      // layer dives: one scene per layer, varied by where it's opened
      shots.push({ view, where: 'home/watch-video/router~ip', name: `ip-nat-${view}` });
      shots.push({ view, where: 'home/watch-video/internet/core~ip', name: `ip-router-${view}` });
      shots.push({ view, where: 'street/watch-video/internet/mobile-core~ip', name: `ip-cgnat-${view}` });
      shots.push({ view, where: 'home/watch-video/ap~ip', name: `ip-bridge-${view}` });
      shots.push({ view, where: 'home/watch-video/phone~tcp', name: `tcp-${view}` });
      shots.push({ view, where: 'home/watch-video/router~tcp', name: `tcp-sealed-${view}` });
      shots.push({ view, where: 'home/watch-video/phone~tls', name: `tls-${view}` });
      shots.push({ view, where: 'street/watch-video/cell-tower~gtp', name: `gtp-${view}` });
      // all the way down (issues #13, #18): the link envelopes and the signals under them
      shots.push({ view, where: 'home/watch-video/ap-router', name: `copper-${view}` });
      shots.push({ view, where: 'home/watch-video/internet/bng-core', name: `backbone-${view}` });
      shots.push({ view, where: 'home/watch-video/internet/cabinet-backhaul', name: `metro-${view}` });
      shots.push({ view, where: 'home/watch-video/ap~wifi', name: `wifi-frame-${view}` });
      shots.push({ view, where: 'home/watch-video/router~ethernet', name: `ethernet-me-${view}` });
      shots.push({ view, where: 'home/watch-video/internet/cabinet~ethernet', name: `ethernet-bridge-${view}` });
      shots.push({ view, where: 'home/watch-video/internet/backhaul~vlan', name: `vlan-${view}` });
      shots.push({ view, where: 'home/watch-video/internet/core~mpls', name: `mpls-${view}` });
      shots.push({ view, where: 'home/watch-video/router~gpon', name: `gpon-frame-${view}` });
      shots.push({ view, where: 'street/watch-video/phone~nr', name: `nr-frame-${view}` });
    }
    // short landscape (a phone on its side): the caption is a pill, the fibre stretches have compact layouts
    for (const [where, name] of [['home/watch-video', 'home'], ['home/watch-video/internet', 'internet'], ['home/watch-video/internet/home-cabinet', 'gpon'],
      ['home/watch-video/internet/cabinet-backhaul', 'metro'], ['home/watch-video/internet/bng-core', 'backbone']])
      shots.push({ view: 'short', where, name: `${name}-short` });
    shots.push({ view: 'desktop', where: 'home/watch-video/internet/bng-core', lang: 'da', q: '&level=nerd', name: 'backbone-nerd-da-desktop' });
    shots.push({ view: 'phone', where: 'home/watch-video/internet/home-cabinet', q: '&level=nerd', name: 'gpon-nerd-phone' });
    shots.push({ view: 'desktop', where: 'desk/watch-video', name: 'desk-desktop' });
    shots.push({ view: 'desktop', where: 'home/watch-video/router-internet', name: 'fibre-desktop' });
    shots.push({ view: 'desktop', where: 'home/watch-video', q: '&level=nerd', name: 'home-nerd-desktop' });
    shots.push({ view: 'phone', where: 'street/watch-video/internet', lang: 'da', q: '&level=nerd', name: 'internet-street-nerd-da-phone' });
    shots.push({ view: 'phone', where: 'home/watch-video/phone~tcp', lang: 'da', q: '&level=nerd', name: 'tcp-nerd-da-phone' });
    shots.push({ view: 'desktop', where: 'home/watch-video/ap-router', lang: 'da', q: '&level=nerd', name: 'copper-nerd-da-desktop' });
    shots.push({ view: 'phone', where: 'home/watch-video/internet/cabinet~gpon', lang: 'da', q: '&level=nerd', name: 'gpon-frame-nerd-da-phone' });
    shots.push({ view: 'desktop', where: 'street/watch-video/cell-tower~nr', q: '&level=nerd', name: 'nr-frame-nerd-desktop' });
    shots.push({ view: 'desktop', where: 'home/watch-video', catch: 'video', grow: 'ip', name: 'grow-desktop' });
    shots.push({ view: 'desktop', where: 'home/watch-video', catch: 'video', name: 'peek-desktop' });
    shots.push({ view: 'phone', where: 'street/watch-video', catch: 'video', name: 'peek-street-phone' });
    // the caught request one hop on from the home router, in nerd mode, and its detail tree
    shots.push({ view: 'desktop', where: 'home/watch-video', q: '&level=nerd', catch: 'request', steps: 1, name: 'peek-nerd-desktop' });
    shots.push({ view: 'phone', where: 'home/watch-video', q: '&level=nerd', lang: 'da', catch: 'request', detail: true, name: 'peek-tree-da-phone' });
    shots.push({ view: 'desktop', where: 'home/watch-video', picker: true, name: 'picker-desktop' });
    shots.push({ view: 'phone', where: 'home/watch-video', picker: true, name: 'picker-phone' });
    shots.push({ view: 'desktop', where: 'home/watch-video', morph: true, name: 'morph-desktop' });
    for (const s of shots) {
      const { ctx, p } = await open(s.view, url(style, s.lang ?? 'en', s.where, s.q ?? ''));
      await settle(p);
      // a fixed clock so packets sit in the same spots across runs
      await p.evaluate(() => window.__app.setClock(5.2));
      if (s.catch) {
        await p.evaluate((k) => window.__app.catch(k), s.catch);
        await p.waitForSelector('.peek');
        for (let i = 0; i < (s.steps ?? 0); i++) { await p.waitForTimeout(800); await p.evaluate(() => window.__app.step(1)); }
        if (s.detail) await p.click('.peek header .chip');
        await p.waitForTimeout(1500);
        if (s.grow) {
          // mid-flight into a layer dive: the peek's envelope on its way to becoming the dive's panel
          await p.evaluate((l) => window.__app.openLayer(l), s.grow);
          await p.waitForTimeout(330);
        }
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
