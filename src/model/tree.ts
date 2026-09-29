// The scene tree: the root path scene; group nodes that expand into their own path scene; links that dive into a
// "look inside" scene. A location in the tree is a path of steps (["internet", "home-cabinet"]). Each scene has a frame
// in root coordinates (children sit at DETAIL_SCALE around their anchor), to any depth.
import { DETAIL_SCALE, WORLD_SIZE, bezier, curveBounds, type Orient, type Pt, type Rect } from '../engine/geometry';
import { pathScene, type PathScene, type SLink } from './layout';
import type { Route } from './resolve';

export interface SceneRef {
  path: string[];
  kind: 'path' | 'dive';
  /** Path scenes: the expanded group (null at the root). */
  group: string | null;
  /** Dives: the scene id and the link it explains (as drawn in the parent). */
  dive: string | null;
  link: SLink | null;
}
export interface Frame { x: number; y: number; s: number }
export interface Child { step: string; kind: 'dive' | 'expand' }

const ROOT_REF: SceneRef = { path: [], kind: 'path', group: null, dive: null, link: null };

/** Children of a scene, in route order. */
export function childrenOf(r: Route, ref: SceneRef, o: Orient = 'landscape'): Child[] {
  if (ref.kind !== 'path') return [];
  const ps = pathScene(r, ref.group, o);
  const out: Child[] = [];
  for (const id of ps.stops) {
    const n = ps.nodes.find((k) => k.id === id);
    if (n?.kind === 'group') out.push({ step: id, kind: 'expand' });
    const l = ps.links.find((k) => k.id === id);
    if (l?.dive) out.push({ step: id, kind: 'dive' });
  }
  return out;
}

/** Resolve a path of steps; null if any step doesn't exist in this route. */
export function sceneRef(r: Route, path: string[], o: Orient = 'landscape'): SceneRef | null {
  let ref = ROOT_REF;
  for (const [i, step] of path.entries()) {
    const c = childrenOf(r, ref, o).find((k) => k.step === step);
    if (!c) return null;
    const next = path.slice(0, i + 1);
    if (c.kind === 'expand') ref = { path: next, kind: 'path', group: step, dive: null, link: null };
    else {
      const link = pathScene(r, ref.group, o).links.find((l) => l.id === step)!;
      ref = { path: next, kind: 'dive', group: null, dive: link.dive, link };
    }
  }
  return ref;
}

/** The longest valid prefix of a path (a stale deep link falls back as far as it has to, not all the way home). */
export function validPrefix(r: Route, path: string[]): string[] {
  for (let n = path.length; n > 0; n--) if (sceneRef(r, path.slice(0, n))) return path.slice(0, n);
  return [];
}

export const parentPath = (path: string[]) => path.slice(0, -1);

/** Where a child sits in its parent's coordinates. */
function anchorOf(r: Route, parent: SceneRef, step: string, o: Orient): Pt {
  const ps = pathScene(r, parent.group, o);
  const n = ps.nodes.find((k) => k.id === step);
  if (n) return { x: n.x, y: n.y + n.size * 0.06 };
  return bezier(ps.links.find((k) => k.id === step)!, 0.5);
}

/** A scene's frame in root coordinates: local point p → root point (x + p.x·s, y + p.y·s). */
export function frameOf(r: Route, path: string[], o: Orient): Frame {
  const W = WORLD_SIZE[o];
  let f: Frame = { x: 0, y: 0, s: 1 };
  let ref = ROOT_REF;
  for (let i = 0; i < path.length; i++) {
    const a = anchorOf(r, ref, path[i], o);
    f = { x: f.x + (a.x - (W.w * DETAIL_SCALE) / 2) * f.s, y: f.y + (a.y - (W.h * DETAIL_SCALE) / 2) * f.s, s: f.s * DETAIL_SCALE };
    ref = sceneRef(r, path.slice(0, i + 1), o)!;
  }
  return f;
}

export const toRoot = (f: Frame, p: Pt): Pt => ({ x: f.x + p.x * f.s, y: f.y + p.y * f.s });
export const toLocal = (f: Frame, p: Pt): Pt => ({ x: (p.x - f.x) / f.s, y: (p.y - f.y) / f.s });
export const rectToRoot = (f: Frame, r: Rect): Rect => ({ x: f.x + r.x * f.s, y: f.y + r.y * f.s, w: r.w * f.s, h: r.h * f.s });

/** What the camera frames for a whole scene (local coords). Portrait path scenes trim a little empty sky and ground. */
export function fitRectLocal(ref: SceneRef, o: Orient): Rect {
  const W = WORLD_SIZE[o];
  if (o === 'landscape' || ref.kind !== 'path') return { x: 0, y: 0, ...W };
  const t = W.h * (130 / 1600), b = W.h * (110 / 1600);
  return { x: 0, y: t, w: W.w, h: W.h - t - b };
}

/** The camera rect for a stop in a path scene (local coords). */
export function stopRectLocal(ps: PathScene, id: string): Rect | null {
  const n = ps.nodes.find((k) => k.id === id);
  if (n) {
    const s = n.size * 2;
    return { x: n.x - s / 2, y: n.y - s / 2 + n.size * (n.label === 'above' ? -0.12 : 0.14), w: s, h: s };
  }
  const l = ps.links.find((k) => k.id === id);
  return l ? curveBounds(l, 120) : null;
}
