// Path scenes: what a route looks like at one level (the root, or inside an expanded group node). Positions come from
// the layouts in the activity, segments and places (most specific wins); nodes nobody placed are auto-placed along the
// path, and links are auto-routed between their nodes.
import { WORLD_SIZE, curveBetween, lerp, type Curve, type Orient, type Pt } from '../engine/geometry';
import type { NodeDef, Placement, SceneLayout } from '../define';
import type { WithId } from './registry';
import type { Hop, Link, Route, Source } from './resolve';

const ROOT = 'overview';

export interface SNode {
  id: string;
  node: WithId<NodeDef>;
  /** The hop it stands for (for a group: the group; for an entry: the hop before the group). */
  hop: Hop;
  /** hop = a real hop; group = a network node that expands; entry/exit = where you came from / go on to. */
  kind: 'hop' | 'group' | 'entry' | 'exit';
  x: number; y: number; size: number;
  label: 'above' | 'below';
  source: Source;
  /** 0–1 while morphing between two routes. */
  alpha: number;
}

export interface SLink extends Curve {
  /** "<from>-<to>" as seen in this scene. */
  id: string;
  from: string; to: string;
  /** The underlying chain link (for a collapsed group, the link that enters or leaves it). */
  link: Link;
  dashed: boolean;
  dive: string | null;
  bend: number;
  label: [number, number, ('start' | 'middle' | 'end')?];
  alpha: number;
}

export interface PathScene {
  /** Layout key: "overview" or the group id. */
  key: string;
  group: string | null;
  nodes: SNode[];
  links: SLink[];
  /** Scene link ids along the chain, in order: the packets' route. */
  route: string[];
  /** Sideways stops, in order. */
  stops: string[];
  /** Where owner regions put their signs, if the layout says (keyed by owner id). */
  signs: Record<string, Pt>;
}

/** The baseline of a device's name (28 px text, centred on it), above or below its art. */
export const labelY = (n: SNode) => (n.label === 'above' ? n.y - n.size / 2 - 4 : n.y + n.size / 2 + 30);
/** The device you start from (it carries the "where are you / what are you doing" badge). */
export const startNode = (ps: PathScene) => ps.nodes.find((n) => n.kind === 'hop' && n.hop.slot !== null && n.hop.index === 0);

/** Merge the layouts for one path scene: activity, then segments, then places (most specific last). */
function mergedLayout(r: Route, key: string, o: Orient): Required<SceneLayout> {
  const out: Required<SceneLayout> = { nodes: {}, links: {}, owners: {} };
  const add = (l?: SceneLayout) => { Object.assign(out.nodes, l?.nodes); Object.assign(out.links, l?.links); Object.assign(out.owners, l?.owners); };
  add(r.activity.layout?.[key]?.[o]);
  for (const s of r.sources.filter((x) => x.id.startsWith('segment.'))) add(s.def.layout?.[key]?.[o]);
  for (const s of r.sources.filter((x) => x.id.startsWith('place.'))) add(s.def.layout?.[key]?.[o]);
  return out;
}

/** Fill in unplaced nodes: evenly between placed neighbours (zig-zagging), or continuing the path at the ends. */
function autoPlace(ids: string[], placed: Record<string, Placement>, o: Orient, size = 170): Record<string, Placement> {
  const W = WORLD_SIZE[o];
  const out: Record<string, Placement> = {};
  const known = ids.map((id) => placed[id]);
  if (!known.some(Boolean)) {
    // nothing placed at all: spread along the diagonal of the world
    ids.forEach((id, i) => {
      const f = ids.length > 1 ? i / (ids.length - 1) : 0.5, z = i % 2 ? 1 : -1;
      out[id] = o === 'landscape' ? [150 + f * (W.w - 300), W.h / 2 + z * 110, size] : [W.w / 2 + z * 200, W.h - 200 - f * (W.h - 400), size];
    });
    return out;
  }
  const step = o === 'landscape' ? { x: 220, y: 0 } : { x: 0, y: -220 };
  ids.forEach((id, i) => {
    if (known[i]) { out[id] = known[i]!; return; }
    let a = i - 1; while (a >= 0 && !known[a]) a--;
    let b = i + 1; while (b < ids.length && !known[b]) b++;
    const z = i % 2 ? 1 : -1;
    const perp = o === 'landscape' ? { x: 0, y: 90 * z } : { x: 170 * z, y: 0 };
    if (a >= 0 && b < ids.length) {
      const f = (i - a) / (b - a), A = known[a]!, B = known[b]!;
      out[id] = [lerp(A[0], B[0], f) + perp.x, lerp(A[1], B[1], f) + perp.y, size];
    } else {
      const n = a >= 0 ? known[a]! : known[b]!, k = a >= 0 ? i - a : i - b;
      out[id] = [n[0] + step.x * k + perp.x, n[1] + step.y * k + perp.y, size];
    }
  });
  return out;
}

