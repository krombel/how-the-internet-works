// The clip (#185): one short story, recorded from the running build in English by day: the overview at home, a zoom
// into the internet, a caught parcel stepped on a hop, and back at the house, the time machine to 1995. Two cuts:
//   readme    1280 × 720, the app as it is: out/clip/readme.mp4 (H.264, uploaded as a GitHub attachment, which plays
//             inline in README.md) and docs/img/readme-clip.webp (a small looping fallback, committed)
//   linkedin  1080 × 1080, with short captions on one of the app's cards in place of its own caption, which is too
//             small to read on a phone: out/clip/linkedin.mp4, linkedin.srt (the same captions as subtitles) and
//             linkedin-cover.png (a still for the upload: the night overview with the title)
// out/ is not committed.
// Usage: npm run build && npx vite preview --host 127.0.0.1 --port 5318 &  node scripts/record-clip.mjs [baseUrl] [--only=readme|linkedin]
// Needs ffmpeg (with libx264) and img2webp (libwebp's tools; on a Mac: brew install ffmpeg webp). Takes the evaluate
// lock (scripts/lock.mjs): a recording made while another headless Chrome runs stutters.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lock } from './lock.mjs';

const args = process.argv.slice(2);
const BASE = args.find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:5318/';
const ONLY = args.find((a) => a.startsWith('--only='))?.split('=')[1];
const GPU = process.platform === 'linux' ? ['--use-gl=angle', '--use-angle=gl-egl'] : ['--use-angle=metal'];
// the square is drawn at 720 × 720 CSS px and 1.5 px per px: the app's wide layout, at a size a phone can read
const CUTS = {
  readme: { w: 1280, h: 720, dpr: 1, captions: false },
  linkedin: { w: 720, h: 720, dpr: 1.5, captions: true },
};
const FPS = 30;
const OUT = 'out/clip';

/** The cards' look for the captions and the cover's title: the theme's font, ink and card (`.card`). Without the app's
 *  caption the scene refits to the whole window, and the captions take its place at the bottom. */
const CARD_CSS = `
  .caption { display: none !important; }
  .clip-card { position: fixed; left: 50%; bottom: 26px; transform: translate(-50%, 12px); z-index: 50; max-width: calc(100% - 48px);
    padding: 10px 28px 12px; text-align: center; font-family: var(--ui-font); color: var(--ink); opacity: 0; pointer-events: none;
    transition: opacity .35s ease, transform .35s ease; }
  .clip-card.on { opacity: 1; transform: translate(-50%, 0); }
  .clip-card.left { left: 24px; transform: translate(0, 12px); }
  .clip-card.left.on { transform: none; }
  .clip-card b { display: block; font-size: 38px; line-height: 1.1; font-weight: 800; white-space: nowrap; }
  .clip-card span { display: block; margin-top: 6px; font-size: 20px; font-weight: 600; color: var(--muted); }`;

const run = (cmd, a) => execFileSync(cmd, a, { stdio: ['ignore', 'ignore', 'inherit'] });
const srtTime = (s) => new Date(Math.max(0, s) * 1000).toISOString().slice(11, 23).replace('.', ',');

await lock();
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: [...GPU, '--enable-gpu', '--ignore-gpu-blocklist'] });

async function page(cut, mode, hash) {
  const ctx = await browser.newContext({ viewport: { width: cut.w, height: cut.h }, deviceScaleFactor: cut.dpr, colorScheme: mode === 'night' ? 'dark' : 'light' });
  const p = await ctx.newPage();
  // a reader who has had the first-run tips
  await p.addInitScript(() => localStorage.setItem('coached', '2'));
  p.on('pageerror', (e) => console.log('  pageerror', e.message));
  await p.goto(`${BASE}?style=storybook${mode === 'night' ? '&mode=night' : ''}#/en/${hash}`);
  await p.waitForFunction(() => window.__app && !window.__app.busy(), null, { timeout: 15000 });
  await p.evaluate(() => document.fonts.ready);
  if (cut.captions) {
    await p.addStyleTag({ content: CARD_CSS });
    await p.evaluate(() => document.body.append(Object.assign(document.createElement('div'), { className: 'card clip-card' })));
  }
  // (the scene refits to the window when the caption goes)
  await p.waitForTimeout(1500);
  await p.waitForFunction(() => !window.__app.busy());
  return { ctx, p };
}

