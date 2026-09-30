// The scene tree: the root path scene; group nodes that expand into their own path scene; links that dive into a
// "look inside" scene; and, at every hop, the layers it reads that have a dive of their own ("router~ip"). A location
// in the tree is a path of steps (["internet", "home-cabinet"]). Each scene has a frame in root coordinates (children
// sit at DETAIL_SCALE around their anchor), to any depth.
import { DETAIL_SCALE, WORLD_SIZE, bezier, curveBounds, lerp, type Curve, type Orient, type Pt, type Rect } from '../engine/geometry';
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
  const ps = pathScene(r, ref.group, o), layers = [...spots(r, ref.group, o)], runs = diveRuns(r, ref.group, o).byLink;
  const out: Child[] = [];
  for (const id of ps.stops) {
    const n = ps.nodes.find((x) => x.id === id);
    if (n?.kind === 'group') out.push({ step: id, kind: 'expand' });
    for (const [step, s] of layers) if (s.node === n) out.push({ step, kind: 'layer' });
    if (runs.get(id)?.step === id) out.push({ step: id, kind: 'dive' });
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

/** Where a route link's dive lives: in the scene `near` if it draws the link (a layer dive's own scene), else the
 *  shallowest scene that does (the GPON fibre is drawn at the root and inside the internet). Null without a dive. */
export function linkDivePath(r: Route, link: Link, near: string[] = []): string[] | null {
  if (!link.dive) return null;
  const find = (ref: SceneRef | null) => {
    if (ref?.kind !== 'path') return null;
    const l = pathScene(r, ref.group, 'landscape').links.find((x) => x.link.id === link.id && x.dive);
    return l ? [...ref.path, diveRuns(r, ref.group, 'landscape').byLink.get(l.id)!.step] : null;
  };
  const hit = find(sceneRef(r, near));
  if (hit) return hit;
  const queue = [ROOT_REF];
  for (const ref of queue) {
    const p = find(ref);
    if (p) return p;
    for (const c of childrenOf(r, ref)) if (c.kind === 'expand') queue.push({ ...ROOT_REF, path: [...ref.path, c.step], group: c.step });
  }
  return null;
}

/** Down from an envelope to its signal: a layer dive of a link layer (one in its link's own stack, like Wi‑Fi or
 *  VLAN, not IP) leads to that link's dive. */
export function downFrom(r: Route, ref: SceneRef): string[] | null {
  if (ref.kind !== 'layer' || !ref.at!.link.stack.includes(ref.at!.layer)) return null;
  return linkDivePath(r, ref.at!.link, parentPath(ref.path));
}

/** Up from a signal to what it carries: a link dive leads to the dives of its link's own layers, at the end of the
 *  link drawn beside it (else the one that receives them on the way up: the Wi‑Fi radio → the access point's frame). */
export function upFrom(r: Route, ref: SceneRef): { layer: string; path: string[] }[] {
  if (ref.kind !== 'dive') return [];
  const link = ref.link!.link, here = parentPath(ref.path).join('/');
  return link.stack.flatMap((layer) => {
    const ends = [link.to, link.from].map((hop) => layerPath(r, hop, layer)).filter((p) => p !== null);
    const path = ends.find((p) => parentPath(p).join('/') === here) ?? ends[0];
    return path ? [{ layer, path }] : [];
  });
}

/** The link a caught packet's outer envelopes belong to at chain hop `hop`: the one it leaves on, or at the end of
 *  its path the one it arrived on. */
export function linkOut(r: Route, hop: number, dir: 'up' | 'down'): Link | null {
  const out = dir === 'up' ? r.links[hop] : r.links[hop - 1], came = dir === 'up' ? r.links[hop - 1] : r.links[hop];
  return out ?? came ?? null;
}

/** The path scene that draws chain hop `hop` (the current one if it does), e.g. to show a caught packet there. */
export function hopScenePath(r: Route, hop: number, o: Orient, current: string[]): string[] | null {
  const draws = (ref: SceneRef | null) => ref?.kind === 'path' && pathScene(r, ref.group, o).nodes.some((n) => n.kind === 'hop' && n.hop.index === hop);
  if (draws(sceneRef(r, current, o))) return current;
  const queue = [ROOT_REF];
  for (const ref of queue) {
    if (draws(ref)) return ref.path;
    for (const c of childrenOf(r, ref, o)) if (c.kind === 'expand') queue.push({ ...ROOT_REF, path: [...ref.path, c.step], group: c.step });
  }
  return null;
}

/** Walking sideways: along a path scene's stops, between the link dives of the parent (a stretch of same-technology
 *  links is one dive, see `diveRuns`), or up and down the layers of one hop (+1 = the next stop / dive, or the layer
 *  above). `min` is the lowest index allowed (-1 = no stop at all). */
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

/** A path scene's chain as one curve through its links and devices (start device → … → end device), so a camera can
 *  travel along it. `s` is arc length; each chain item (device or link) has the arc where it sits: a link at its
 *  midpoint, a device where the curve passes it; a link also has its technology (null: a device). */
export interface Chain { pts: Pt[]; cum: number[]; items: { id: string; s: number; tech: string | null }[] }
const chainMemo = new WeakMap<Route, Map<string, Chain>>();
export function chainOf(r: Route, group: string | null, o: Orient): Chain {
  let m = chainMemo.get(r);
  if (!m) chainMemo.set(r, (m = new Map()));
  const k = `${group ?? ''}|${o}`;
  const hit = m.get(k);
  if (hit) return hit;
  const ps = pathScene(r, group, o), links = ps.route.map((id) => ps.links.find((l) => l.id === id)!);
  const node = (id: string) => ps.nodes.find((n) => n.id === id)!;
  const ch: Chain = { pts: [], cum: [], items: [] };
  const add = (p: Pt) => {
    const q = ch.pts[ch.pts.length - 1];
    if (q && Math.hypot(p.x - q.x, p.y - q.y) < 1e-6) return;
    ch.cum.push(q ? ch.cum[ch.cum.length - 1] + Math.hypot(p.x - q.x, p.y - q.y) : 0);
    ch.pts.push(p);
  };
  const mark = (id: string, tech: string | null = null) => ch.items.push({ id, s: ch.cum[ch.cum.length - 1], tech });
  const curve = (c: Curve, n: number, from: number, to: number) => { for (let i = 0; i <= n; i++) add(bezier(c, lerp(from, to, i / n))); };
  if (links.length) { add(node(links[0].from)); mark(links[0].from); }
  links.forEach((l, i) => {
    curve(l, 8, 0, 0.5);
    mark(l.id, l.link.tech.id);
    curve(l, 8, 0.5, 1);
    const n = node(l.to), next = links[i + 1];
    // through the device: a curve from this link's end past its centre to the next link's start
    if (!next) { add(n); mark(n.id); return; }
    const via = { p0: l.p1, c: n, p1: next.p0 };
    curve(via, 4, 0, 0.5);
    mark(n.id);
    curve(via, 4, 0.5, 1);
  });
  m.set(k, ch);
  return ch;
}

/** A path scene's link dives. Consecutive links into the same scene with the same technology are one stretch, and one
 *  dive: three backbone links are one "backbone" dive, not three identical ones. `step` is its first link (the child
 *  step and the door), `links` all of them, `s` where it sits on the chain (the middle of the stretch; a single link
 *  at its midpoint) and `at` that point. */
export interface DiveRun { step: string; links: SLink[]; s: number; at: Pt }
const runMemo = new WeakMap<Route, Map<string, { runs: DiveRun[]; byLink: Map<string, DiveRun> }>>();
export function diveRuns(r: Route, group: string | null, o: Orient): { runs: DiveRun[]; byLink: Map<string, DiveRun> } {
  let m = runMemo.get(r);
  if (!m) runMemo.set(r, (m = new Map()));
  const k = `${group ?? ''}|${o}`;
  const hit = m.get(k);
  if (hit) return hit;
  const ps = pathScene(r, group, o), ch = chainOf(r, group, o), runs: DiveRun[] = [], byLink = new Map<string, DiveRun>();
  const arc = (id: string) => ch.items.find((x) => x.id === id)?.s ?? 0;
  let last = '';
  for (const id of ps.stops) {
    const l = ps.links.find((x) => x.id === id);
    if (!l) continue;
    const key = l.dive ? `${l.dive}|${l.link.tech.id}` : '';
    if (key && key === last) runs[runs.length - 1].links.push(l);
    else if (key) runs.push({ step: l.id, links: [l], s: 0, at: { x: 0, y: 0 } });
    last = key;
  }
  for (const run of runs) {
    const a = run.links[0], b = run.links[run.links.length - 1];
    run.s = (arc(a.id) + arc(b.id)) / 2;
    run.at = run.links.length > 1 ? chainAt(ch, run.s) : bezier(a, 0.5);
    for (const l of run.links) byLink.set(l.id, run);
  }
  const out = { runs, byLink };
  m.set(k, out);
  return out;
}

/** The point at arc length `s` along a chain (clamped to its ends). */
export function chainAt(ch: Chain, s: number): Pt {
  const { pts, cum } = ch, L = cum[cum.length - 1];
  if (s <= 0) return pts[0];
  if (s >= L) return pts[pts.length - 1];
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
  const f = (s - cum[lo]) / (cum[hi] - cum[lo] || 1);
  return { x: lerp(pts[lo].x, pts[hi].x, f), y: lerp(pts[lo].y, pts[hi].y, f) };
}

/** The arc length of the chain point nearest `p`: where a camera that stopped part-way along it is. */
export function chainNear(ch: Chain, p: Pt): number {
  let best = Infinity, s = 0;
  for (let i = 1; i < ch.pts.length; i++) {
    const a = ch.pts[i - 1], b = ch.pts[i], dx = b.x - a.x, dy = b.y - a.y;
    const f = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    const d = (a.x + f * dx - p.x) ** 2 + (a.y + f * dy - p.y) ** 2;
    if (d < best) { best = d; s = lerp(ch.cum[i - 1], ch.cum[i], f); }
  }
  return s;
}

/** Time along a glide from arc `a` to `b` that slows down past each device (to `slow` of its speed, within `r` arc
 *  units, easing in and out), where the medium changes, and moves on along the plain stretches of link. `at(u)`: the
 *  arc at glide time u (0–1); `rate0`: the speed at the start relative to the average (to carry on at a given speed). */
export function chainWarp(ch: Chain, a: number, b: number, slow: number, r: number): { at: (u: number) => number; rate0: number } {
  const devices = ch.items.filter((it) => it.tech === null).map((it) => it.s);
  const speed = (s: number) => {
    let w = 0;
    for (const d of devices) { const x = Math.abs(s - d) / r; if (x < 1) w = Math.max(w, (1 + Math.cos(Math.PI * x)) / 2); }
    return 1 - (1 - slow) * w;
  };
  if (a === b || r <= 0 || slow >= 1) return { at: (u) => lerp(a, b, u), rate0: 1 };
  const N = 96, T = [0];
  for (let i = 1; i <= N; i++) T.push(T[i - 1] + 1 / speed(lerp(a, b, (i - 0.5) / N)));
  const at = (u: number) => {
    const t = Math.min(1, Math.max(0, u)) * T[N];
    let lo = 0, hi = N;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T[mid] <= t) lo = mid; else hi = mid; }
    return lerp(a, b, (lo + (t - T[lo]) / (T[hi] - T[lo])) / N);
  };
  return { at, rate0: (speed(a) * T[N]) / N };
}

