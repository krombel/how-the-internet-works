// App evaluation: screenshots (desktop + portrait phone, and a few short-landscape phone) of the key places, dives,
// layer dives, languages and a caught packet (pause + step, the peek and its detail tree), bytes loaded, and frame
// timings (idle, zoom flights, a 3-level dive, sideways travel between dives, catching and stepping a packet, the place
// morph, opening a layer dive from the peek and stepping up the stack) at 1× and 6× CPU throttle.
// Usage: npm run build && npx vite preview --host 127.0.0.1 --port 5318 &  npm run evaluate [-- baseUrl] [--only=shots|perf|a11y] [--style=id]
//   [--mode=night]       night mode (issue #43): shots as app-<style>-night-*.jpg, metrics under "<style>-night"
//   --only=a11y          accessibility (#53): axe-core (WCAG 2.2 A/AA + best practice) on the key states in every view,
//                        and keyboard journeys (Tab never lands on the page, on something hidden or without a visible
//                        ring; focus comes back after a door, a catch and the picker). Prints what fails, exits 1 if
//                        anything does; writes nothing.
//   [--diff=<otherUrl>]  pixel diff instead: every screenshot (lossless, the clock held still) from baseUrl against
//                        the same one from otherUrl (e.g. main, built and previewed on another port). Prints the changed
//                        pixels per shot and writes .tmp/diff/<name>.png (changes in red) for those that differ.
// Writes docs/img/app-<style>-*.jpg and merges into docs/app-metrics.json (other styles' entries are kept).
import { chromium } from 'playwright';
import { gzipSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const flag = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const BASE = args.find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:5318/';
const ONLY = flag('only');
const MODE = flag('mode') === 'night' ? 'night' : 'day';
const DIFF = flag('diff');
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
  const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr, hasTouch: !!v.touch, isMobile: !!v.touch, colorScheme: MODE === 'night' ? 'dark' : 'light' });
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
const url = (style, lang, where, q = '', base = BASE) => `${base}?style=${style}${MODE === 'night' ? '&mode=night' : ''}${q}#/${lang}/${where}`;

/** In the page: compare two PNGs (base64). Returns the pixels that differ at all, those that differ visibly, the
 *  largest difference (sum over RGB), and a diff image: `b` faded, changes in red. */
async function comparePng([a, b]) {
  const load = (d) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = `data:image/png;base64,${d}`; });
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  const c = document.createElement('canvas');
  c.width = ia.width; c.height = ia.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(ia, 0, 0);
  const da = g.getImageData(0, 0, c.width, c.height).data;
  g.drawImage(ib, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height), db = img.data;
  let n = 0, big = 0, max = 0;
  for (let i = 0; i < da.length; i += 4) {
    const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
    if (d) { n++; if (d > 24) big++; if (d > max) max = d; db[i] = 255; db[i + 1] = 0; db[i + 2] = 60; }
    else { const v = 205 + (db[i] + db[i + 1] + db[i + 2]) / 15; db[i] = db[i + 1] = db[i + 2] = v; }
  }
  if (!n) return { n, big, max, total: da.length / 4, png: null };
  g.putImageData(img, 0, 0);
  return { n, big, max, total: da.length / 4, png: c.toDataURL('image/png').split(',')[1] };
}

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

