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

/** A badge's footprint in scene units (centre and size), whether it shows its label, and which way the label's pill
 *  runs from the mark: on (`flip` false) or back (`flip`, so its label ends at the mark). */
export interface Badge { x: number; y: number; w: number; h: number; labelled: boolean; flip: boolean }
/** What a door's label keeps clear of (#137, labels win): the scene's text as placed (`placeTexts`: names, link names,
 *  signs, tags), and if it can, the devices' art; inside the world (`W`; anywhere, `null`). */
export interface Keep { texts: Rect[]; arts: Rect[]; W: { w: number; h: number } | null }

const area = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const boxOf = (b: Badge): Rect => ({ x: b.x - b.w / 2, y: b.y - b.h / 2, w: b.w, h: b.h });

/** What a labelled badge covers as drawn, bobbing 0.18·size up and down: pointed at (`hot`), it grows up to 1.12×
 *  round its mark (`mx`, and its height), in a glow 0.35·size round it (the theme contract: `HintProps.hot`). */
const drawn = (b: Badge, mx: number, size: number, hot: boolean): Rect => {
  const r = boxOf(b), k = hot ? 1.12 : 1, p = size * (hot ? 0.35 : 0.2);
  return { x: mx + (r.x - p - mx) * k, y: b.y + (r.y - p - b.y) * k, w: (r.w + 2 * p) * k, h: (r.h + 2 * p) * k };
};

/** Where each door's badge goes, roughly as themes draw it: a mark about 2.4·size across at its spot; labelled (every
 *  door while `lit`; the `hot` one) a pill that fits the label (`textW` measures it), centred on the spot for
 *  'expand', else running on from the mark. Labels win (#137): a pill covers no text of the scene (`keep`), no other
 *  door's mark and no other pill (lit, the 'expand' ones first, the rest in order). It runs on from its mark or back
 *  from it, at its spot or nudged up or down a pill at a time, up to two; of two ways that fit, the one off the devices'
 *  art. A lit door whose label fits nowhere shows its mark alone, its label waiting for a zoom or a point (the one
 *  pointed at shows it anyway, as clear as it can). Computed when the scene, the zoom or what is lit changes, never per
 *  frame at rest. */
export function layoutDoors(doors: Door[], size: number, lit: boolean, hot: string | null, textW: (d: Door) => number, keep: Keep = { texts: [], arts: [], W: null }): Badge[] {
  const h = size * 2.4, gap = size * 0.2;
  const boxes = doors.map((d): Badge => ({ x: d.at.x, y: d.at.y, w: h, h, labelled: false, flip: false }));
  const marks = boxes.map(boxOf), pills: Rect[] = [];
  const order = doors.map((_, i) => i).filter((i) => lit || hot === doors[i].id).sort((a, b) => +(doors[a].kind !== 'expand') - +(doors[b].kind !== 'expand'));
  const out = ({ x, y, w, h: rh }: Rect) => {
    const W = keep.W;
    return !W || (x >= 0 && y >= 0 && x + w <= W.w && y + rh <= W.h) ? 0 : w * rh - area({ x, y, w, h: rh }, { x: 0, y: 0, ...W });
  };
  for (const i of order) {
    const d = doors[i], w = textW(d) + size * 3.2;
    const at = (dy: number, flip: boolean): Badge =>
      ({ x: d.kind === 'expand' ? d.at.x : d.at.x + (flip ? -1 : 1) * (w - h) / 2, y: d.at.y + dy, w, h, labelled: true, flip });
    // how badly it covers what it must not (text, the other doors, the world's edge), and the art
    const cost = (b: Badge) => {
      const r = drawn(b, d.at.x, size, hot === d.id), hits = (rs: Rect[]) => rs.reduce((s, p) => s + area(r, p), 0);
      return { hard: hits(keep.texts) + hits(pills) + hits(marks.filter((_, j) => j !== i)) + out(boxOf(b)), soft: hits(keep.arts) };
    };
    let fit: { b: Badge; soft: number } | undefined, least: { b: Badge; hard: number } | undefined;
    for (const k of [0, 1, -1, 2, -2]) {
      const ways = (d.kind === 'expand' ? [false] : [false, true]).map((f) => { const b = at(k * (h + gap), f); return { b, ...cost(b) }; });
      fit = ways.filter((c) => c.hard === 0).sort((p, q) => p.soft - q.soft)[0];
      if (fit) break;
      for (const c of ways) if (!least || c.hard < least.hard) least = c;
    }
    const b = fit?.b ?? (hot === d.id ? least!.b : null);
    if (!b) continue;
    boxes[i] = b;
    pills.push(drawn(b, d.at.x, size, hot === d.id));
  }
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
