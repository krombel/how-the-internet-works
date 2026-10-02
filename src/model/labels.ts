// Where a path scene's text goes (#90): device names, link names, owner signs and nerd tags stay inside their world,
// a rim in from its edge (a nested scene's panel draws its frame over the outer 24 or so; the root's is the screen).
// Labels grow as the camera zooms out (they never render under the theme's labelMinPx), so a spot that fits at the
// authored size can run off the panel on a small screen: a tag then tries its other spots (beside the name, the
// other side, under the name) before it is pushed in; names and signs are pushed in.
import type { Pt, Rect } from '../engine/geometry';
import { bezier } from '../engine/geometry';
import { labelY, type SLink, type SNode } from './layout';

export type Anchor = 'start' | 'middle' | 'end';
/** How far a box reaches from its anchor point: left, right, up, down. */
export interface Reach { l: number; r: number; t: number; b: number }
export interface Spot extends Pt { anchor: Anchor }

/** How far in from the world's edge text keeps. */
export const RIM = 30;

/** Drawn sizes in scene units (already clamped to readable): device names, link names, tags and owner signs. */
export interface Sizes { name: number; link: number; tag: number; sign: number }
/** A text's width per unit of font size, in the label or the tag font. */
export type Per = (text: string, font: 'label' | 'tag') => number;
export interface World { w: number; h: number }

const lead = (w: number, a: Anchor) => (a === 'start' ? 0 : a === 'middle' ? w / 2 : w);
/** A label (a baseline, its halo): about 0.8 of the size above it, 0.3 below. */
export const labelReach = (w: number, px: number, a: Anchor): Reach => ({ l: lead(w, a) + px * 0.12, r: w - lead(w, a) + px * 0.12, t: px * 0.85, b: px * 0.3 });
/** A tag (centred on y): its box, and the string hanging off its left. The engine's contract with the theme's Tag. */
export const tagReach = (w: number, px: number, a: Anchor): Reach => ({ l: lead(w, a) + px * 1.75, r: w - lead(w, a) + px * 0.68, t: px * 1.08, b: px * 0.58 });
/** An owner sign (centred on its spot): the pill and the colour dot on its left. The contract with the theme's Region. */
export const signReach = (w: number, px: number): Reach => ({ l: w / 2 + px * 1.5, r: w / 2 + px * 0.6, t: px * 0.84, b: px * 0.84 });

/** Whether a box reaching `e` around `p` lies inside the world. */
export const fits = (p: Pt, e: Reach, W: World, rim = RIM) =>
  p.x - e.l >= rim - 0.01 && p.x + e.r <= W.w - rim + 0.01 && p.y - e.t >= rim - 0.01 && p.y + e.b <= W.h - rim + 0.01;

/** `p` moved the least so its box is inside the world (centred on an axis it is too big for). */
export function keepIn(p: Pt, e: Reach, W: World, rim = RIM): Pt {
  const axis = (v: number, lo: number, hi: number, max: number) =>
    lo + hi > max - 2 * rim ? (max + lo - hi) / 2 : Math.min(max - rim - hi, Math.max(rim + lo, v));
  return { x: axis(p.x, e.l, e.r, W.w), y: axis(p.y, e.t, e.b, W.h) };
}

/** The box a reach puts around `p`. */
export const boxAt = (p: Pt, e: Reach): Rect => ({ x: p.x - e.l, y: p.y - e.t, w: e.l + e.r, h: e.t + e.b });
const hits = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** The first spot whose box fits and is clear of what is `taken`; else the first that fits; else the first, pushed in. */
function choose(spots: Spot[], reach: (a: Anchor) => Reach, W: World, taken: Rect[], own?: Rect): Spot {
  const inside = spots.filter((s) => fits(s, reach(s.anchor), W));
  const ok = inside.find((s) => !taken.some((t) => t !== own && hits(boxAt(s, reach(s.anchor)), t))) ?? inside[0];
  return ok ?? { ...keepIn(spots[0], reach(spots[0].anchor), W), anchor: spots[0].anchor };
}

export interface Texts {
  nodes: { n: SNode; name: string; tag: string }[];
  /** Drawn at the root only. */
  links: { l: SLink; name: string; tag: string }[];
  signs: { at: Pt; name: string }[];
  /** What else a tag keeps clear of: the door badges. */
  badges: Rect[];
}
export interface Placed { name: Spot; tag: Spot | null }

/** Where a path scene's text goes: the signs and names pushed inside the world, then each tag at its first spot that
 *  fits and covers nothing (names, signs, devices, badges, the tags placed before it). */
