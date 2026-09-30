// What lies below where you are, for the depth ladder in the chrome (issues #22, #14, #32). Built only on the scene
// tree, so it holds for scenes and kinds of child that don't exist yet: a path scene's doors further down, or the
// stack of envelopes at a layer dive (the layers of its hop, as ▲/▼ step them) down to the signal that carries them.
import type { Orient } from '../engine/geometry';
import type { Route } from './resolve';
import { opens } from './stack';
import { childrenOf, downFrom, linkDivePath, linkOut, parentPath, sceneRef, sideways, upFrom, type SceneRef } from './tree';

/** A rung of a stack: a layer dive (`layer`, `sealed` where its hop can't read it), or the signal (`layer` null). */
export interface Rung { path: string[]; layer: string | null; sealed: boolean }
/** Doors: the children of a path scene you can open (any kind but the layer dives, which are reached by address).
 *  Stack: the rungs top first, `here` the one you're on; `hop` the hop they're at (null above a signal). */
export type Below =
  | { kind: 'doors'; doors: { kind: string; path: string[] }[] }
  | { kind: 'stack'; hop: string | null; rungs: Rung[]; here: number };

/** The signal under a layer dive: its own link's for a link envelope (the caption's "How it travels"), else that of
 *  the link the packet leaves its hop on (as in the peek). Stepping ▼ from the lowest envelope goes there. */
export function signalUnder(r: Route, ref: SceneRef): string[] | null {
  if (ref.kind !== 'layer') return null;
  const at = ref.at!, out = linkOut(r, r.hops[at.hop].index, at.dir);
  return downFrom(r, ref) ?? (out && linkDivePath(r, out, parentPath(ref.path)));
}

function rung(r: Route, path: string[], o: Orient): Rung {
  const at = sceneRef(r, path, o)!.at!;
  return { path, layer: at.layer, sealed: !opens(r, at.layer, r.hops[at.hop].role) };
}
/** A layer dive of one of its own link's layers (an envelope, like Wi‑Fi), not one carried inside (like IP). */
const isLinkLayer = (r: Route, path: string[], o: Orient) => {
  const at = sceneRef(r, path, o)!.at!;
  return at.link.stack.includes(at.layer);
};

export function belowOf(r: Route, path: string[], o: Orient): Below | null {
  const ref = sceneRef(r, path, o);
  if (!ref) return null;
  if (ref.kind === 'path') {
    const doors = childrenOf(r, ref, o).filter((c) => c.kind !== 'layer').map((c) => ({ kind: c.kind, path: [...path, c.step] }));
    return doors.length ? { kind: 'doors', doors } : null;
  }
  if (ref.kind === 'layer') {
    const s = sideways(r, path, null, o), parent = parentPath(path);
    const rungs = s.steps.map((step) => rung(r, [...parent, step], o)).reverse(), sig = signalUnder(r, ref);
    if (sig) rungs.push({ path: sig, layer: null, sealed: false });
    return { kind: 'stack', hop: ref.at!.hop, rungs, here: s.steps.length - 1 - s.i };
  }
  // a signal: the envelopes it carries (`upFrom`), and what they carry at the hop that reads the first of them
  const up = upFrom(r, ref);
  if (!up.length) return null;
  const first = up[0].path, parent = parentPath(first);
  const inner = sideways(r, first, null, o).steps.map((step) => [...parent, step]).filter((p) => !isLinkLayer(r, p, o));
  const rungs = [...up.map((u) => u.path), ...inner].map((p) => rung(r, p, o)).reverse();
  rungs.push({ path, layer: null, sealed: false });
  return { kind: 'stack', hop: null, rungs, here: rungs.length - 1 };
}