const memo = new WeakMap<Route, Map<string, PathScene>>();

/** The path scene for the root (group = null) or an expanded group. */
export function pathScene(r: Route, group: string | null, o: Orient): PathScene {
  const mk = `${group ?? ''}|${o}`;
  let cache = memo.get(r);
  if (!cache) memo.set(r, (cache = new Map()));
  const hit = cache.get(mk);
  if (hit) return hit;
  const key = group ?? ROOT;
  const L = mergedLayout(r, key, o);

  // 1. the visible sequence along the chain, with the chain link that joins each pair
  type Item = { id: string; node: WithId<NodeDef>; hop: Hop; kind: SNode['kind']; source: Source };
  const seq: Item[] = [];
  const joins: Link[] = [];
  const push = (it: Item, via: Link | null) => {
    if (seq.length && seq[seq.length - 1].id === it.id) return;
    if (via && seq.length) joins.push(via);
    seq.push(it);
  };
  const groupHop = (g: string) => r.groups.find((x) => x.id === g);
  r.chain.forEach((h, i) => {
    const via = i > 0 ? r.links[i - 1] : null;
    if (group === null) {
      const g = h.group ? groupHop(h.group) : null;
      push(g ? { id: g.id, node: g.node, hop: g, kind: 'group', source: g.source } : { id: h.id, node: h.node, hop: h, kind: 'hop', source: h.source }, via);
    } else if (h.group === group) {
      if (!seq.length && i > 0) {
        const e = r.entry[group];
        seq.push({ id: e.id, node: e.node, hop: e.hop, kind: 'entry', source: e.hop.source });
      }
      push({ id: h.id, node: h.node, hop: h, kind: 'hop', source: h.source }, via);
    } else if (seq.length && seq[seq.length - 1].kind !== 'exit' && r.chain[i - 1]?.group === group) {
      push({ id: h.id, node: h.node, hop: h, kind: 'exit', source: h.source }, via);
    }
  });

  // 2. side branches off visible hops
  const asides = r.asides.filter((a) => a.hop.group === group && seq.some((s) => s.id === a.link.from));

  // 3. placement
  const pos = autoPlace(seq.map((s) => s.id), L.nodes, o, group === null ? 200 : 160);
  for (const a of asides) {
    const f = pos[a.link.from];
    pos[a.hop.id] = L.nodes[a.hop.id] ?? (o === 'landscape' ? [f[0], f[1] - 300, f[2] * 0.85, 'above'] : [f[0] - 220, f[1] - 200, f[2] * 0.85]);
  }
  const mkNode = (it: Item): SNode => {
    const p = pos[it.id];
    return { ...it, x: p[0], y: p[1], size: p[2], label: p[3] ?? 'below', alpha: 1 };
  };
  const nodes = [...seq.map(mkNode), ...asides.map((a) => mkNode({ id: a.hop.id, node: a.hop.node, hop: a.hop, kind: 'hop', source: a.hop.source }))];
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // 4. links
  const mkLink = (from: string, to: string, link: Link, i: number, dashed: boolean): SLink => {
    const id = `${from}-${to}`, spec = L.links[id] ?? {};
    const bend = spec.bend ?? (i % 2 ? -0.1 : 0.1);
    const [p0, c, p1] = spec.curve?.map(([x, y]) => ({ x, y })) ?? [];
    return {
      id, from, to, link, dashed, dive: link.dive, bend, label: spec.label ?? [0, 50], alpha: 1,
      ...(p0 ? { p0, c, p1 } : curveBetween(byId.get(from)!, byId.get(to)!, bend)),
    };
  };
  const chainLinks = joins.map((l, i) => mkLink(seq[i].id, seq[i + 1].id, l, i, false));
  const links = [...chainLinks, ...asides.map((a, i) => mkLink(a.link.from, a.hop.id, a.link, chainLinks.length + i, true))];

  // 5. stops: at the root every node and link; inside a group the hops and the links you can look inside
  const stops: string[] = [];
  seq.forEach((s, i) => {
    if (i > 0) { const l = chainLinks[i - 1]; if (group === null || l.dive) stops.push(l.id); }
    if (group === null || s.kind === 'hop') stops.push(s.id);
    for (const a of asides) if (a.link.from === s.id) stops.push(a.hop.id);
  });

  const signs = Object.fromEntries(Object.entries(L.owners).map(([k, [x, y]]) => [k, { x, y }]));
  const scene: PathScene = { key, group, nodes, links, route: chainLinks.map((l) => l.id), stops, signs };
  cache.set(mk, scene);
  return scene;
}

