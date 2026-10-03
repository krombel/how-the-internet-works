// Semantic zoom over the scene tree: which scenes are visible (and how much) for a camera, which scene a gesture
// ended in, and where the camera goes for a location. Works at any depth: each level cross-fades into its children.
import { DETAIL_SCALE, union, type Orient, type Rect } from './geometry';
import { TRAVEL, areaCentre, fit, isPhone, isShort, progress, smoothstep, type Cam, type Viewport } from './camera';
import { childrenOf, fitRectLocal, frameOf, rectToRoot, sceneRef, stopRectLocal, type Frame, type SceneRef } from '../model/tree';
import { pathScene } from '../model/layout';
import type { Route } from '../model/resolve';

export const keyOf = (path: string[]) => path.join('/');

const frames = new WeakMap<Route, Map<string, { frame: Frame; ref: SceneRef; fit: Rect }>>();
/** A scene's frame, ref and fit rect in root coordinates (memoised per route + orientation). */
export function sceneInfo(r: Route, path: string[], o: Orient) {
  let m = frames.get(r);
  if (!m) frames.set(r, (m = new Map()));
  const k = `${o}|${keyOf(path)}`;
  let hit = m.get(k);
  if (!hit) {
    const ref = sceneRef(r, path, o)!, frame = frameOf(r, path, o);
    hit = { frame, ref, fit: rectToRoot(frame, fitRectLocal(ref, o)) };
    m.set(k, hit);
  }
  return hit;
}

/** On a short landscape screen (a phone on its side, issue #33) a dive's wide panel fits the height left between the
 *  top bar and the caption pill, and got only about half the width. It may run under their edges: its top `top` and
 *  bottom `bottom` (shares of its height) hold only its border and flap, and only the corners of the bar and the middle
 *  of the pill reach that far. It keeps `side` px clear of each side for the ◀ ▶ buttons. */
export const DIVE_RIM = { top: 0.08, bottom: 0.045, side: 80 };
function diveFit(r: Rect, vp: Viewport): Cam {
  const R = DIVE_RIM, ah = vp.h - vp.top - vp.bottom, inner = r.h * (1 - R.top - R.bottom);
  const k = Math.min((vp.w - 2 * R.side) / r.w, ah / inner);
  return { k, x: vp.w / 2 - (r.x + r.w / 2) * k, y: vp.top + (ah - inner * k) / 2 - (r.y + r.h * R.top) * k };
}

/** The camera for a scene, or a stop inside a path scene. */
export function camFor(r: Route, path: string[], stop: string | null, vp: Viewport, o: Orient): Cam {
  const s = sceneInfo(r, path, o);
  if (s.ref.kind !== 'path') return isShort(vp.w, vp.h) ? diveFit(s.fit, vp) : fit(s.fit, vp);
  if (stop) {
    const rect = stopRectLocal(pathScene(r, s.ref.group, o), stop);
    if (rect) return fit(rectToRoot(s.frame, rect), vp, 0.9);
  }
  return fit(s.fit, vp);
}

export const kLimits = (r: Route, path: string[], vp: Viewport, o: Orient) => ({
  min: fit(sceneInfo(r, [], o).fit, vp).k * 0.6,
  max: (fit(sceneInfo(r, path, o).fit, vp).k / DETAIL_SCALE) * 5,
});

/** Zoom progress u (0 = a parent's fit, 1 = its child's) over which a child fades in, and its parent fades out. */
const FADE_IN: [number, number] = [0.45, 0.8];
const HIDE: [number, number] = [0.6, 0.92];
/** A device dive's opacity over which the dives beside it fade out. */
const CROWD: [number, number] = [0.1, 0.4];

/** On a phone a stop's camera zooms in so far that the groups and dives round it would show through, faint (#90): a
 *  clutter the doors already announce. There a child's progress is squeezed, so it starts to fade in (`FADE_IN`) only
 *  past the deepest any stop of its scene takes the camera, and still lands at 1 on its own fit. It depends only on the
 *  camera, so going in and coming out look the same and nothing pops when `decide` changes path. Elsewhere `u` as is. */
const squeezes = new WeakMap<Route, Map<string, number>>();
function squeezed(u: number, r: Route, base: string[], step: string, vp: Viewport, o: Orient): number {
  if (!isPhone(vp.w, vp.h)) return u;
  let m = squeezes.get(r);
  if (!m) squeezes.set(r, (m = new Map()));
  const key = `${o}|${vp.w}|${vp.h}|${vp.top}|${vp.bottom}|${keyOf(base)}|${step}`;
  let from = m.get(key);
  if (from === undefined) {
    const s = sceneInfo(r, base, o), k0 = fit(s.fit, vp).k, f = sceneInfo(r, [...base, step], o).fit;
    from = FADE_IN[0];
    for (const stop of pathScene(r, s.ref.group, o).stops) {
      const p = progress(camFor(r, base, stop, vp, o), vp, k0, f);
      if (p.prox > 0) from = Math.max(from, Math.min(0.9, p.u + 0.02));
    }
    m.set(key, from);
  }
  return 1 - ((1 - u) * (1 - FADE_IN[0])) / (1 - from);
}

/** The zoom a sideways travel between children of `parent` glides at: progress `TRAVEL.u`, as deep into the parent as
 *  it goes before any child starts to show (`FADE_IN`). The child's fit sets the scale of u. */
export function travelK(r: Route, parent: string[], child: string[], vp: Viewport, o: Orient): number {
  const k0 = fit(sceneInfo(r, parent, o).fit, vp).k, kd = fit(sceneInfo(r, child, o).fit, vp).k;
  return k0 * (kd / k0) ** TRAVEL.u;
}

