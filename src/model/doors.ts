// Doors: the things a reader can open from a path scene, each with its own verb and mark. A link or device with a dive
// can be looked inside ('dive'), a group node opened up into its own path ('expand'), and at the root the start device
// changes where you are and what you do ('swap'). The scene art, the tap/hover targets, "What can I explore?" and the
// caption's door chips all read this one list, so a badge is always where its tap target is.
import type { Cam, Viewport } from '../engine/camera';
import { bezier, WORLD_SIZE, type Orient, type Pt, type Rect } from '../engine/geometry';
import { boxAt, keepIn, labelReach } from './labels';
import { labelY, startNode, type PathScene, type SLink, type SNode } from './layout';
import { nodeDive, toRoot, type DiveRun, type Frame } from './tree';

export type DoorKind = 'dive' | 'expand' | 'swap';
export interface Door {
  kind: DoorKind;
  /** The link or node it belongs to. For 'dive' and 'expand' this is also the child step it opens. */
  id: string;
  /** A link dive's links: one, or a stretch of them that is one dive (they glow together and each opens it). */
  links: string[];
  /** Where its badge sits, in scene coordinates. */
  at: Pt;
}

/** A door's label size in scene units: 22, or more so it never renders under 80 % of the theme's label minimum on
 *  screen (`sk` is screen px per scene unit). Badges and their tap targets scale with it. */
export const badgeSize = (labelMinPx: number, sk: number) => Math.max(22, (labelMinPx * 0.8) / sk);

/** A badge's footprint in scene units (centre and size), and whether it shows its label. */
export interface Badge { x: number; y: number; w: number; h: number; labelled: boolean }

/** Where each door's badge goes, roughly as themes draw it: a mark about 2.4·size across at its spot; labelled (every
 *  door while `lit`; the `hot` one) a pill that fits the label (`textW` measures it), centred on the spot for
 *  'expand', else starting at the mark. While lit, pills that would cover each other are nudged apart up or down
 *  ('expand' ones stay put, the rest give way in order). */