// ------------------------------------------------------------------ accessibility (--only=a11y)
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const A11Y_STATES = [
  { name: 'overview', where: 'home/watch-video', views: ['desktop', 'phone', 'short'] },
  { name: 'internet', where: 'home/watch-video/internet', views: ['desktop'] },
  { name: 'wifi', where: 'home/watch-video/phone-ap', views: ['desktop', 'phone', 'short'] },
  { name: 'router', where: 'home/watch-video/router', views: ['desktop'] },
  { name: 'ip', where: 'home/watch-video/router~ip', views: ['desktop', 'phone'] },
  { name: 'nerd-da', where: 'home/watch-video', lang: 'da', q: '&level=nerd', views: ['desktop'] },
  { name: 'caught', where: 'home/watch-video', catch: true, views: ['desktop', 'phone', 'short'] },
  { name: 'caught-detail', where: 'home/watch-video', q: '&level=nerd', catch: true, detail: true, views: ['desktop'] },
  { name: 'picker', where: 'home/watch-video', picker: true, views: ['desktop', 'phone'] },
  { name: 'ladder', where: 'home/watch-video', ladder: true, views: ['desktop', 'phone', 'short'] },
  { name: 'menu', where: 'home/watch-video/router', menu: true, views: ['desktop', 'phone', 'short'] },
  { name: 'about', where: 'home/watch-video', menu: true, about: true, views: ['desktop', 'phone'] },
];
/** In the page: why the focused element is wrong (on the page itself, hidden, inert, or without a visible ring), or
 *  null. */
