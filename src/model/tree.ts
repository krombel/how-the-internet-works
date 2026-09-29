// The scene tree: the root path scene; group nodes that expand into their own path scene; links that dive into a
// "look inside" scene; and, at every hop, the layers it reads that have a dive of their own ("router~ip"). A location
// in the tree is a path of steps (["internet", "home-cabinet"]). Each scene has a frame in root coordinates (children
// sit at DETAIL_SCALE around their anchor), to any depth.
import { DETAIL_SCALE, WORLD_SIZE, bezier, curveBounds, type Orient, type Pt, type Rect } from '../engine/geometry';
import { pathScene, type PathScene, type SLink, type SNode } from './layout';
import type { Hop, Link, Route } from './resolve';

/** A layer as one hop reads it: the link it arrives on, which way, and a flow (and packet kind) travelling that way. */
export interface LayerAt {
  layer: string;
  /** The hop's instance id. */
  hop: string;
  link: Link;
  dir: 'up' | 'down';
  flow: string;
  kind: string;
}
export interface SceneRef {
  path: string[];
  kind: 'path' | 'dive' | 'layer';
  /** Path scenes: the expanded group (null at the root). */
  group: string | null;
  /** Dives (of links and layers): the scene id. */
  dive: string | null;
  /** Link dives: the link it explains (as drawn in the parent). */
  link: SLink | null;
  /** Layer dives: the layer and the hop it is seen at. */
  at: LayerAt | null;
}
export interface Frame { x: number; y: number; s: number }
export interface Child { step: string; kind: 'dive' | 'expand' | 'layer' }

const ROOT_REF: SceneRef = { path: [], kind: 'path', group: null, dive: null, link: null, at: null };

/** The step of a layer dive: "<hop>~<layer>". */
export const layerStep = (hop: string, layer: string) => `${hop}~${layer}`;

/** The layers with a dive that arrive at a hop, bottom of the stack first. Each is seen in one direction: arriving
 *  upwards (client → server) if it does, else downwards; the scenes tell the round trip either way. */
export function layersAt(r: Route, hop: Hop): LayerAt[] {
  if (hop.index < 0) return [];
  const lower: LayerAt[] = [], upper: LayerAt[] = [], seen = new Set<string>();
  for (const [dir, link] of [['up', r.links[hop.index - 1]], ['down', r.links[hop.index]]] as const) {
    if (!link) continue;
    for (const f of r.activity.flows) {
      const p = f.packets.find((k) => k.dir === dir);
      if (!p) continue;
      for (const [list, ids] of [[lower, link.stack], [upper, f.stack]] as const)
        for (const layer of ids) {
          if (seen.has(layer) || !r.content.layers[layer]?.dive) continue;
          seen.add(layer);
          list.push({ layer, hop: hop.id, link, dir, flow: f.id, kind: p.kind });
        }
    }
  }
  return [...lower, ...upper];
}

interface Spot { at: LayerAt; node: SNode; i: number; n: number }
const spotMemo = new WeakMap<Route, Map<string, Map<string, Spot>>>();
/** The layer dives of a path scene, by step: one stack for every hop on the chain drawn in it. */
function spots(r: Route, group: string | null, o: Orient): Map<string, Spot> {
  let m = spotMemo.get(r);
  if (!m) spotMemo.set(r, (m = new Map()));
  const k = `${group ?? ''}|${o}`;
  let hit = m.get(k);
  if (!hit) {
    hit = new Map();
    for (const node of pathScene(r, group, o).nodes) {
      if (node.kind !== 'hop') continue;
      const list = layersAt(r, node.hop);
      list.forEach((at, i) => hit!.set(layerStep(node.id, at.layer), { at, node, i, n: list.length }));
    }
    m.set(k, hit);
  }
  return hit;
}

