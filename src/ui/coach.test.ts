import { describe, expect, it } from 'vitest';
import { doorsOf, type Door } from '../model/doors';
import { pathScene } from '../model/layout';
import { resolveRoute } from '../model/resolve';
import { diveRuns } from '../model/tree';
import { firstRun } from './coach';
import { coachMarks, placeMark } from './coach-marks';

const door = (kind: Door['kind'], id: string): Door => ({ kind, id, links: [], at: { x: 0, y: 0 } });
const vp = { w: 1000, h: 800, top: 60, bottom: 120 };
const box = { w: 300, h: 120 };

describe('coach marks', () => {
  it('come on a first visit that starts at the top, only', () => {
    expect(firstRun(null, { path: [], stop: null })).toBe(true);
    expect(firstRun('1', { path: [], stop: null })).toBe(false);
    expect(firstRun(null, { path: ['internet'], stop: null })).toBe(false);
    expect(firstRun(null, { path: [], stop: 'router' })).toBe(false);
  });

  it('point at the first door that opens up, the first that looks inside, then "What can I explore?"', () => {
    const doors = [door('swap', 'phone'), door('dive', 'wifi'), door('expand', 'internet'), door('dive', 'fibre'), door('expand', 'dc')];
    expect(coachMarks(doors, true).map((m) => `${m.kind}:${m.door?.id ?? ''}`)).toEqual(['expand:internet', 'dive:wifi', 'explore:']);
    expect(coachMarks([door('dive', 'wifi')], true).map((m) => m.kind)).toEqual(['dive', 'explore']);
    expect(coachMarks([], false)).toEqual([]);
  });

  it('find all three on the overview', () => {
    for (const o of ['landscape', 'portrait'] as const) {
      const r = resolveRoute({ activity: 'watch-video', places: ['home'] });
      const doors = doorsOf(pathScene(r, null, o), true, diveRuns(r, null, o).byLink, o, () => 170);
      expect(coachMarks(doors, doors.length > 0).map((m) => m.kind)).toEqual(['expand', 'dive', 'explore']);
    }
  });

  it('put the card below its target, else above, else beside it', () => {
    const below = placeMark({ x: 400, y: 100, w: 100, h: 40 }, box, vp);
    expect(below).toEqual({ x: 300, y: 154, side: 'below', tail: 150 });
    const above = placeMark({ x: 400, y: 600, w: 100, h: 40 }, box, vp);
    expect(above).toMatchObject({ side: 'above', y: 600 - 14 - 120 });
    // too tall for above or below: beside it, inside the free band
    const tall = { w: 300, h: 500 };
    expect(placeMark({ x: 100, y: 300, w: 100, h: 40 }, tall, vp)).toMatchObject({ side: 'right', x: 214, y: 320 - 250 });
    expect(placeMark({ x: 800, y: 300, w: 100, h: 40 }, tall, vp)).toMatchObject({ side: 'left', x: 800 - 14 - 300 });
  });

  it('keeps the card on screen, its tail pointing at the target clear of the corners', () => {
    const edge = placeMark({ x: 0, y: 100, w: 20, h: 40 }, box, vp);
    expect(edge).toMatchObject({ side: 'below', x: 10, tail: 26 });
    const right = placeMark({ x: 980, y: 100, w: 20, h: 40 }, box, vp);
    expect(right).toMatchObject({ x: 690, tail: 300 - 26 });
  });

  it('falls back to the roomier side, clamped to the window, when nothing fits (a short landscape screen)', () => {
    const short = { w: 844, h: 390, top: 48, bottom: 90 };
    const wide = { w: 840, h: 200 };
    expect(placeMark({ x: 400, y: 60, w: 60, h: 30 }, wide, short)).toMatchObject({ side: 'below', y: 104 });
    expect(placeMark({ x: 400, y: 200, w: 60, h: 30 }, wide, short)).toMatchObject({ side: 'above', y: 10 });
    expect(placeMark({ x: 400, y: 100, w: 60, h: 30 }, { w: 840, h: 300 }, short)).toMatchObject({ side: 'below', y: 390 - 10 - 300 });
  });
});