function focusProblem() {
  const e = document.activeElement;
  if (!e || e === document.body) return 'focus on the page';
  const name = `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''} "${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30)}"`;
  if (e.closest('[inert]')) return `${name} is inert`;
  let o = 1;
  for (let a = e; a; a = a.parentElement) {
    const cs = getComputedStyle(a);
    if (cs.visibility === 'hidden' || cs.display === 'none') return `${name} is hidden`;
    o *= +cs.opacity;
  }
  const r = e.getBoundingClientRect();
  if (o < 0.2 || r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return `${name} can't be seen`;
  if (e.matches(':focus-visible')) {
    const cs = getComputedStyle(e);
    if (cs.outlineStyle === 'none' || parseFloat(cs.outlineWidth) < 2) return `${name} has no focus ring`;
  }
  return null;
}
async function a11y(style) {
  const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
  const fails = [];
  const fail = (where, what) => { fails.push(`${where}: ${what}`); console.log(`  ✗ ${where}: ${what}`); };
  const prep = async (s, view) => {
    const { ctx, p } = await open(view, url(style, s.lang ?? 'en', s.where, s.q ?? ''));
    await settle(p);
    if (s.catch) { await p.evaluate(() => window.__app.catch('video')); await p.waitForSelector('.peek'); await p.waitForTimeout(800); }
    if (s.detail) { await p.click('.peek header .chip'); await p.waitForTimeout(300); }
    if (s.picker) { await p.evaluate(() => window.__app.picker(true)); await p.waitForTimeout(500); }
    if (s.ladder) { await p.click('.crumbs .here'); await p.waitForTimeout(300); }
    if (s.menu) { await p.click('.more-btn'); await p.waitForSelector('.menu'); }
    if (s.about) { await p.click('.menu [role=menuitem]:last-child'); await p.waitForSelector('.about-box'); }
    return { ctx, p };
  };
  // 1. axe on every state
  for (const s of A11Y_STATES)
    for (const view of s.views) {
      const { ctx, p } = await prep(s, view);
      await p.addScriptTag({ content: axe });
      const r = await p.evaluate((tags) => window.axe.run(document, { runOnly: { type: 'tag', values: tags } }), AXE_TAGS);
      for (const v of r.violations)
        for (const n of v.nodes) fail(`${s.name} ${view}`, `${v.id} (${v.impact}) ${n.target.join(' ')}: ${n.failureSummary.split('\n').slice(1).join(' ').trim()}`);
      await ctx.close();
    }
  // 2. Tab once round each state: focus is always somewhere you can see, with a ring. Tab past the last stop goes to
  //    the browser's own controls, which the page sees as focus on <body>: that ends the round.
  for (const s of A11Y_STATES.filter((x) => x.name !== 'nerd-da')) {
    const { ctx, p } = await prep(s, 'desktop');
    for (let i = 1; i <= 60; i++) {
      await p.keyboard.press('Tab');
      const bad = await p.evaluate(focusProblem);
      if (bad === 'focus on the page') { if (i < 3) fail(`${s.name} Tab ${i}`, 'nothing to Tab to'); break; }
      if (bad) fail(`${s.name} Tab ${i}`, bad);
      if (i === 60) fail(s.name, 'Tab never gets round');
    }
    await ctx.close();
  }
  // 3. journeys: focus comes back after a door, a catch, letting go, and the picker
  const { ctx, p } = await open('desktop', url(style, 'en', 'home/watch-video'));
  await settle(p);
  const check = async (step) => { const bad = await p.evaluate(focusProblem); if (bad) fail(`journey: ${step}`, bad); };
  await p.focus('.caption .door-dive .door'); await p.keyboard.press('Enter'); await settle(p); await check('a door from the caption');
  await p.keyboard.press('Escape'); await settle(p);
  await p.focus('.caption .door-catch .door'); await p.keyboard.press('Enter'); await p.waitForSelector('.peek'); await p.waitForTimeout(300);
  if (!(await p.evaluate(() => document.activeElement?.id === 'peek-title'))) fail('journey: catch', 'focus is not on the peek panel');
  await p.keyboard.press('Tab'); await check('Tab in the peek panel');
  await p.keyboard.press('Escape'); await settle(p); await check('letting go');
  await p.focus('.more-btn'); await p.keyboard.press('Enter'); await p.waitForSelector('.menu');
  if (!(await p.evaluate(() => !!document.activeElement?.closest('.menu')))) fail('journey: ⋯', 'focus is not in the menu');
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  if (!(await p.evaluate(() => document.activeElement?.matches('.more-btn')))) fail('journey: ⋯', 'focus is not back on ⋯');
  await p.focus('.caption .foot > .chip'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  for (let i = 0; i < 12; i++) {
    await p.keyboard.press('Tab');
    const at = await p.evaluate(() => (document.activeElement === document.body ? 'browser' : document.activeElement?.closest('.picker') ? 'dialog' : 'page'));
    if (at === 'page') { fail('journey: picker', 'Tab reaches the page behind the dialog'); break; }
  }
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  if (!(await p.evaluate(() => document.activeElement?.matches('.caption .foot > .chip')))) fail('journey: picker', 'focus is not back on its button');
  await ctx.close();
  console.log(`  ${fails.length ? `${fails.length} accessibility problems` : 'no accessibility problems'}`);
  if (fails.length) process.exitCode = 1;
}

for (const style of STYLES) {
  console.log(style);
  if (ONLY === 'a11y') { await a11y(style); continue; }
  const key = MODE === 'night' ? `${style}-night` : style;
  const m = (metrics[key] = { ...(metrics[key] ?? {}) });

  if (ONLY !== 'shots' && !DIFF) {
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
      // a device dive (#9, #38): copper → inside the home router, its idle, and on to the fibre
      r.travelToRouter = await sample(p, cdp, 3000, () => p.keyboard.press('ArrowRight'));
      await settle(p);
      r.routerIdle = await sample(p, cdp, 1500);
      r.travelFromRouter = await sample(p, cdp, 3000, () => p.keyboard.press('ArrowRight'));
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
      // device dives (#9): inside the home router and the cell tower
      shots.push({ view, where: 'home/watch-video/router', name: `router-${view}` });
      shots.push({ view, where: 'street/watch-video/cell-tower', name: `tower-${view}` });
    }
    // short landscape (a phone on its side): the caption is a pill, the fibre stretches have compact layouts
    for (const [where, name] of [['home/watch-video', 'home'], ['home/watch-video/internet', 'internet'], ['home/watch-video/internet/home-cabinet', 'gpon'],
      ['home/watch-video/internet/cabinet-backhaul', 'metro'], ['home/watch-video/internet/bng-core', 'backbone'],
      ['home/watch-video/router', 'router'], ['street/watch-video/cell-tower', 'tower']])
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
    shots.push({ view: 'desktop', where: 'home/watch-video/router', lang: 'da', q: '&level=nerd', name: 'router-nerd-da-desktop' });
    shots.push({ view: 'phone', where: 'street/watch-video/cell-tower', lang: 'da', q: '&level=nerd', name: 'tower-nerd-da-phone' });
    shots.push({ view: 'desktop', where: 'home/watch-video', catch: 'video', grow: 'ip', name: 'grow-desktop' });
    shots.push({ view: 'desktop', where: 'home/watch-video', catch: 'video', name: 'peek-desktop' });
    shots.push({ view: 'phone', where: 'street/watch-video', catch: 'video', name: 'peek-street-phone' });
    // the caught request one hop on from the home router, in nerd mode, and its detail tree
    shots.push({ view: 'desktop', where: 'home/watch-video', q: '&level=nerd', catch: 'request', steps: 1, name: 'peek-nerd-desktop' });
    shots.push({ view: 'phone', where: 'home/watch-video', q: '&level=nerd', lang: 'da', catch: 'request', detail: true, name: 'peek-tree-da-phone' });
    shots.push({ view: 'desktop', where: 'home/watch-video', picker: true, name: 'picker-desktop' });
    shots.push({ view: 'phone', where: 'home/watch-video', picker: true, name: 'picker-phone' });
    shots.push({ view: 'desktop', where: 'home/watch-video', morph: true, name: 'morph-desktop' });
    const shoot = async (s, base = BASE) => {
      const { ctx, p } = await open(s.view, url(style, s.lang ?? 'en', s.where, s.q ?? '', base));
      await settle(p);
      // a fixed clock so packets sit in the same spots across runs (held still for a pixel diff)
      await p.evaluate((hold) => window.__app.setClock(5.2, hold), !!DIFF);
      if (s.catch) {
        await p.evaluate((k) => window.__app.catch(k), s.catch);
        await p.waitForSelector('.peek');
        for (let i = 0; i < (s.steps ?? 0); i++) { await p.waitForTimeout(800); await p.evaluate(() => window.__app.step(1)); }
        if (s.detail) await p.click('.peek header .chip');
        // (longer for a diff: the camera's tracking of the caught packet eases in exponentially)
        await p.waitForTimeout(DIFF ? 4000 : 1500);
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
      const shot = await p.screenshot(DIFF ? { type: 'png' }
        : { path: `docs/img/app-${style}${MODE === 'night' ? '-night' : ''}-${s.name}.jpg`, type: 'jpeg', quality: s.view === 'phone' ? 68 : 74 });
      await ctx.close();
      return shot;
    };
    if (!DIFF) {
      for (const s of shots) await shoot(s);
    } else {
      mkdirSync('.tmp/diff', { recursive: true });
      const cmp = await browser.newPage();
      let same = 0;
      for (const s of shots) {
        // mid-transition frames depend on wall-clock timing, so they can't be compared pixel for pixel
        if (s.morph || s.grow) continue;
        const [a, b] = await Promise.all([shoot(s), shoot(s, DIFF)]);
        const r = await cmp.evaluate(comparePng, [a.toString('base64'), b.toString('base64')]);
        if (!r.n) { same++; continue; }
        writeFileSync(`.tmp/diff/${MODE === 'night' ? 'night-' : ''}${s.name}.png`, Buffer.from(r.png, 'base64'));
        console.log(`  ${s.name}: ${r.n} px differ (${((r.n / r.total) * 100).toFixed(3)} %), ${r.big} by more than 24/765, max ${r.max}`);
      }
      await cmp.close();
      console.log(`  ${same} of ${shots.filter((s) => !s.morph && !s.grow).length} shots identical`);
      continue;
    }
    console.log(`  ${shots.length} screenshots`);
  }
}
if (!DIFF && ONLY !== 'a11y') writeFileSync(metricsPath, JSON.stringify({ generated: new Date().toISOString(), gpu: !process.env.SWIFTSHADER, viewport: 'perf: 390×844 @2x (portrait phone)', metrics }, null, 2) + '\n');
await browser.close();
