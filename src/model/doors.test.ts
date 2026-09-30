import { describe, expect, it } from 'vitest';
import { fit } from '../engine/camera';
import { badgeSize, doorsInView, doorsOf, layoutDoors, type Door } from './doors';
import { morphScene, pathScene } from './layout';
import { content } from './registry';
import { resolveRoute } from './resolve';
import { childrenOf, fitRectLocal, frameOf, sceneRef, stopRectLocal, rectToRoot } from './tree';

const home = resolveRoute({ activity: 'watch-video', places: ['home'] });
const street = resolveRoute({ activity: 'watch-video', places: ['street'] });
const list = (ds: { kind: string; id: string }[]) => ds.map((d) => `${d.kind}:${d.id}`);

describe('doors', () => {
  it('lists what the root and a group open, swap first, then in route order', () => {
    expect(list(doorsOf(pathScene(home, null, 'landscape'), true))).toEqual(['swap:phone', 'dive:phone-ap', 'dive:router-internet', 'expand:internet']);
    expect(list(doorsOf(pathScene(street, null, 'portrait'), true))).toEqual(['swap:phone', 'dive:phone-cell-tower', 'dive:cell-tower-internet', 'expand:internet']);
    expect(list(doorsOf(pathScene(home, 'internet', 'landscape'), false))).toEqual(['dive:home-cabinet']);
  });

  it('puts badges where the art draws them: mid-link, above a group, beside the start device', () => {
    const ps = pathScene(home, null, 'landscape'), d = doorsOf(ps, true);
    const n = (id: string) => ps.nodes.find((k) => k.id === id)!;
    expect(d.find((k) => k.kind === 'expand')!.at).toEqual({ x: n('internet').x, y: n('internet').y - n('internet').size * 0.36 });
    expect(d[0].at.x).toBeGreaterThan(n('phone').x);
    expect(d[0].at.y).toBeLessThan(n('phone').y);
  });

  it('has no doors on things still fading in or out while switching place', () => {
    const a = pathScene(home, null, 'landscape'), b = pathScene(street, null, 'landscape');
    // the phone and the cloud glide over; the 5G link and its dive only fade in
    expect(list(doorsOf(morphScene(a, b, 0.2), true))).toEqual(['swap:phone', 'expand:internet']);
    expect(list(doorsOf(morphScene(a, b, 1), true))).toEqual(list(doorsOf(b, true)));
  });

  // generic: holds for whatever content exists
  it('opens exactly the scene tree\'s dive and group children, for every place × activity', () => {
    for (const activity of Object.keys(content.activities)) for (const place of Object.keys(content.places)) {
      const r = resolveRoute({ activity, places: [place] });
      for (const o of ['landscape', 'portrait'] as const) {
        const walk = (path: string[]): void => {
          const ref = sceneRef(r, path, o)!;
          if (ref.kind !== 'path') return;
          const kids = childrenOf(r, ref, o).filter((c) => c.kind !== 'layer');
          const doors = doorsOf(pathScene(r, ref.group, o), path.length === 0).filter((d) => d.kind !== 'swap');
          expect(doors.map((d) => `${d.kind}:${d.id}`), `${place} × ${activity} ${o} /${path.join('/')}`).toEqual(kids.map((c) => `${c.kind}:${c.step}`));
          for (const c of kids) walk([...path, c.step]);
        };
        walk([]);
      }
    }
  });

  it('knows which badges are on screen', () => {
    const vp = { w: 390, h: 844, top: 90, bottom: 250 }, o = 'portrait' as const;
    const ps = pathScene(home, null, o), doors = doorsOf(ps, true), frame = frameOf(home, [], o);
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
      { kind: 'swap', id: 'a', at: { x: 0, y: 10 } },
      { kind: 'dive', id: 'b', at: { x: 20, y: 0 } },
      { kind: 'expand', id: 'c', at: { x: 500, y: 0 } },
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