/** Record the story: frames from Chrome's screencast, with their times, and when each caption came up. */
async function record(name, cut) {
  const { ctx, p } = await page(cut, 'day', 'home/watch-video');
  const dir = mkdtempSync(join(tmpdir(), `hitw-clip-${name}-`));
  const frames = [], said = [];
  const cdp = await ctx.newCDPSession(p);
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = join(dir, `f${String(frames.length).padStart(5, '0')}.jpg`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, t: metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: cut.w * cut.dpr, maxHeight: cut.h * cut.dpr, everyNthFrame: 1 });
  const wait = (s) => p.waitForTimeout(s * 1000);
  // `left`: under the scene, clear of the peek panel on the right
  const say = async (title, line = '', left = false) => {
    said.push({ title, line, at: Date.now() / 1000 });
    if (!cut.captions) return;
    await p.evaluate(() => document.querySelector('.clip-card').classList.remove('on'));
    await wait(0.3);
    await p.evaluate(([t, l, side]) => {
      const c = document.querySelector('.clip-card');
      c.innerHTML = `<b></b>${l ? '<span></span>' : ''}`;
      c.querySelector('b').textContent = t;
      if (l) c.querySelector('span').textContent = l;
      c.classList.toggle('left', side);
      c.classList.add('on');
    }, [title, line, left]);
  };

  await wait(0.4);
  await say('How the internet works', 'Your video comes home as little parcels');
  await wait(2.6);
  await say('Zoom into the internet');
  await p.evaluate(() => window.__app.go({ path: ['internet'] }));
  await wait(3.2);
  await say('Catch a parcel', 'and see what each box reads', true);
  await p.evaluate(() => window.__app.catch('video'));
  await wait(2.4);
  await p.evaluate(() => window.__app.step(1));
  await wait(2.6);
  // back out to the house, and from there to the house of 1995 (a tap, as a reader would)
  await p.evaluate(() => window.__app.release());
  await p.evaluate(() => window.__app.go({ path: [] }));
  await wait(1.8);
  await say('Back to 1995', 'with the time machine');
  await p.click('.time-btn');
  await wait(1.2);
  await p.click('.picker.time .stop >> nth=0');
  await wait(1.1);
  await p.click('.picker.time .go');
  await wait(4.2);
  const end = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  await ctx.close();

  // each frame lasts until the next one came (Chrome sends one when the picture changes), then a steady 30 fps
  const t0 = frames[0].t;
  const list = ['ffconcat version 1.0'];
  frames.forEach((f, i) => list.push(`file '${f.file}'`, `duration ${((frames[i + 1]?.t ?? f.t + 1 / FPS) - f.t).toFixed(4)}`));
  list.push(`file '${frames.at(-1).file}'`);
  writeFileSync(join(dir, 'list.txt'), list.join('\n') + '\n');
  const W = cut.w * cut.dpr, H = cut.h * cut.dpr;
  const mp4 = `${OUT}/${name}.mp4`;
  // the JPEGs are full range: to the video range and BT.709, so players and LinkedIn take it as plain yuv420p
  run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'),
    '-vf', `fps=${FPS},scale=${W}:${H}:flags=lanczos:out_range=tv:out_color_matrix=bt709,setsar=1,format=yuv420p`,
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-movflags', '+faststart', '-an', mp4]);
  rmSync(dir, { recursive: true, force: true });
  console.log(`  ${mp4}: ${(end - t0).toFixed(1)} s, ${frames.length} frames (${(frames.length / (end - t0)).toFixed(0)} a second captured)`);
  return { mp4, said: said.map((s, i) => ({ ...s, from: s.at - t0, to: (said[i + 1]?.at ?? end) - t0 })) };
}

if (ONLY !== 'linkedin') {
  const { mp4 } = await record('readme', CUTS.readme);
  // the fallback: 800 px wide, 12 frames a second, lossy WebP that loops
  const dir = mkdtempSync(join(tmpdir(), 'hitw-clip-webp-'));
  run('ffmpeg', ['-loglevel', 'error', '-i', mp4, '-vf', 'fps=12,scale=800:-2:flags=lanczos', join(dir, 'w%04d.png')]);
  const pngs = readdirSync(dir).sort().map((f) => join(dir, f));
  run('img2webp', ['-loop', '0', '-lossy', '-q', '62', '-m', '6', '-d', String(Math.round(1000 / 12)), ...pngs, '-o', 'docs/img/readme-clip.webp']);
  rmSync(dir, { recursive: true, force: true });
  console.log('  docs/img/readme-clip.webp');
}

if (ONLY !== 'readme') {
  const cut = CUTS.linkedin;
  const { said } = await record('linkedin', cut);
  writeFileSync(`${OUT}/linkedin.srt`, said.map((s, i) => `${i + 1}\n${srtTime(s.from)} --> ${srtTime(s.to)}\n${s.title}${s.line ? `\n${s.line}` : ''}\n`).join('\n'));
  // the cover: the night overview, with the title on a card
  const { ctx, p } = await page(cut, 'night', 'home/watch-video');
  await p.evaluate(() => {
    const c = document.querySelector('.clip-card');
    c.innerHTML = '<b>How the internet works</b><span>Zoom in, catch a parcel, travel back to 1995</span>';
    c.classList.add('on');
  });
  await p.evaluate(() => window.__app.setClock(5.2, true));
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/linkedin-cover.png` });
  await ctx.close();
  console.log(`  ${OUT}/linkedin.srt, ${OUT}/linkedin-cover.png`);
}
await browser.close();
