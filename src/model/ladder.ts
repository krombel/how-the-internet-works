// What lies below where you are, for the depth ladder in the chrome (issues #22, #14, #32). Built only on the scene
// tree, so it holds for scenes and kinds of child that don't exist yet: a path scene's doors further down, or the
// stack of envelopes on one link at a layer dive's hop, down to that link's signal.
import type { Orient } from '../engine/geometry';
import type { Hop, Link, Route } from './resolve';
import { opens } from './stack';
import { childrenOf, diveRuns, linkDivePath, linkOut, parentPath, sceneRef, sideways, upFrom, type LayerAt, type SceneRef } from './tree';

/** A rung of a stack: a layer dive (`layer`, `sealed` where its hop can't read it), or the signal (`layer` null). */
export interface Rung { path: string[]; layer: string | null; sealed: boolean }
/** Doors: the children of a path scene you can open (any kind but the layer dives, which are reached by address).
 *  Stack: the rungs top first, `here` the one you're on; `hop` the hop they're at (null above a signal); `link` the
 *  link whose envelopes they are. */
export type Below =
  | { kind: 'doors'; doors: { kind: string; path: string[] }[] }
  | { kind: 'stack'; hop: string | null; link: string; rungs: Rung[]; here: number };

/** The links at a hop: the one it arrives on going up, and the one it leaves on. */
const linksAt = (r: Route, hop: Hop) => [r.links[hop.index - 1], r.links[hop.index]].filter((l): l is Link => !!l && hop.index >= 0);

/** The link a layer dive's ladder stands on: one at its hop that carries the layer (a link envelope belongs to its
 *  link; IP is carried on both sides of a router). `via` (the link of the ladder you came from) wins where it can;
 *  else the layer's own link, or for an inner layer the one the packet leaves on (as in the peek). */
function linkFor(r: Route, at: LayerAt, via: string | null = null): Link {
  const hop = r.hops[at.hop], near = linksAt(r, hop), own = near.filter((l) => l.stack.includes(at.layer));
  const options = own.length ? own : near;
  return options.find((l) => l.id === via) ?? (own.length ? own.find((l) => l.id === at.link.id) ?? own[0] : linkOut(r, hop.index, at.dir) ?? at.link);
}

function rung(r: Route, path: string[], o: Orient): Rung {
  const at = sceneRef(r, path, o)!.at!;
  return { path, layer: at.layer, sealed: !opens(r, at.layer, r.hops[at.hop].role) };
}

/** The layer dives at the hop of layer dive `path` that ride on a link carrying `carried`, top first: the inner
 *  layers, and of the link layers at that hop only those in `carried` (not the other side's: no fibre envelope on
 *  the copper). */
function stackAt(r: Route, path: string[], carried: string[], o: Orient): Rung[] {
  const parent = parentPath(path), hop = r.hops[sceneRef(r, path, o)!.at!.hop], sides = linksAt(r, hop).flatMap((l) => l.stack);
  return sideways(r, path, null, o).steps.map((step) => rung(r, [...parent, step], o))
    .filter((g) => carried.includes(g.layer!) || !sides.includes(g.layer!)).reverse();
}

/** The links of the stretch (#34) a link dive stands for. */
const stretchOf = (r: Route, ref: SceneRef, o: Orient) =>
  diveRuns(r, sceneRef(r, parentPath(ref.path), o)!.group, o).byLink.get(ref.link!.id)!.links.map((l) => l.link);

/** What a signal carries all along it: its link's envelopes that every link of its stretch carries (the backbone
 *  stretch inside the internet is plain Ethernet: MPLS rides only its first link), each at the hop that reads it. */
export function carriedBy(r: Route, ref: SceneRef, o: Orient): { layer: string; path: string[] }[] {
  const run = stretchOf(r, ref, o);
  return upFrom(r, ref).filter((u) => run.every((l) => l.stack.includes(u.layer)));
}

export function belowOf(r: Route, path: string[], o: Orient, via: string | null = null): Below | null {
  const ref = sceneRef(r, path, o);
  if (!ref) return null;
  if (ref.kind === 'path') {
    const doors = childrenOf(r, ref, o).filter((c) => c.kind !== 'layer').map((c) => ({ kind: c.kind, path: [...path, c.step] }));
    return doors.length ? { kind: 'doors', doors } : null;
  }
  if (ref.kind === 'layer') {
    const link = linkFor(r, ref.at!, via), rungs = stackAt(r, path, link.stack, o), sig = linkDivePath(r, link, parentPath(path));
    if (sig) rungs.push({ path: sig, layer: null, sealed: false });
    return { kind: 'stack', hop: ref.at!.hop, link: link.id, rungs, here: rungs.findIndex((g) => g.path.join('/') === path.join('/')) };
  }
  // a signal: the envelopes carried all along it, then what they carry, at the hop where the first is read
  const up = carriedBy(r, ref, o), carried = up.map((u) => u.layer);
  if (!up.length) return null;
  const at = sceneRef(r, up[0].path, o)!.at!, near = linksAt(r, r.hops[at.hop]);
  // the link of the stretch at that hop with the fewest layers of its own, so climbing on keeps the same stack
  const extra = (l: Link) => l.stack.filter((x) => !carried.includes(x)).length;
  const run = stretchOf(r, ref, o), link = run.filter((l) => near.some((n) => n.id === l.id)).sort((a, b) => extra(a) - extra(b))[0] ?? ref.link!.link;
  const rungs = stackAt(r, up[0].path, carried, o);
  rungs.push({ path, layer: null, sealed: false });
  return { kind: 'stack', hop: null, link: link.id, rungs, here: rungs.length - 1 };
}