const childMemo = new WeakMap<Route, Map<string, Child[]>>();
/** Children of a scene, in route order (a hop's layer dives follow it, bottom of the stack first). */
export function childrenOf(r: Route, ref: SceneRef, o: Orient = 'landscape'): Child[] {
  if (ref.kind !== 'path') return [];
  let m = childMemo.get(r);
  if (!m) childMemo.set(r, (m = new Map()));
  const k = `${ref.group ?? ''}|${o}`;
  const hit = m.get(k);
  if (hit) return hit;
  const ps = pathScene(r, ref.group, o), layers = [...spots(r, ref.group, o)];
  const out: Child[] = [];
  for (const id of ps.stops) {
    const n = ps.nodes.find((x) => x.id === id);
    if (n?.kind === 'group') out.push({ step: id, kind: 'expand' });
    for (const [step, s] of layers) if (s.node === n) out.push({ step, kind: 'layer' });
    const l = ps.links.find((x) => x.id === id);
    if (l?.dive) out.push({ step: id, kind: 'dive' });
  }
  m.set(k, out);
  return out;
}

/** Resolve a path of steps; null if any step doesn't exist in this route. */
export function sceneRef(r: Route, path: string[], o: Orient = 'landscape'): SceneRef | null {
  let ref = ROOT_REF;
  for (const [i, step] of path.entries()) {
    const c = childrenOf(r, ref, o).find((k) => k.step === step);
    if (!c) return null;
    const next = path.slice(0, i + 1);
    if (c.kind === 'expand') ref = { path: next, kind: 'path', group: step, dive: null, link: null, at: null };
    else if (c.kind === 'layer') {
      const { at } = spots(r, ref.group, o).get(step)!;
      ref = { path: next, kind: 'layer', group: null, dive: r.content.layers[at.layer].dive!, link: null, at };
    } else {
      const link = pathScene(r, ref.group, o).links.find((l) => l.id === step)!;
      ref = { path: next, kind: 'dive', group: null, dive: link.dive, link, at: null };
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

/** Where a layer dive lives: the scene that draws its hop (a hop inside a group is only drawn when it's expanded). */
export function layerPath(r: Route, hop: string, layer: string): string[] | null {
  const step = layerStep(hop, layer), queue = [ROOT_REF];
  for (const ref of queue)
    for (const c of childrenOf(r, ref)) {
      if (c.step === step) return [...ref.path, step];
      if (c.kind === 'expand') queue.push({ ...ROOT_REF, path: [...ref.path, c.step], group: c.step });
    }
  return null;
}

/** Walking sideways: along a path scene's stops, between the link dives of the parent, or up and down the layers of
 *  one hop (+1 = the next stop / dive, or the layer above). `i` is where we are, `min` the lowest index allowed. */
export interface Sideways { kind: 'stop' | 'dive' | 'layer'; steps: string[]; i: number; min: number }
export function sideways(r: Route, path: string[], stop: string | null, o: Orient): Sideways {
  const ref = sceneRef(r, path, o)!;
  if (ref.kind === 'path') {
    const steps = pathScene(r, ref.group, o).stops;
    return { kind: 'stop', steps, i: stop ? steps.indexOf(stop) : -1, min: -1 };
  }
  const parent = sceneRef(r, parentPath(path), o)!;
  const kids = childrenOf(r, parent, o).filter((c) => c.kind === ref.kind);
  const steps = (ref.at ? kids.filter((c) => spots(r, parent.group, o).get(c.step)!.at.hop === ref.at!.hop) : kids).map((c) => c.step);
  return { kind: ref.kind === 'layer' ? 'layer' : 'dive', steps, i: steps.indexOf(path[path.length - 1]), min: 0 };
}

/** Where a child sits in its parent's coordinates. A hop's layer dives stack on it: lower layers below, upper above. */
function anchorOf(r: Route, parent: SceneRef, step: string, o: Orient): Pt {
  const spot = spots(r, parent.group, o).get(step);
  if (spot) {
    const n = spot.node, gap = WORLD_SIZE[o].h * DETAIL_SCALE * 1.15;
    return { x: n.x, y: n.y + n.size * 0.06 - (spot.i - (spot.n - 1) / 2) * gap };
  }
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
