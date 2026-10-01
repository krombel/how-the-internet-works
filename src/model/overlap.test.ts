// Issue #64: nothing a reader reads or taps in a path scene lands on something else. For every place × activity, every
// path scene (the root and each group, all the way down), both orientations and every language, at the biggest the
// labels and badges are drawn at rest on a small screen: door badges, device names, link names and owner signs keep
// apart from each other and from the devices' art, and every link keeps a stretch of itself clear for its packets.
import { describe, expect, it } from 'vitest';
import type { Level } from '../define';
import { bezier, type Orient, type Pt, type Rect } from '../engine/geometry';
import { badgeReach, doorsOf } from './doors';
import { labelY, pathScene, type PathScene, type SNode } from './layout';
import { regionsOf } from './regions';
import { content } from './registry';
import { resolveRoute, type Route } from './resolve';
import { loadAllPacks, lookupLevel, packs } from './strings';
import { childrenOf, diveRuns, sceneRef } from './tree';

/** How much bigger than authored text and badges get at rest (labels never render under the theme's minimum): 1.9×
 *  in short landscape (844×390), 2× on a 360-wide portrait phone. */
const BIG: Record<Orient, number> = { portrait: 2, landscape: 1.9 };
/** A label font's width per character and px, generously (the storybook's Baloo 2 is about 0.47). */
const PER_CHAR = 0.52;
/** A device's art, as a circle: links start at 0.45 of its size from its centre. */
const ART = 0.42;
const LEVELS: Level[] = ['kid', 'nerd'];

type Shape = { what: string; kind: 'badge' | 'art' | 'label'; owner: string } & ({ c: Pt; r: number } | { box: Rect });

const dist = (p: Pt, b: Rect) => Math.hypot(Math.max(0, b.x - p.x, p.x - b.x - b.w), Math.max(0, b.y - p.y, p.y - b.y - b.h));
function overlap(a: Shape, b: Shape): boolean {
  if ('c' in a && 'c' in b) return Math.hypot(a.c.x - b.c.x, a.c.y - b.c.y) < a.r + b.r;
  if ('box' in a && 'box' in b) return a.box.x < b.box.x + b.box.w && b.box.x < a.box.x + a.box.w && a.box.y < b.box.y + b.box.h && b.box.y < a.box.y + a.box.h;
  const [c, r] = 'c' in a ? [a, b as Extract<Shape, { box: Rect }>] : [b as Extract<Shape, { c: Pt }>, a as Extract<Shape, { box: Rect }>];
  return dist(c.c, r.box) < c.r;
}

/** Everything drawn in a path scene that must keep apart, at its biggest. */
function shapes(r: Route, ps: PathScene, root: boolean, o: Orient, lang: string, level: Level): Shape[] {
  const G = BIG[o], f = 28 * G;
  const str = (k: string) => lookupLevel(lang, k, level) ?? '';
  const textW = (s: string, size: number) => s.length * PER_CHAR * size;
  const name = (n: SNode) => str(`node.${n.node.id}.name`);
  const out: Shape[] = [];
  for (const n of ps.nodes) {
    out.push({ what: `${n.id} art`, kind: 'art', owner: n.id, c: { x: n.x, y: n.y }, r: n.size * ART });
    // the name grows up from its baseline
    const w = textW(name(n), f);
    out.push({ what: `${n.id} name`, kind: 'label', owner: n.id, box: { x: n.x - w / 2, y: labelY(n) - f * 0.8, w, h: f } });
  }
  // link names are drawn at the root only
  if (root) for (const l of ps.links) {
    const m = bezier(l, 0.5), w = textW(str(`tech.${l.link.tech.id}.name`), f), [dx, dy, anchor = 'middle'] = l.label;
    const x = m.x + dx - (anchor === 'end' ? w : anchor === 'middle' ? w / 2 : 0);
    out.push({ what: `${l.id} name`, kind: 'label', owner: l.id, box: { x, y: m.y + dy - f * 0.8, w, h: f } });
  }
  for (const g of regionsOf(r, ps)) if (!g.aside) {
    // the name, its padding and the owner's colour dot on the left
    const w = textW(str(`owner.${g.owner}.name`), f);
    out.push({ what: `${g.owner} sign`, kind: 'label', owner: g.owner, box: { x: g.sign.x - w / 2 - f * 1.45, y: g.sign.y - f * 0.78, w: w + f * 2, h: f * 1.56 } });
  }
  const nameW = (n: SNode) => textW(name(n), 28);
  for (const d of doorsOf(ps, root, diveRuns(r, ps.group, o).byLink, o, nameW))
    out.push({ what: `${d.kind} badge ${d.id}`, kind: 'badge', owner: d.links.length ? d.links[0] : d.id, c: d.at, r: badgeReach(o, 1 / G) });
  return out;
}

/** What may touch: a device's own badges (swap, look inside) sit on the corner of its art, by design. */
const allowed = (a: Shape, b: Shape) => a.owner === b.owner && (a.kind === 'art' || b.kind === 'art');