/** The chain item nearest arc length `s`: what a camera travelling the chain is passing. */
export function chainItemAt(ch: Chain, s: number): string {
  let best = ch.items[0];
  for (const it of ch.items) if (Math.abs(it.s - s) < Math.abs(best.s - s)) best = it;
  return best.id;
}

/** A sideways move that can travel along the path: between two children of one path scene that both sit on its chain
 *  (link dives now; device dives would too). The parent and where the target sits on its chain, else null. */
export function travelOf(r: Route, from: string[], to: string[], o: Orient): { parent: string[]; b: number } | null {
  if (!from.length || from.length !== to.length) return null;
  const parent = parentPath(from);
  if (parent.join('/') !== parentPath(to).join('/') || from[from.length - 1] === to[to.length - 1]) return null;
  const pr = sceneRef(r, parent, o), fr = sceneRef(r, from, o), tr = sceneRef(r, to, o);
  if (pr?.kind !== 'path' || fr?.kind !== 'dive' || tr?.kind !== 'dive') return null;
  const runs = diveRuns(r, pr.group, o).byLink, at = (step: string) => runs.get(step)?.s;
  const b = at(to[to.length - 1]);
  return at(from[from.length - 1]) === undefined || b === undefined ? null : { parent, b };
}

/** Where a child nested in a node sits (a group's own path scene): a little below its centre. */
export const nodeAnchor = (n: SNode): Pt => ({ x: n.x, y: n.y + n.size * 0.06 });

/** Where a child sits in its parent's coordinates. A hop's layer dives stack on it: lower layers below, upper above. */
function anchorOf(r: Route, parent: SceneRef, step: string, o: Orient): Pt {
  const spot = spots(r, parent.group, o).get(step);
  if (spot) {
    const a = nodeAnchor(spot.node), gap = WORLD_SIZE[o].h * DETAIL_SCALE * 1.15;
    return { x: a.x, y: a.y - (spot.i - (spot.n - 1) / 2) * gap };
  }
  const ps = pathScene(r, parent.group, o);
  const n = ps.nodes.find((k) => k.id === step);
  if (n) return nodeAnchor(n);
  return diveRuns(r, parent.group, o).byLink.get(step)!.at;
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