export function layoutDoors(doors: Door[], size: number, lit: boolean, hot: string | null, textW: (d: Door) => number): Badge[] {
  const h = size * 2.4;
  const boxes = doors.map((d): Badge => {
    if (!lit && hot !== d.id) return { x: d.at.x, y: d.at.y, w: h, h, labelled: false };
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

/** A scene's doors: the swap badge first (root only), then the dives and groups in route order. A stretch of links
 *  that is one dive (`runs`, by link: see `diveRuns`) has one badge, on its links clear of the devices between them, and
 *  a single link's badge is at its middle unless that is too near a device (`linkSpot`; `nameW` measures a device's
 *  name). A device's dive has its badge on the device's left corner away
 *  from its name (the start device's swap badge is on its top right). Items still fading in or out while switching place have none (a
 *  link only the other place has, isn't in `runs` either: it stands alone). */
export function doorsOf(ps: PathScene, root: boolean, runs: Map<string, DiveRun>, o: Orient, nameW: (n: SNode) => number): Door[] {
  const out: Door[] = [];
  const start = root ? startNode(ps) : undefined;
  if (start && start.alpha > 0.5) out.push({ kind: 'swap', id: start.id, links: [], at: { x: start.x + start.size * 0.36, y: start.y - start.size * 0.36 } });
  for (const id of ps.stops) {
    const n = ps.nodes.find((k) => k.id === id);
    if (n?.kind === 'group' && n.alpha > 0.5) out.push({ kind: 'expand', id, links: [], at: { x: n.x, y: n.y - n.size * 0.36 } });
    if (n && nodeDive(n) && n.alpha > 0.5) out.push({ kind: 'dive', id, links: [], at: { x: n.x - n.size * 0.36, y: n.y + n.size * (n.label === 'above' ? 0.36 : -0.36) } });
    const l = n ? null : ps.links.find((k) => k.id === id), run = runs.get(id);
    if (!l?.dive || l.alpha <= 0.5 || (run && run.step !== id)) continue;
    const many = run && run.links.length > 1;
    out.push({ kind: 'dive', id, links: many ? run.links.map((k) => k.id) : [id], at: many ? linkSpot(ps, run.links, run.at, o, nameW) : linkSpot(ps, [l], bezier(l, 0.5), o, nameW) });
  }
  return out;
}

/** How much bigger than authored names and badges get at most, at rest on a small screen: they never render under the
 *  theme's minimum (1.5–1.6× on a phone, 1.8× in short landscape). */
export const GROW: Record<Orient, number> = { portrait: 1.7, landscape: 1.9 };
/** How far a badge's mark reaches from its spot (its ring, and its bob up and down: about 1.3 × its size), at its
 *  biggest in orientation `o`, or at `sk` screen px per scene unit. */
export const badgeReach = (o: Orient, sk = 1 / GROW[o]) => 1.3 * badgeSize(28, sk);
/** The square a badge's mark keeps to at `size` (its ring and its bob, as `badgeReach`): what text keeps clear of. */
export const badgeBox = (at: Pt, size: number): Rect => ({ x: at.x - size * 1.3, y: at.y - size * 1.3, w: size * 2.6, h: size * 2.6 });

/** What a device covers at its biggest (or with its name `grow` times its authored size): its art, and its name
 *  (`nameW`: its width at the authored 28 units), which grows up from its baseline, pushed inside the world as
 *  `placeTexts` draws it. */
export function nodeBoxes(n: SNode, nameW: number, o: Orient, grow = GROW[o]): Rect[] {
  const f = 28 * grow, e = labelReach(nameW * grow, f, 'middle');
  return [{ x: n.x - n.size / 2, y: n.y - n.size / 2, w: n.size, h: n.size }, boxAt(keepIn({ x: n.x, y: labelY(n) }, e, WORLD_SIZE[o]), e)];
}

/** What a door is on, in scene units, with its name `grow` times its authored size: the device or group it opens (the
 *  internet's cloud and its name), or nothing for a link's door. A coach card pointing at the door keeps clear of it. */
export function doorCovers(d: Door, ps: PathScene, nameW: (n: SNode) => number, o: Orient, grow: number): Rect[] {
  const n = d.links.length ? undefined : ps.nodes.find((k) => k.id === d.id);
  return n ? nodeBoxes(n, nameW(n), o, grow) : [];
}

/** How far `p` is from the nearest of `boxes` (0 inside one). */
export const clearance = (p: Pt, boxes: Rect[]) =>
  Math.min(...boxes.map((b) => Math.hypot(Math.max(0, b.x - p.x, p.x - b.x - b.w), Math.max(0, b.y - p.y, p.y - b.y - b.h))));

/** Where a link's badge goes, or a stretch's: on one of its links, away from their ends, as near `at` (the link's
 *  midpoint; the stretch's middle, often the device between two links) as it can while clear of every device and its
 *  name by `badgeReach` and a gap, at any size; failing that, as clear as it can. A stretch's whole glow shows what it
 *  covers. */
function linkSpot(ps: PathScene, links: SLink[], at: Pt, o: Orient, nameW: (n: SNode) => number): Pt {
  const boxes = ps.nodes.flatMap((n) => nodeBoxes(n, nameW(n), o)), need = badgeReach(o) + 8;
  if (clearance(at, boxes) >= need) return at;
  let best = at, score = -Infinity;
  for (const l of links) for (let t = 0.2; t < 0.81; t += 0.05) {
    const p = bezier(l, t), c = clearance(p, boxes);
    const sc = c >= need ? 1e6 - Math.hypot(p.x - at.x, p.y - at.y) : c;
    if (sc > score) { score = sc; best = p; }
  }
  return best;
}

/** The doors whose badge is on screen (clear of the chrome insets by `margin` CSS px). */
export function doorsInView(doors: Door[], frame: Frame, cam: Cam, vp: Viewport, margin = 16): Door[] {
  return doors.filter((d) => {
    const p = toRoot(frame, d.at), x = p.x * cam.k + cam.x, y = p.y * cam.k + cam.y;
    return x >= margin && x <= vp.w - margin && y >= vp.top + margin && y <= vp.h - vp.bottom - margin;
  });
}
