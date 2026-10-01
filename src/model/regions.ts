// Owner regions (issue #20): the internet is a network of networks. The hops of a path scene that one owner runs
// (a hop's `owner`) are drawn as one region, a rounded outline around them, so the reader sees where one network
// hands the parcel over to the next. Pure and content-id free.
import type { Pt } from '../engine/geometry';
import type { PathScene, SNode } from './layout';
import { within, type Route } from './resolve';
import { ownersOf } from './trip';

export interface Region {
  owner: string;
  /** Its colour slot: the owner's place along the route (the chain, then side branches), the same in every scene. */
  tone: number;
  /** Every hop in it is a side branch: off the way the packets go. */
  aside: boolean;
  /** Its outline, a closed path. */
  d: string;
  /** Where its sign goes: the layout's spot (the region reaches out to it), else centred on its top edge. */
  sign: Pt;
  /** The scene nodes inside it. */
  nodes: string[];
}

/** How far a region reaches round each of its devices, as a share of the device's size. */
export const REGION_PAD = 0.66;
const SIDES = 20;

/** The convex hull of a set of points, counter-clockwise (Andrew's monotone chain). */
export function hull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list: Pt[]) => {
    const h: Pt[] = [];
    for (const q of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop();
      h.push(q);
    }
    h.pop();
    return h;
  };
  return [...half(p), ...half([...p].reverse())];
}

/** A closed, rounded path through a polygon: each corner becomes a quadratic curve between its edges' midpoints. */
export function roundPath(poly: Pt[]): string {
  const n = poly.length, f = (v: number) => v.toFixed(1);
  const mid = (i: number) => { const a = poly[i % n], b = poly[(i + 1) % n]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  const m0 = mid(n - 1);
  let d = `M${f(m0.x)} ${f(m0.y)}`;
  for (let i = 0; i < n; i++) { const c = poly[i], m = mid(i); d += ` Q${f(c.x)} ${f(c.y)} ${f(m.x)} ${f(m.y)}`; }
  return `${d} Z`;
}

/** How far a region reaches round a sign the layout places (so the sign sits on its edge). */
const SIGN_PAD = 24;
const ring = (c: Pt, r: number): Pt[] =>
  Array.from({ length: SIDES }, (_, i) => ({ x: c.x + r * Math.cos((i / SIDES) * Math.PI * 2), y: c.y + r * Math.sin((i / SIDES) * Math.PI * 2) }));

const memo = new WeakMap<PathScene, Region[]>();
/** Whose a scene node is: a hop's owner; a group's, if one owner runs every hop in it (a data centre inside the
 *  internet). Entries and exits stand for something else and are never part of a region. */
function ownerOf(r: Route, n: SNode): string | undefined {
  if (n.kind === 'hop') return n.hop.owner;
  const all = n.kind === 'group' ? ownersOf(r, false, n.id) : [];
  return all.length === 1 && r.chain.every((h) => !within(r.hops, h, n.id) || h.owner) ? all[0] : undefined;
}

/** The owner regions of a path scene, in route order. */
export function regionsOf(r: Route, ps: PathScene): Region[] {
  const hit = memo.get(ps);
  if (hit) return hit;
  const order = ownersOf(r, true), by = new Map<string, SNode[]>();
  for (const n of ps.nodes) {
    const o = ownerOf(r, n);
    if (o) by.set(o, [...(by.get(o) ?? []), n]);
  }
  const out = [...by].map(([owner, ns]): Region => {
    const at = ps.signs[owner];
    const h = hull([...ns.flatMap((n) => ring(n, n.size * REGION_PAD)), ...(at ? ring(at, SIGN_PAD) : [])]);
    const xs = h.map((p) => p.x), top = Math.min(...h.map((p) => p.y));
    return {
      owner, tone: order.indexOf(owner), aside: ns.every((n) => n.kind === 'hop' && n.hop.index < 0), d: roundPath(h),
      sign: at ?? { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: top }, nodes: ns.map((n) => n.id),
    };
  }).sort((a, b) => a.tone - b.tone);
  memo.set(ps, out);
  return out;
}