/** How much of a link shows clear of the devices' art and every badge: where its packets can be seen. */
function clearLength(l: PathScene['links'][number], ss: Shape[]): number {
  const N = 200, blockers = ss.filter((s): s is Extract<Shape, { c: Pt }> => 'c' in s);
  let len = 0, prev = bezier(l, 0);
  for (let i = 1; i <= N; i++) {
    const p = bezier(l, i / N), q = { x: (p.x + prev.x) / 2, y: (p.y + prev.y) / 2 };
    if (!blockers.some((b) => Math.hypot(q.x - b.c.x, q.y - b.c.y) < b.r)) len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return len;
}

/** A link shows at least two packets' worth of itself (a packet is about 60 long). */
const MIN_CLEAR = 120;

// Known crowding, still to be laid out better: an entry here that no longer happens fails too, so the lists only shrink.
const KNOWN_OVERLAPS = [
  'desk × watch-video landscape /: internet name × dive badge router-internet',
  'desk × watch-video landscape /: laptop-router name × dive badge laptop-router',
  'desk × watch-video landscape /: laptop-router name × dive badge router',
  'desk × watch-video landscape /: router art × router-internet name',
  'desk × watch-video landscape /: router-internet name × dive badge router-internet',
  'desk × watch-video portrait /: laptop-router name × dive badge laptop-router',
  'desk × watch-video portrait /: router-internet name × dive badge router-internet',
  'desk × watch-video portrait /internet: bng art × isp sign',
  'desk × watch-video portrait /internet: bng name × isp sign',
  'desk × watch-video portrait /internet: cabinet name × dive badge home-cabinet',
  'desk × watch-video portrait /internet: isp sign × dive badge cabinet-backhaul',
  'desk × watch-video portrait /internet: ixp sign × dive badge border-ixp',
  'desk × watch-video portrait /internet: transit name × ixp sign',
  'home × watch-video landscape /: ap art × ap-router name',
  'home × watch-video landscape /: ap name × swap badge phone',
  'home × watch-video landscape /: ap-router name × dive badge ap-router',
  'home × watch-video landscape /: ap-router name × dive badge router',
  'home × watch-video landscape /: internet name × dive badge router-internet',
  'home × watch-video landscape /: phone-ap name × dive badge phone-ap',
  'home × watch-video landscape /: router art × ap-router name',
  'home × watch-video landscape /: router art × router-internet name',
  'home × watch-video landscape /: router-internet name × dive badge router-internet',
  'home × watch-video portrait /: ap name × dive badge phone-ap',
  'home × watch-video portrait /: ap-router name × dive badge ap-router',
  'home × watch-video portrait /: phone-ap name × dive badge phone-ap',
  'home × watch-video portrait /: router-internet name × dive badge router-internet',
  'home × watch-video portrait /internet: bng art × isp sign',
  'home × watch-video portrait /internet: bng name × isp sign',
  'home × watch-video portrait /internet: cabinet name × dive badge home-cabinet',
  'home × watch-video portrait /internet: isp sign × dive badge cabinet-backhaul',
  'home × watch-video portrait /internet: ixp sign × dive badge border-ixp',
  'home × watch-video portrait /internet: transit name × ixp sign',
  'street × watch-video portrait /internet: ixp sign × dive badge border-ixp',
  'street × watch-video portrait /internet: transit name × ixp sign',
];
const KNOWN_SHORT = [
  'desk × watch-video landscape /internet backhaul-bng',
  'desk × watch-video landscape /internet border-ixp',
  'desk × watch-video landscape /internet core-border',
  'desk × watch-video landscape /internet home-cabinet',
  'desk × watch-video portrait /internet border-transit',
  'home × watch-video landscape / phone-ap',
  'home × watch-video landscape /internet backhaul-bng',
  'home × watch-video landscape /internet border-ixp',
  'home × watch-video landscape /internet core-border',
  'home × watch-video landscape /internet home-cabinet',
  'home × watch-video portrait / ap-router',
  'home × watch-video portrait /internet border-transit',
  'street × watch-video landscape /internet border-ixp',
  'street × watch-video portrait /internet border-transit',
];

describe('path scenes (issue #64)', () => {
  // generic: holds for whatever content exists, in every language and level
  it('keep badges, names, link names, signs and devices apart, and links clear for their packets', async () => {
    await loadAllPacks();
    const overlaps = new Set<string>(), short = new Set<string>();
    for (const lang of Object.keys(packs)) for (const level of LEVELS) for (const activity of Object.keys(content.activities)) for (const place of Object.keys(content.places)) {
      const r = resolveRoute({ activity, places: [place] });
      for (const o of ['landscape', 'portrait'] as const) {
        const walk = (path: string[]): void => {
          const ref = sceneRef(r, path, o)!;
          if (ref.kind !== 'path') return;
          const ps = pathScene(r, ref.group, o), ss = shapes(r, ps, path.length === 0, o, lang, level);
          const at = `${place} × ${activity} ${o} /${path.join('/')}`;
          ss.forEach((a, i) => ss.slice(i + 1).forEach((b) => {
            if (a.kind === 'art' && b.kind === 'art') return;
            if (!allowed(a, b) && overlap(a, b)) overlaps.add(`${at}: ${a.what} × ${b.what}`);
          }));
          for (const l of ps.links) if (clearLength(l, ss) < MIN_CLEAR) short.add(`${at} ${l.id}`);
          for (const c of childrenOf(r, ref, o)) if (c.kind === 'expand') walk([...path, c.step]);
        };
        walk([]);
      }
    }
    expect([...overlaps].filter((k) => !KNOWN_OVERLAPS.includes(k)), 'new overlaps').toEqual([]);
    expect(KNOWN_OVERLAPS.filter((k) => !overlaps.has(k)), 'fixed: drop them from KNOWN_OVERLAPS').toEqual([]);
    expect([...short].filter((k) => !KNOWN_SHORT.includes(k)), 'links too hidden for their packets').toEqual([]);
    expect(KNOWN_SHORT.filter((k) => !short.has(k)), 'fixed: drop them from KNOWN_SHORT').toEqual([]);
  });
});
