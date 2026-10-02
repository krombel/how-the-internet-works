import { describe, expect, it } from 'vitest';
import { fit } from '../engine/camera';
import { bezier } from '../engine/geometry';
import { badgeReach, badgeSize, clearance, doorsInView, doorsOf, layoutDoors, nodeBoxes, type Door } from './doors';
import { morphScene, pathScene, type PathScene, type SNode } from './layout';
import { activityIds, content } from './registry';
import { resolveRoute } from './resolve';
import { loadAllPacks, packs } from './strings';
import { childrenOf, diveRuns, fitRectLocal, frameOf, sceneRef, stopRectLocal, rectToRoot } from './tree';

const home = resolveRoute({ activity: 'watch-video', places: ['home'] });
const street = resolveRoute({ activity: 'watch-video', places: ['street'] });
const list = (ds: { kind: string; id: string }[]) => ds.map((d) => `${d.kind}:${d.id}`);
/** A scene's doors, with its runs of links. */
const doorsIn = (r: typeof home, group: string | null, o: 'landscape' | 'portrait', root = group === null) =>
  doorsOf(pathScene(r, group, o), root, diveRuns(r, group, o).byLink, o, nameW);
/** Names about 10 characters wide. */
const nameW = () => 170;

describe('doors', () => {
  it('lists what the root and a group open, swap first, then in route order', () => {
    expect(list(doorsIn(home, null, 'landscape'))).toEqual(['swap:phone', 'dive:phone-ap', 'dive:ap-router', 'dive:router', 'dive:router-internet', 'expand:internet']);
    expect(list(doorsIn(street, null, 'portrait'))).toEqual(['swap:phone', 'dive:phone-cell-tower', 'dive:cell-tower', 'dive:cell-tower-internet', 'expand:internet']);
    // a stretch of same-technology links is one dive: one badge, and it lights up all of them
    const inside = doorsIn(home, 'internet', 'landscape');
    expect(list(inside)).toEqual(['dive:home-cabinet', 'dive:cabinet-backhaul', 'dive:bng-core', 'dive:core-border', 'dive:border', 'dive:border-ixp', 'dive:ixp', 'dive:ixp-datacentre', 'expand:datacentre']);
    expect(inside.map((d) => d.links)).toEqual([['home-cabinet'], ['cabinet-backhaul', 'backhaul-bng'], ['bng-core'], ['core-border'], [], ['border-ixp'], [], ['ixp-datacentre'], []]);
  });

  it('badges a device\'s dive on its corner away from its name, and it opens the device', () => {
    for (const o of ['landscape', 'portrait'] as const) {
      const ps = pathScene(home, null, o), n = ps.nodes.find((x) => x.id === 'router')!;
      const d = doorsIn(home, null, o).find((x) => x.id === 'router')!;
      expect(d).toMatchObject({ kind: 'dive', links: [] });
      expect(d.at.x).toBeLessThan(n.x);
      expect(Math.sign(d.at.y - n.y)).toBe(n.label === 'above' ? 1 : -1);
    }
  });

  // generic: holds for whatever content exists, in every language (names about as wide as the label font draws them)
  it('puts a stretch\'s one badge on its links, clear of every device and its name, at their biggest', async () => {
    await loadAllPacks();
    let stretches = 0;
    for (const lang of Object.keys(packs)) {
      const nameW = (n: SNode) => (packs[lang].strings[`node.${n.node.id}.name`] ?? packs.en.strings[`node.${n.node.id}.name`]).length * 28 * 0.52;
      for (const activity of activityIds()) for (const place of Object.keys(content.places)) {
        const r = resolveRoute({ activity, places: [place] });
        for (const o of ['landscape', 'portrait'] as const) {
          const walk = (path: string[]): void => {
            const ref = sceneRef(r, path, o)!;
            if (ref.kind !== 'path') return;
            const ps = pathScene(r, ref.group, o), boxes = ps.nodes.flatMap((n) => nodeBoxes(n, nameW(n), o));
            for (const d of doorsOf(ps, path.length === 0, diveRuns(r, ref.group, o).byLink, o, nameW)) {
              if (d.links.length < 2) continue;
              stretches++;
              const at = `${lang} ${place} × ${activity} ${o} /${path.join('/')} ${d.id}`;
              // names at their biggest: never covered; the art neither on a phone. Landscape links are short: there the
              // badge keeps off the art at its authored size (in short landscape it may reach a corner of the art's square)
              expect(clearance(d.at, boxes.filter((_, i) => i % 2)), at).toBeGreaterThanOrEqual(badgeReach(o));
              expect(clearance(d.at, boxes.filter((_, i) => i % 2 === 0)), at).toBeGreaterThanOrEqual(badgeReach(o, o === 'portrait' ? undefined : 1));
              const on = Math.min(...d.links.flatMap((id) => [...Array(101).keys()].map((i) => {
                const q = bezier(ps.links.find((l) => l.id === id)!, i / 100);
                return Math.hypot(q.x - d.at.x, q.y - d.at.y);
              })));
              expect(on, at).toBeLessThan(5);
            }
            for (const c of childrenOf(r, ref, o)) if (c.kind === 'expand') walk([...path, c.step]);
          };
          walk([]);
        }
      }
    }
    expect(stretches).toBeGreaterThan(0);
  });

  // generic: in every language, at the size names grow to on a small screen (short landscape the most)
  it('keeps device names apart, at their biggest', async () => {
    await loadAllPacks();
    let pairs = 0;
    const touching: string[] = [];
    for (const lang of Object.keys(packs)) {
      const nameW = (n: SNode) => (packs[lang].strings[`node.${n.node.id}.name`] ?? packs.en.strings[`node.${n.node.id}.name`]).length * 28 * 0.52;
      for (const activity of activityIds()) for (const place of Object.keys(content.places)) {
        const r = resolveRoute({ activity, places: [place] });
        for (const o of ['landscape', 'portrait'] as const) {
          const walk = (path: string[]): void => {
            const ref = sceneRef(r, path, o)!;
            if (ref.kind !== 'path') return;
            const ps = pathScene(r, ref.group, o), names = ps.nodes.map((n) => ({ id: n.id, box: nodeBoxes(n, nameW(n), o)[1] }));
            for (const [i, a] of names.entries()) for (const b of names.slice(i + 1)) {
              pairs++;
              const apart = a.box.x + a.box.w <= b.box.x || b.box.x + b.box.w <= a.box.x || a.box.y + a.box.h <= b.box.y || b.box.y + b.box.h <= a.box.y;
              if (!apart) touching.push(`${lang} ${place} × ${activity} ${o} /${path.join('/')}: ${a.id} and ${b.id}`);
            }
            for (const c of childrenOf(r, ref, o)) if (c.kind === 'expand') walk([...path, c.step]);
          };
          walk([]);
        }
      }
    }
    expect(touching).toEqual([]);
    expect(pairs).toBeGreaterThan(0);
  });

  it('puts badges where the art draws them: mid-link, above a group, beside the start device', () => {
    const ps = pathScene(home, null, 'landscape'), d = doorsIn(home, null, 'landscape');
    const n = (id: string) => ps.nodes.find((k) => k.id === id)!;
    expect(d.find((k) => k.kind === 'expand')!.at).toEqual({ x: n('internet').x, y: n('internet').y - n('internet').size * 0.36 });
    expect(d[0].at.x).toBeGreaterThan(n('phone').x);
    expect(d[0].at.y).toBeLessThan(n('phone').y);
  });

  it('slides a link\'s badge off its middle when a device\'s name is there, at its biggest (#72)', () => {
    const node = (id: string, x: number, y: number) => ({ id, kind: 'entry', x, y, size: 100, label: 'below', alpha: 1 }) as SNode;
    const link = { id: 'a-b', from: 'a', to: 'b', dive: 'x', alpha: 1, p0: { x: 200, y: 450 }, c: { x: 800, y: 450 }, p1: { x: 1400, y: 450 } };
    const scene = (nodes: SNode[]) => ({ key: 'overview', group: null, nodes, links: [link], route: ['a-b'], stops: ['a-b'], signs: {} }) as unknown as PathScene;
    const ends = [node('a', 200, 450), node('b', 1400, 450)], w = () => 200;
    expect(doorsOf(scene(ends), false, new Map(), 'landscape', w)[0].at).toEqual({ x: 800, y: 450 });
    // a device just over the middle: its name, grown, reaches down to the link
    const over = node('c', 800, 330), [d] = doorsOf(scene([...ends, over]), false, new Map(), 'landscape', w);
    expect(d.at.y).toBeCloseTo(450);
    expect(d.at.x).not.toBeCloseTo(800);
    expect(clearance(d.at, nodeBoxes(over, 200, 'landscape'))).toBeGreaterThanOrEqual(badgeReach('landscape'));
  });

  it('has no doors on things still fading in or out while switching place', () => {
    const a = pathScene(home, null, 'landscape'), b = pathScene(street, null, 'landscape');
    // the phone and the cloud glide over; the 5G link and its dive only fade in
    const runs = diveRuns(street, null, 'landscape').byLink;
    expect(list(doorsOf(morphScene(a, b, 0.2), true, runs, 'landscape', nameW))).toEqual(['swap:phone', 'expand:internet']);
    expect(list(doorsOf(morphScene(a, b, 1), true, runs, 'landscape', nameW))).toEqual(list(doorsOf(b, true, runs, 'landscape', nameW)));
  });

  // generic: holds for whatever content exists
  it('opens exactly the scene tree\'s dive and group children, for every place × activity', () => {
    for (const activity of activityIds()) for (const place of Object.keys(content.places)) {
      const r = resolveRoute({ activity, places: [place] });
      for (const o of ['landscape', 'portrait'] as const) {
        const walk = (path: string[]): void => {
          const ref = sceneRef(r, path, o)!;
          if (ref.kind !== 'path') return;
          const kids = childrenOf(r, ref, o).filter((c) => c.kind !== 'layer');
          const doors = doorsIn(r, ref.group, o, path.length === 0).filter((d) => d.kind !== 'swap');
          expect(doors.map((d) => `${d.kind}:${d.id}`), `${place} × ${activity} ${o} /${path.join('/')}`).toEqual(kids.map((c) => `${c.kind}:${c.step}`));
          for (const c of kids) walk([...path, c.step]);
        };
        walk([]);
      }
    }
  });

  // generic: a scene's dives are small copies of their scenes, each centred on its badge. Two that overlap show through
  // each other once dived into (on a phone the stretches zigzag, so badges one above the other must be a scene apart)
  const OVERLAPPING_DIVES = [
    'home-fttb portrait /internet: basement-backhaul × backhaul-bng',
  ];
  it('keeps a scene\'s dives from overlapping', () => {
    const found = new Set<string>();
    for (const activity of activityIds()) for (const place of Object.keys(content.places)) {
      const r = resolveRoute({ activity, places: [place] });
      for (const o of ['landscape', 'portrait'] as const) {
        const walk = (path: string[]): void => {
          const ref = sceneRef(r, path, o)!;
          if (ref.kind !== 'path') return;
          const kids = childrenOf(r, ref, o).filter((c) => c.kind !== 'layer');
          const rects = kids.map((c) => ({ id: c.step, r: rectToRoot(frameOf(r, [...path, c.step], o), fitRectLocal(sceneRef(r, [...path, c.step], o)!, o)) }));
          rects.forEach((a, i) => rects.slice(i + 1).forEach((b) => {
            if (a.r.x < b.r.x + b.r.w && b.r.x < a.r.x + a.r.w && a.r.y < b.r.y + b.r.h && b.r.y < a.r.y + a.r.h) found.add(`${place} ${o} /${path.join('/')}: ${a.id} × ${b.id}`);
          }));
          for (const c of kids) if (c.kind === 'expand') walk([...path, c.step]);
        };
        walk([]);
      }
    }
    expect([...found].filter((k) => !OVERLAPPING_DIVES.includes(k)), 'dives overlapping').toEqual([]);
    expect(OVERLAPPING_DIVES.filter((k) => !found.has(k)), 'fixed: drop them from OVERLAPPING_DIVES').toEqual([]);
  });

  it('knows which badges are on screen', () => {
    const vp = { w: 390, h: 844, top: 90, bottom: 250 }, o = 'portrait' as const;
    const ps = pathScene(home, null, o), doors = doorsIn(home, null, o), frame = frameOf(home, [], o);
    const whole = fit(rectToRoot(frame, fitRectLocal(sceneRef(home, [], o)!, o)), vp);
    expect(list(doorsInView(doors, frame, whole, vp))).toEqual(list(doors));
    // zoomed in on the phone: the cloud's "Open up" is off screen
    const near = fit(rectToRoot(frame, stopRectLocal(ps, 'phone')!), vp, 0.9);
    const seen = list(doorsInView(doors, frame, near, vp));
    expect(seen).toContain('swap:phone');
    expect(seen).not.toContain('expand:internet');
  });

  it('labels a door when pointed at or lit, and keeps lit labels from covering each other', () => {
    const size = 22, textW = () => 100;
    const doors: Door[] = [
      { kind: 'swap', id: 'a', links: [], at: { x: 0, y: 10 } },
      { kind: 'dive', id: 'b', links: [], at: { x: 20, y: 0 } },
      { kind: 'expand', id: 'c', links: [], at: { x: 500, y: 0 } },
    ];
    const rest = layoutDoors(doors, size, false, null, textW);
    expect(rest.map((b) => b.labelled)).toEqual([false, false, false]);
    expect(rest[0]).toMatchObject({ x: 0, y: 10, w: rest[0].h });
    const hot = layoutDoors(doors, size, false, 'b', textW);
    expect(hot.map((b) => b.labelled)).toEqual([false, true, false]);
    expect(hot[1].x - hot[1].w / 2).toBeCloseTo(20 - hot[1].h / 2); // the pill starts at the mark
    expect(hot[0].y).toBe(10); // pointing never moves anything
    const lit = layoutDoors(doors, size, true, null, textW);
    expect(lit.every((b) => b.labelled)).toBe(true);
    expect(lit[2]).toMatchObject({ x: 500, y: 0 }); // "Open up" is centred on its spot
    const overlap = (p: typeof lit[0], q: typeof lit[0]) => Math.abs(p.x - q.x) * 2 < p.w + q.w && Math.abs(p.y - q.y) * 2 < p.h + q.h;
    expect(overlap(lit[0], lit[1])).toBe(false);
    expect(lit[2].y).toBe(0);
    expect(lit[0].y).toBe(10); // the earlier door keeps its spot; the next one gives way
    expect(Math.abs(lit[1].y - lit[0].y)).toBeGreaterThanOrEqual(size * 2.4);
  });

  it('keeps badge labels readable when zoomed out', () => {
    expect(badgeSize(14, 1)).toBe(22);
    expect(badgeSize(14, 0.25) * 0.25).toBeCloseTo(14 * 0.8);
  });
});
