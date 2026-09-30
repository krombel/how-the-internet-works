// The maths of the device dives' scenes (#9). They reach the engine through `$core/api`, which reads the browser's
// state on import, hence the stubs and the late imports.
import { beforeAll, describe, expect, it } from 'vitest';
import { WORLD_SIZE } from '../engine/geometry';
import { stubBrowser } from '../test/stub-browser';
import type * as Router from '../../content/scenes/router-inside/router';
import type * as Tower from '../../content/scenes/tower-inside/tower';
import type { Box } from '../../content/scenes/router-inside/types';

let router: typeof Router, tower: typeof Tower;
beforeAll(async () => {
  stubBrowser();
  router = await import('../../content/scenes/router-inside/router');
  tower = await import('../../content/scenes/tower-inside/tower');
});

const inside = (a: Box, b: Box) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const apart = (a: Box, b: Box) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;

describe('inside the home router', () => {
  it('lays its rooms out in the box, apart, and the box in the world', () => {
    for (const o of ['landscape', 'portrait'] as const) {
      const L = router.routerLayout(o), W = WORLD_SIZE[o], rooms = Object.values(L.rooms);
      expect(inside(L.case, { x: 0, y: 0, ...W })).toBe(true);
      for (const [i, r] of rooms.entries()) {
        expect(inside(r, L.case)).toBe(true);
        for (const q of rooms.slice(i + 1)) expect(apart(r, q)).toBe(true);
      }
    }
  });

  it('takes a parcel in and out by the rooms its links need, through the brain', () => {
    const L = router.routerLayout('landscape');
    const trip = router.tripPath(L, 'cable', 'fibre');
    expect([trip[0], trip.at(-1)]).toEqual([L.inNode, L.outNode]);
    expect(trip.slice(2, 5)).toEqual([router.centre(L.rooms.switch), router.centre(L.rooms.brain), router.centre(L.rooms.ont)]);
    // in at the socket side facing the device before, out of the side facing the one after
    expect(trip[1]).toEqual({ x: L.rooms.switch.x, y: router.centre(L.rooms.switch).y });
    expect(trip[5]).toEqual({ x: L.rooms.ont.x + L.rooms.ont.w, y: router.centre(L.rooms.ont).y });
    // over the air: by the antennas
    expect(router.tripPath(L, 'radio', 'fibre')[2]).toEqual(router.centre(L.rooms.wifi));
  });

  it('carries a parcel in, through the brain (which swaps its sender) and out, once a period', () => {
    const trip = router.tripPath(router.routerLayout('portrait'), 'cable', 'fibre');
    const at = (t: number) => router.parcelAt(t, false, trip);
    expect(at(0)).toMatchObject({ stage: 'in', alpha: 0, swapped: false });
    expect(at(router.PERIOD * 0.2)).toMatchObject({ alpha: 1 });
    expect(at(router.PERIOD * 0.99).stage).toBe('out');
    expect(at(router.PERIOD * 1.3).p.x).toBeCloseTo(at(router.PERIOD * 0.3).p.x);
    expect(at(router.PERIOD * 1.3).p.y).toBeCloseTo(at(router.PERIOD * 0.3).p.y);
    const stages = Array.from({ length: 60 }, (_, i) => at((i / 60) * router.PERIOD));
    expect([...new Set(stages.map((s) => s.stage))]).toEqual(['in', 'inside', 'out']);
    // the sender changes once, inside the box
    const swap = stages.findIndex((s) => s.swapped);
    expect(stages[swap].stage).toBe('inside');
    expect(stages.slice(swap).every((s) => s.swapped)).toBe(true);
    // held still: in view, just past the brain
    expect(router.parcelAt(123, true, trip)).toMatchObject({ stage: 'inside', alpha: 1, swapped: true });
  });
});

describe('inside the cell tower', () => {
  it('lays its rooms out apart in the world, baseband and the fibre in the cabinet, under the mast', () => {
    for (const o of ['landscape', 'portrait'] as const) {
      const L = tower.towerLayout(o), W = WORLD_SIZE[o], rooms = Object.values(L.rooms);
      expect(inside(L.cabinet, { x: 0, y: 0, ...W })).toBe(true);
      for (const [i, r] of rooms.entries()) {
        expect(inside(r, { x: 0, y: 0, ...W })).toBe(true);
        for (const q of rooms.slice(i + 1)) expect(apart(r, q)).toBe(true);
      }
      for (const r of [L.rooms.baseband, L.rooms.fibre]) expect(inside(r, L.cabinet)).toBe(true);
      for (const r of [L.rooms.antenna, L.rooms.radio]) expect(apart(r, L.cabinet)).toBe(true);
      // straight down the mast from the radio unit into baseband
      expect(tower.centre(L.rooms.radio).x).toBe(tower.centre(L.rooms.baseband).x);
      // the links either side stay clear of the cabinet
      const trip = tower.tripPath(L);
      for (const [a, b] of [[trip[0], trip[1]], [trip.at(-2)!, trip.at(-1)!]]) {
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        expect(inside({ ...mid, w: 0, h: 0 }, L.cabinet)).toBe(false);
      }
    }
  });

  it('carries a parcel in over the air, wraps it in baseband and sends it out, once a period', () => {
    const L = tower.towerLayout('landscape'), trip = tower.tripPath(L);
    expect([trip[0], trip.at(-1)]).toEqual([L.inNode, L.outNode]);
    expect(trip.slice(2, 6)).toEqual([L.rooms.antenna, L.rooms.radio, L.rooms.baseband, L.rooms.fibre].map(tower.centre));
    const at = (t: number) => tower.parcelAt(t, false, trip);
    const stages = Array.from({ length: 70 }, (_, i) => at((i / 70) * tower.PERIOD));
    expect([...new Set(stages.map((s) => s.stage))]).toEqual(['in', 'inside', 'out']);
    const wrap = stages.findIndex((s) => s.wrapped);
    expect(stages[wrap].stage).toBe('inside');
    expect(stages.slice(wrap).every((s) => s.wrapped)).toBe(true);
    expect(tower.parcelAt(9, true, trip)).toMatchObject({ stage: 'inside', alpha: 1, wrapped: true });
    expect(tower.formFor('radio')).toBe('wave');
    expect(tower.formFor('fibre')).toBe('light');
  });
});