/** Where a scene on the way to `path` counts as "near": its own fit, widened to the deepest scene on the path (a hop's
 *  layer stack can reach past the edge of the scene that draws it). */
const nearRect = (r: Route, sub: string[], path: string[], o: Orient) =>
  union(sceneInfo(r, sub, o).fit, sceneInfo(r, path, o).fit);

/** Opacity of every scene worth drawing, keyed by path ("" = root). Each path in `paths` (the current location, and
 *  during a flight the one we came from) opens its chain of levels; siblings at each level fade in as you approach.
 *  Layer dives stack on their hop, so they only show when they are on a path (you get there from the peek panel), and
 *  while one is, its siblings stay hidden. */
export function mixes(cam: Cam, vp: Viewport, r: Route, paths: string[][], o: Orient): Map<string, number> {
  const out = new Map<string, number>();
  for (const path of paths) {
    const m = new Map<string, number>([['', 1]]);
    let reach = 1;
    for (let i = 0; i <= path.length; i++) {
      const base = path.slice(0, i), bk = keyOf(base), k0 = fit(sceneInfo(r, base, o).fit, vp).k;
      let hide = 0, next = 0;
      const kids = childrenOf(r, sceneInfo(r, base, o).ref, o);
      // into a layer dive, its neighbours (link dives beside the hop) stay hidden: they'd crowd its panel
      const intoLayer = kids.some((c) => c.kind === 'layer' && c.step === path[i]);
      for (const c of kids) {
        if ((c.kind === 'layer' || intoLayer) && c.step !== path[i]) continue;
        const cp = [...base, c.step];
        const { fit: f } = sceneInfo(r, cp, o);
        const { u: u0, prox } = progress(cam, vp, k0, f, c.step === path[i] ? nearRect(r, cp, path, o) : f);
        const u = squeezed(u0, r, base, c.step, vp, o), a = smoothstep(...FADE_IN, u) * prox;
        if (c.step === path[i]) next = a;
        m.set(keyOf(cp), a * reach);
        hide = Math.max(hide, smoothstep(...HIDE, u) * prox);
      }
      m.set(bk, (m.get(bk) ?? 0) * (1 - hide));
      reach *= next;
    }
    for (const [k, v] of m) out.set(k, Math.max(out.get(k) ?? 0, v));
  }
  // a device's dive sits between the dives of the links either side, so they crowd, as do two link dives whose panels
  // overlap (close links on a phone, #136): of such siblings, the one nearer the view centre fades the others out as it
  // shows (nor do we pay for drawing both). Same camera, same fade, on any path.
  const mid = areaCentre(vp), unit = Math.min(vp.w, vp.h) / 2;
  const off = (f: Rect) => Math.hypot((f.x + f.w / 2) * cam.k + cam.x - mid.x, (f.y + f.h / 2) * cam.k + cam.y - mid.y) / unit;
  const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  for (const base of new Set(paths.flatMap((p) => p.map((_, i) => keyOf(p.slice(0, i))).concat(keyOf(p))))) {
    const kids = childrenOf(r, sceneInfo(r, base ? base.split('/') : [], o).ref, o).filter((c) => c.kind === 'dive')
      .map((c) => { const path = [...(base ? base.split('/') : []), c.step], s = sceneInfo(r, path, o); return { key: keyOf(path), device: !!s.ref.node, fit: s.fit, d: off(s.fit) }; });
    const shown = new Map(kids.map((c) => [c, smoothstep(...CROWD, out.get(c.key) ?? 0)]));
    for (const c of kids) {
      const keep = kids.reduce((m, o) => (o === c || !(o.device || c.device || overlap(o.fit, c.fit)) ? m : m * (1 - shown.get(o)! * smoothstep(0.1, 0.5, c.d - o.d))), 1);
      if (keep < 1) for (const [k, v] of out) if (k === c.key || k.startsWith(`${c.key}/`)) out.set(k, v * keep);
    }
  }
  return out;
}

/** After a gesture: the scene the camera has semantically moved into (up and/or down the tree, but never into a layer
 *  dive), or null. */
export function decide(cam: Cam, vp: Viewport, r: Route, path: string[], o: Orient): string[] | null {
  let p = path;
  while (p.length) {
    const parent = p.slice(0, -1);
    const { u, prox } = progress(cam, vp, fit(sceneInfo(r, parent, o).fit, vp).k, sceneInfo(r, p, o).fit, nearRect(r, p, path, o));
    if (squeezed(u, r, parent, p[p.length - 1], vp, o) < 0.8 || prox < 0.25) p = parent;
    else break;
  }
  if (p.length === path.length) {
    // down into the child nearest the view centre (a device's dive sits close to the dives of the links either side)
    const mid = areaCentre(vp);
    for (let found = true; found; ) {
      found = false;
      const k0 = fit(sceneInfo(r, p, o).fit, vp).k;
      let best = Infinity, step = '';
      for (const c of childrenOf(r, sceneInfo(r, p, o).ref, o)) {
        if (c.kind === 'layer') continue;
        const f = sceneInfo(r, [...p, c.step], o).fit, { u, prox } = progress(cam, vp, k0, f);
        const d = Math.hypot((f.x + f.w / 2) * cam.k + cam.x - mid.x, (f.y + f.h / 2) * cam.k + cam.y - mid.y);
        if (squeezed(u, r, p, c.step, vp, o) > 0.55 && prox > 0.5 && d < best) { best = d; step = c.step; }
      }
      if (step) { p = [...p, step]; found = true; }
    }
  }
  return keyOf(p) === keyOf(path) ? null : p;
}