/** In-between of two path scenes while switching place: shared nodes glide, the rest fade; links follow their nodes. */
export function morphScene(a: PathScene, b: PathScene, t: number): PathScene {
  const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  const fadeOut = 1 - Math.min(1, t * 2), fadeIn = Math.max(0, t * 2 - 1);
  const aN = new Map(a.nodes.map((n) => [n.id, n])), bN = new Map(b.nodes.map((n) => [n.id, n]));
  const nodes: SNode[] = [];
  for (const n of a.nodes) {
    const m = bN.get(n.id);
    if (m) nodes.push({ ...m, x: lerp(n.x, m.x, e), y: lerp(n.y, m.y, e), size: lerp(n.size, m.size, e) });
    else nodes.push({ ...n, alpha: fadeOut, size: n.size * (1 - 0.3 * e) });
  }
  for (const m of b.nodes) if (!aN.has(m.id)) nodes.push({ ...m, alpha: fadeIn, size: m.size * (0.7 + 0.3 * e) });
  const now = new Map(nodes.map((n) => [n.id, n]));
  // a link keeps its shape and is carried along by its two ends
  const carry = (l: SLink, from: Map<string, SNode>, alpha: number): SLink => {
    const d = (id: string) => { const p = from.get(id), q = now.get(id); return p && q ? { x: q.x - p.x, y: q.y - p.y } : { x: 0, y: 0 }; };
    const d0 = d(l.from), d1 = d(l.to);
    return {
      ...l, alpha,
      p0: { x: l.p0.x + d0.x, y: l.p0.y + d0.y },
      c: { x: l.c.x + (d0.x + d1.x) / 2, y: l.c.y + (d0.y + d1.y) / 2 },
      p1: { x: l.p1.x + d1.x, y: l.p1.y + d1.y },
    };
  };
  const mix = (p: Pt, q: Pt): Pt => ({ x: lerp(p.x, q.x, e), y: lerp(p.y, q.y, e) });
  const bL = new Map(b.links.map((l) => [l.id, l])), aL = new Map(a.links.map((l) => [l.id, l]));
  const links: SLink[] = [];
  for (const l of a.links) {
    const m = bL.get(l.id);
    links.push(m ? { ...m, p0: mix(l.p0, m.p0), c: mix(l.c, m.c), p1: mix(l.p1, m.p1) } : carry(l, aN, fadeOut));
  }
  for (const m of b.links) if (!aL.has(m.id)) links.push(carry(m, bN, fadeIn));
  return { ...b, nodes, links };
}
