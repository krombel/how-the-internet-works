// The link preview and icons (#185): public/og-image.png (1200 × 630, the day overview at home with the title on a
// card, for og:image), and the PNGs drawn from public/favicon.svg: favicon-32.png (the fallback for browsers without
// SVG icons) and apple-touch-icon.png (180 × 180, full bleed: iOS rounds the corners itself).
// Usage: npm run build && npx vite preview --host 127.0.0.1 --port 5318 &  node scripts/link-preview.mjs [baseUrl]
// Takes the evaluate lock (scripts/lock.mjs) while its headless Chrome runs.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { lock } from './lock.mjs';

const BASE = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:5318/';
const GPU = process.platform === 'linux' ? ['--use-gl=angle', '--use-angle=gl-egl'] : ['--use-angle=metal'];

await lock();
const browser = await chromium.launch({ args: [...GPU, '--enable-gpu', '--ignore-gpu-blocklist'] });

/** In the page: a PNG (base64) scaled to w × h, smoothly (the shot is taken at 2× for clean edges). */
function downscale([png, w, h]) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const c = Object.assign(document.createElement('canvas'), { width: w, height: h }), g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, w, h);
      res(c.toDataURL('image/png').split(',')[1]);
    };
    img.src = `data:image/png;base64,${png}`;
  });
}

{
  // the picture without the app's controls (the caption gone, the scene fits the window), the title on one of its cards
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2, colorScheme: 'light' });
  const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('coached', '2'));
  await p.goto(`${BASE}?style=storybook#/en/home/watch-video`);
  await p.waitForFunction(() => window.__app && !window.__app.busy(), null, { timeout: 15000 });
  await p.addStyleTag({ content: `
    .chrome, .caption, .step, .skip { display: none !important; }
    .title-card { position: fixed; left: 50%; bottom: 44px; transform: translateX(-50%); padding: 14px 34px 16px; text-align: center;
      font-family: var(--ui-font); color: var(--ink); }
    .title-card b { display: block; font-size: 46px; line-height: 1; font-weight: 800; }
    .title-card span { display: block; margin-top: 8px; font-size: 21px; font-weight: 600; color: var(--muted); }` });
  await p.evaluate(() => {
    const d = Object.assign(document.createElement('div'), { className: 'card title-card' });
    d.innerHTML = '<b>How the internet works</b><span>Zoom in, catch a parcel, look inside, travel back to 1995</span>';
    document.body.append(d);
  });
  // the scene refits to the window without the caption; then a fixed clock, so the parcels sit in the same spots
  await p.waitForTimeout(1500);
  await p.waitForFunction(() => !window.__app.busy());
  await p.evaluate(() => window.__app.setClock(5.2, true));
  await p.waitForTimeout(300);
  const shot = (await p.screenshot()).toString('base64');
  writeFileSync('public/og-image.png', Buffer.from(await p.evaluate(downscale, [shot, 1200, 630]), 'base64'));
  await ctx.close();
}

{
  const svg = readFileSync('public/favicon.svg', 'utf8');
  // the touch icon fills its square (no rim, no transparent corners, which iOS would show black)
  const bleed = svg.replace(/<rect [^>]*\/>/, (r) => `<rect width="64" height="64" fill="${/fill="([^"]+)"/.exec(r)[1]}"/>`);
  const p = await browser.newPage();
  for (const [file, size, art] of [['favicon-32.png', 32, svg], ['apple-touch-icon.png', 180, bleed]]) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<style>body { margin: 0; } svg { display: block; width: ${size}px; height: ${size}px; }</style>${art}`);
    await p.screenshot({ path: `public/${file}`, omitBackground: true });
  }
}
await browser.close();
console.log('  public/og-image.png, favicon-32.png, apple-touch-icon.png');
