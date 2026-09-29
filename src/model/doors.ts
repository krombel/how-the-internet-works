// Doors: the things a reader can open from a path scene, each with its own verb and mark. A link with a dive can be
// looked inside ('dive'), a group node opened up into its own path ('expand'), and at the root the start device
// changes where you are and what you do ('swap'). The scene art, the tap/hover targets, "What can I explore?" and the
// caption's door chips all read this one list, so a badge is always where its tap target is.
import type { Cam, Viewport } from '../engine/camera';
import { bezier, type Pt } from '../engine/geometry';
import { startNode, type PathScene } from './layout';
import { toRoot, type Frame } from './tree';

export type DoorKind = 'dive' | 'expand' | 'swap';
export interface Door {
  kind: DoorKind;
  /** The link or node it belongs to. For 'dive' and 'expand' this is also the child step it opens. */
  id: string;
  /** Where its badge sits, in scene coordinates. */
  at: Pt;
}

/** A door's label size in scene units: 22, or more so it never renders under 80 % of the theme's label minimum on
 *  screen (`sk` is screen px per scene unit). Badges and their tap targets scale with it. */
export const badgeSize = (labelMinPx: number, sk: number) => Math.max(22, (labelMinPx * 0.8) / sk);

/** A badge's footprint in scene units (centre and size), and whether it shows its label. */
export interface Badge { x: number; y: number; w: number; h: number; labelled: boolean }

/** Where each door's badge goes, roughly as themes draw it: a mark about 2.4·size across at its spot; labelled (an
 *  'expand' always; every door while `lit`; the `hot` one) a pill that fits the label (`textW` measures it), centred
 *  on the spot for 'expand', else starting at the mark. While lit, pills that would cover each other are nudged apart
 *  up or down ('expand' ones stay put, the rest give way in order). */
export function layoutDoors(doors: Door[], size: number, lit: boolean, hot: string | null, textW: (d: Door) => number): Badge[] {
  const h = size * 2.4;
  const boxes = doors.map((d): Badge => {
    if (d.kind !== 'expand' && !lit && hot !== d.id) return { x: d.at.x, y: d.at.y, w: h, h, labelled: false };
    const w = textW(d) + size * 3.2;
    return { x: d.kind === 'expand' ? d.at.x : d.at.x - h / 2 + w / 2, y: d.at.y, w, h, labelled: true };
  });
  if (!lit) return boxes;
  const order = doors.map((_, i) => i).sort((a, b) => +(doors[a].kind !== 'expand') - +(doors[b].kind !== 'expand'));
  const gap = size * 0.2;
  order.forEach((i, k) => {
    const a = boxes[i];
    for (let pass = 0; pass < k; pass++) {
      const b = order.slice(0, k).map((j) => boxes[j]).find((b) => Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h + gap * 2);
      if (!b) break;
      a.y = a.y >= b.y ? b.y + (a.h + b.h) / 2 + gap : b.y - (a.h + b.h) / 2 - gap;
    }
  });
  return boxes;
}

/** A scene's doors: the swap badge first (root only), then the dives and groups in route order. Items still fading
 *  in or out while switching place have none. */
export function doorsOf(ps: PathScene, root: boolean): Door[] {
  const out: Door[] = [];
  const start = root ? startNode(ps) : undefined;
  if (start && start.alpha > 0.5) out.push({ kind: 'swap', id: start.id, at: { x: start.x + start.size * 0.36, y: start.y - start.size * 0.36 } });
  for (const id of ps.stops) {
    const n = ps.nodes.find((k) => k.id === id);
    if (n?.kind === 'group' && n.alpha > 0.5) out.push({ kind: 'expand', id, at: { x: n.x, y: n.y - n.size * 0.36 } });
    const l = n ? null : ps.links.find((k) => k.id === id);
    if (l?.dive && l.alpha > 0.5) out.push({ kind: 'dive', id, at: bezier(l, 0.5) });
  }
  return out;
}

/** The doors whose badge is on screen (clear of the chrome insets by `margin` CSS px). */
export function doorsInView(doors: Door[], frame: Frame, cam: Cam, vp: Viewport, margin = 16): Door[] {
  return doors.filter((d) => {
    const p = toRoot(frame, d.at), x = p.x * cam.k + cam.x, y = p.y * cam.k + cam.y;
    return x >= margin && x <= vp.w - margin && y >= vp.top + margin && y <= vp.h - vp.bottom - margin;
  });
}
