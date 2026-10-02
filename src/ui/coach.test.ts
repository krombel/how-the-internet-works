import { describe, expect, it } from 'vitest';
import { doorsOf, type Door } from '../model/doors';
import { pathScene } from '../model/layout';
import { resolveRoute } from '../model/resolve';
import { diveRuns } from '../model/tree';
import { COACH_ALL, coachRun } from './coach';
import { eraStops } from '../model/era';
import { nowEra } from '../model/registry';
import { coachMarks, otherEras, placeMark } from './coach-marks';

const door = (kind: Door['kind'], id: string): Door => ({ kind, id, links: [], at: { x: 0, y: 0 } });
const vp = { w: 1000, h: 800, top: 60, bottom: 120 };
const box = { w: 300, h: 120 };

describe('coach marks', () => {
  it('come on a first visit that starts at the top, only', () => {
    const top = { path: [], stop: null };
    expect(coachRun(null, top)).toBe('all');
    expect(coachRun(COACH_ALL, top)).toBe(null);
    expect(coachRun(null, { path: ['internet'], stop: null })).toBe(null);
    expect(coachRun(null, { path: [], stop: 'router' })).toBe(null);
  });

  it('show a reader who had them before the time machine came only its card, once (#59)', () => {
    expect(coachRun('1', { path: [], stop: null })).toBe('time');
    expect(coachRun('1', { path: ['internet'], stop: null })).toBe(null);
  });

  it('point at the first door that opens up, the first that looks inside, "What can I explore?", then the time machine', () => {
    const doors = [door('swap', 'phone'), door('dive', 'wifi'), door('expand', 'internet'), door('dive', 'fibre'), door('expand', 'dc')];
    expect(coachMarks(doors, true, true, 'all').map((m) => `${m.kind}:${m.door?.id ?? ''}`)).toEqual(['expand:internet', 'dive:wifi', 'explore:', 'time:']);
    expect(coachMarks([door('dive', 'wifi')], true, false, 'all').map((m) => m.kind)).toEqual(['dive', 'explore']);
    expect(coachMarks([], false, false, 'all')).toEqual([]);
    expect(coachMarks(doors, true, true, 'time').map((m) => m.kind)).toEqual(['time']);
    expect(coachMarks(doors, true, false, 'time')).toEqual([]);
    // its card names the other eras, today by name (null)
    expect(otherEras(eraStops('home'), nowEra(), nowEra())).toEqual([1995, 2010]);
    expect(otherEras(eraStops('home-dialup'), '1995', nowEra())).toEqual([2010, null]);
  });

  it('find all four on the overview', () => {
    for (const o of ['landscape', 'portrait'] as const) {
      const r = resolveRoute({ activity: 'watch-video', places: ['home'] });
      const doors = doorsOf(pathScene(r, null, o), true, diveRuns(r, null, o).byLink, o, () => 170);
      expect(coachMarks(doors, doors.length > 0, true, 'all').map((m) => m.kind)).toEqual(['expand', 'dive', 'explore', 'time']);
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
