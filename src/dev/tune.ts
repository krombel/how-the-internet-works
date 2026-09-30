// TEMPORARY dev-only tuner for the sideways travel timings (PR #37). Open the dev server with `?tune` before the `#`,
// e.g. http://localhost:5173/?tune#/en/home/watch-video/phone-ap, drag the sliders, then step with ← → or swipe.
// The URL keeps the values (`travel=…`) so a reload or a shared link replays them. Remove before merge.
import { TRAVEL } from '../engine/camera';

type Knob = { key: keyof typeof TRAVEL; label: string; min: number; max: number; step: number };
const KNOBS: Knob[] = [
  { key: 'outMs', label: 'out ms', min: 100, max: 1500, step: 10 },
  { key: 'inMs', label: 'in ms', min: 100, max: 1500, step: 10 },
  { key: 'perScreenMs', label: 'glide ms / screen', min: 60, max: 800, step: 10 },
  { key: 'minGlideMs', label: 'glide min ms', min: 0, max: 1500, step: 10 },
  { key: 'maxGlideMs', label: 'glide max ms', min: 100, max: 3000, step: 10 },
  { key: 'overlap', label: 'overlap', min: 0, max: 0.6, step: 0.05 },
  { key: 'u', label: 'altitude u (0.45 = panels start)', min: 0.1, max: 0.6, step: 0.01 },
];

const params = new URLSearchParams(location.search);
for (const pair of (params.get('travel') ?? '').split(',')) {
  const [k, v] = pair.split(':');
  if (k === 'ease' && (v === 'sine' || v === 'cubic')) TRAVEL.ease = v;
  else if (KNOBS.some((n) => n.key === k) && Number.isFinite(+v)) (TRAVEL as Record<string, unknown>)[k] = +v;
}

const code = () => Object.entries(TRAVEL).map(([k, v]) => `${k}:${v}`).join(',');
const save = () => {
  const p = new URLSearchParams(location.search);
  p.set('travel', code());
  const q = p.toString().replace(/%3A/g, ':').replace(/%2C/g, ',').replace(/tune=(&|$)/, 'tune$1');
  history.replaceState(history.state, '', `${location.pathname}?${q}${location.hash}`);
  out.textContent = code();
};

const panel = document.createElement('div');
panel.style.cssText =
  'position:fixed;left:8px;bottom:8px;z-index:9999;background:#fffd;border:1px solid #0003;border-radius:8px;padding:6px 8px;font:11px/1.3 system-ui;color:#222;width:220px';
const head = document.createElement('button');
head.textContent = 'Travel tuner ▾';
head.style.cssText = 'font:inherit;font-weight:600;border:0;background:none;padding:0;cursor:pointer;color:inherit';
const body = document.createElement('div');
head.onclick = () => {
  body.hidden = !body.hidden;
  head.textContent = `Travel tuner ${body.hidden ? '▸' : '▾'}`;
  head.blur();
};
panel.append(head, body);
if (innerWidth < 600) head.click();

for (const n of KNOBS) {
  const row = document.createElement('label');
  row.style.cssText = 'display:grid;grid-template-columns:1fr auto;gap:0 6px;margin-top:4px';
  const name = document.createElement('span'), val = document.createElement('b'), input = document.createElement('input');
  name.textContent = n.label;
  input.type = 'range';
  Object.assign(input, { min: n.min, max: n.max, step: n.step, value: TRAVEL[n.key] });
  input.style.cssText = 'grid-column:1/3;width:100%;margin:0';
  val.textContent = String(TRAVEL[n.key]);
  input.oninput = () => {
    (TRAVEL as Record<string, unknown>)[n.key] = +input.value;
    val.textContent = input.value;
    save();
  };
  // hand the arrow keys back to the app (they step sideways)
  input.onchange = () => input.blur();
  row.append(name, val, input);
  body.append(row);
}
const ease = document.createElement('select');
for (const e of ['sine', 'cubic']) ease.add(new Option(`zoom easing: ${e}`, e));
ease.value = TRAVEL.ease;
ease.style.cssText = 'font:inherit;margin-top:6px';
ease.onchange = () => {
  TRAVEL.ease = ease.value as 'sine' | 'cubic';
  save();
  ease.blur();
};
const out = document.createElement('code');
out.style.cssText = 'display:block;margin-top:6px;word-break:break-all;user-select:all;font-size:10px';
body.append(ease, out);
panel.addEventListener('keydown', (e) => e.stopPropagation());
panel.addEventListener('pointerdown', (e) => e.stopPropagation());
panel.addEventListener('wheel', (e) => e.stopPropagation());
document.body.append(panel);
save();