export function placeTexts(t: Texts, s: Sizes, per: Per, W: World, portrait: boolean) {
  const signs = t.signs.map((g) => {
    const e = signReach(per(g.name, 'label') * s.sign, s.sign);
    return { at: keepIn(g.at, e, W), e };
  });
  const names = t.nodes.map(({ n, name }) => {
    const w = per(name, 'label') * s.name, e = labelReach(w, s.name, 'middle');
    return { at: { ...keepIn({ x: n.x, y: labelY(n) }, e, W), anchor: 'middle' as Anchor }, e, w };
  });
  const linkNames = t.links.map(({ l, name }) => {
    const m = bezier(l, 0.5), [dx, dy, a = 'middle'] = l.label, e = labelReach(per(name, 'label') * s.link, s.link, a);
    return { m, at: { ...keepIn({ x: m.x + dx, y: m.y + dy }, e, W), anchor: a }, e };
  });
  const arts = t.nodes.map(({ n }): Rect => ({ x: n.x - n.size / 2, y: n.y - n.size / 2, w: n.size, h: n.size }));
  const taken: Rect[] = [...signs.map((g) => boxAt(g.at, g.e)), ...names.map((k) => boxAt(k.at, k.e)), ...linkNames.map((k) => boxAt(k.at, k.e)), ...arts, ...t.badges];
  // a device's tag may hang its string over the device's own art
  const tagged = (tag: string, spots: () => Spot[], own?: Rect): Spot | null => {
    if (!tag) return null;
    const tw = per(tag, 'tag') * s.tag, reach = (a: Anchor) => tagReach(tw, s.tag, a), at = choose(spots(), reach, W, taken, own);
    taken.push(boxAt(at, reach(at.anchor)));
    return at;
  };
  const nodes = t.nodes.map(({ n, tag }, i): Placed => {
    const { at, w: nw } = names[i];
    return { name: at, tag: tagged(tag, () => nodeSpots(n, at, nw, s, W, portrait), arts[i]) };
  });
  const links = t.links.map(({ l, tag }, i): Placed => {
    const { m, at } = linkNames[i];
    return { name: at, tag: tagged(tag, () => linkSpots(l, m, at, s, portrait)) };
  });
  return { nodes, links, signs: signs.map((g) => g.at) };
}

/** Where a device's tag may go, best first. */
function nodeSpots(n: SNode, at: Spot, nw: number, s: Sizes, W: World, portrait: boolean): Spot[] {
  // beside the name, on its line; over the art (under it when the name is over it)
  const mid = at.y - s.name * 0.3, gap = s.name * 0.3, half = n.size / 2 + gap;
  const right: Spot = { x: at.x + nw / 2 + gap + s.tag * 1.75, y: mid, anchor: 'start' };
  const left: Spot = { x: at.x - nw / 2 - gap - s.tag * 0.68, y: mid, anchor: 'end' };
  const art: Spot = n.label === 'above' ? { x: n.x, y: n.y + half + s.tag * 1.08, anchor: 'middle' } : { x: n.x, y: n.y - half - s.tag * 0.58, anchor: 'middle' };
  const sides = n.x < W.w / 2 ? [right, left] : [left, right];
  if (portrait) {
    // beside the art, towards the middle of the screen, where there is room for a long callout
    const r = n.x < W.w / 2, off = n.size / 2 + 14;
    const towards: Spot = { x: n.x + (r ? off : -off), y: n.y + 8, anchor: r ? 'start' : 'end' };
    const away: Spot = { x: n.x + (r ? -off : off), y: n.y + 8, anchor: r ? 'end' : 'start' };
    const under: Spot = { x: at.x, y: at.y + s.name * 0.3 + gap + s.tag * 1.08, anchor: 'middle' };
    return [towards, away, under, ...sides, art];
  }
  // landscape: stacked just beyond the name; hugging the edge near the sides of the world
  const edge: Anchor = n.x > W.w - 260 ? 'end' : n.x < 260 ? 'start' : 'middle';
  const x = edge === 'end' ? n.x + n.size / 2 : edge === 'start' ? n.x - n.size / 2 : n.x;
  const stacked: Spot = n.label === 'above'
    ? { x, y: at.y - Math.max(44, s.name * 0.85 + 4 + s.tag * 0.58), anchor: edge }
    : { x, y: at.y + Math.max(36, s.name * 0.3 + 4 + s.tag * 1.08), anchor: edge };
  return [stacked, art, ...sides];
}

/** Where a link's tag may go, best first. */
function linkSpots(l: SLink, m: Pt, at: Spot, s: Sizes, portrait: boolean): Spot[] {
  const dx = l.label[0], dy = l.label[1], a = at.anchor;
  if (portrait) {
    // across the link from its name; else under the name, the same way out from the link
    const beside: Spot = { x: m.x + (dx < 0 ? 26 : -26), y: m.y + 8, anchor: dx < 0 ? 'start' : 'end' };
    const under: Spot = { x: at.x + (a === 'start' ? s.tag * 1.75 : a === 'end' ? -s.tag * 0.68 : 0), y: at.y + s.link * 0.3 + s.tag * 1.3, anchor: a };
    return [beside, under];
  }
  return [{ x: at.x, y: at.y + (dy < 0 ? -40 : 34), anchor: 'middle' }];
}
