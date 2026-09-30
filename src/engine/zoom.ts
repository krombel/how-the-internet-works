// Semantic zoom over the scene tree: which scenes are visible (and how much) for a camera, which scene a gesture
// ended in, and where the camera goes for a location. Works at any depth: each level cross-fades into its children.
import { DETAIL_SCALE, type Orient, type Rect } from './geometry';
import { fit, progress, smoothstep, type Cam, type Viewport } from './camera';
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

/** The camera for a scene, or a stop inside a path scene. */
export function camFor(r: Route, path: string[], stop: string | null, vp: Viewport, o: Orient): Cam {
  const s = sceneInfo(r, path, o);
  if (stop && s.ref.kind === 'path') {
    const rect = stopRectLocal(pathScene(r, s.ref.group, o), stop);
    if (rect) return fit(rectToRoot(s.frame, rect), vp, 0.9);
  }
  return fit(s.fit, vp);
}

export const kLimits = (r: Route, path: string[], vp: Viewport, o: Orient) => ({
  min: fit(sceneInfo(r, [], o).fit, vp).k * 0.6,
  max: (fit(sceneInfo(r, path, o).fit, vp).k / DETAIL_SCALE) * 5,
});

const union = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

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
        const { u, prox } = progress(cam, vp, k0, f, c.step === path[i] ? nearRect(r, cp, path, o) : f);
        const a = smoothstep(0.45, 0.8, u) * prox;
        if (c.step === path[i]) next = a;
        m.set(keyOf(cp), a * reach);
        hide = Math.max(hide, smoothstep(0.6, 0.92, u) * prox);
      }
      m.set(bk, (m.get(bk) ?? 0) * (1 - hide));
      reach *= next;
    }
    for (const [k, v] of m) out.set(k, Math.max(out.get(k) ?? 0, v));
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
    if (u < 0.8 || prox < 0.25) p = parent;
    else break;
  }
  if (p.length === path.length) {
    for (let found = true; found; ) {
      found = false;
      const k0 = fit(sceneInfo(r, p, o).fit, vp).k;
      for (const c of childrenOf(r, sceneInfo(r, p, o).ref, o)) {
        if (c.kind === 'layer') continue;
        const { u, prox } = progress(cam, vp, k0, sceneInfo(r, [...p, c.step], o).fit);
        if (u > 0.55 && prox > 0.5) { p = [...p, c.step]; found = true; break; }
      }
    }
  }
  return keyOf(p) === keyOf(path) ? null : p;
}
