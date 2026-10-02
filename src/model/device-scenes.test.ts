// The maths of the device dives' scenes (#9). They reach the engine through `$core/api`, which reads the browser's
// state on import, hence the stubs and the late imports.
import { beforeAll, describe, expect, it } from 'vitest';
import { WORLD_SIZE, type Pt } from '../engine/geometry';
import { stubBrowser } from '../test/stub-browser';
import type * as Router from '../../content/scenes/router-inside/router';
import type * as Tower from '../../content/scenes/tower-inside/tower';
import type * as Server from '../../content/scenes/server-inside/server';
import type * as Fabric from '../../content/scenes/leaf-spine/fabric';
import type { Box } from '../../content/scenes/router-inside/types';
import type { Moving } from '../../content/scenes/server-inside/types';

let router: typeof Router, tower: typeof Tower, server: typeof Server, fabric: typeof Fabric;
beforeAll(async () => {
  stubBrowser();
  router = await import('../../content/scenes/router-inside/router');
  tower = await import('../../content/scenes/tower-inside/tower');
  server = await import('../../content/scenes/server-inside/server');
  fabric = await import('../../content/scenes/leaf-spine/fabric');
});

const inside = (a: Box, b: Box) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const apart = (a: Box, b: Box) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
const ptInside = (p: Pt, b: Box) => p.x >= b.x && p.y >= b.y && p.x <= b.x + b.w && p.y <= b.y + b.h;

describe('inside the home router', () => {
  it('lays its rooms out in the box, apart, and the box in the world', () => {
    for (const [o, compact] of [['landscape', false], ['portrait', false], ['landscape', true]] as const) {
      const L = router.routerLayout(o, compact), W = WORLD_SIZE[o], rooms = Object.values(L.rooms);
      expect(inside(L.case, { x: 0, y: 0, ...W })).toBe(true);
      for (const [i, r] of rooms.entries()) {
        expect(inside(r, L.case)).toBe(true);
        for (const q of rooms.slice(i + 1)) expect(apart(r, q)).toBe(true);
      }
    }
  });

  it('takes a parcel in and out by the rooms its links need, through the brain', () => {
    const L = router.routerLayout('landscape');
    const trip = router.tripPath(L, 'switch', 'ont');
    expect([trip[0], trip.at(-1)]).toEqual([L.inNode, L.outNode]);
    expect(trip.slice(2, 5)).toEqual([router.centre(L.rooms.switch), router.centre(L.rooms.brain), router.centre(L.rooms.ont)]);
    // in at the socket side facing the device before, out of the side facing the one after
    expect(trip[1]).toEqual({ x: L.rooms.switch.x, y: router.centre(L.rooms.switch).y });
    expect(trip[5]).toEqual({ x: L.rooms.ont.x + L.rooms.ont.w, y: router.centre(L.rooms.ont).y });
    // over the air: by the antennas
    expect(router.tripPath(L, 'wifi', 'ont')[2]).toEqual(router.centre(L.rooms.wifi));
  });

  it('picks the rooms by technology: a home cable at the sockets, the line out at the ONT, the modem or the WAN port', () => {
    const t = (id: string, look: 'radio' | 'cable' | 'fibre') => ({ id, look });
    expect(router.roomFor(t('wifi', 'radio'), 'in')).toBe('wifi');
    expect(router.roomFor(t('ethernet', 'cable'), 'in')).toBe('switch');
    expect(router.roomFor(t('ethernet', 'cable'), 'out')).toBe('ont');
    expect(router.roomFor(t('gpon', 'fibre'), 'out')).toBe('ont');
    expect(router.roomFor(t('vdsl', 'cable'), 'out')).toBe('ont');
    expect(['gpon', 'vdsl', 'ethernet'].map((id) => router.uplinkOf(t(id, id === 'gpon' ? 'fibre' : 'cable')))).toEqual(['ont', 'modem', 'wan']);
  });

  it('carries a parcel in, through the brain (which swaps its sender) and out, once a period', () => {
    const trip = router.tripPath(router.routerLayout('portrait'), 'switch', 'ont');
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
    for (const [o, compact] of [['landscape', false], ['portrait', false], ['landscape', true]] as const) {
      const L = tower.towerLayout(o, compact), W = WORLD_SIZE[o], rooms = Object.values(L.rooms);
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

describe('inside the video server', () => {
  it('lays its rooms out in the case, apart, and everything in the world', () => {
    for (const [o, compact] of [['landscape', false], ['portrait', false], ['landscape', true]] as const) {
      const L = server.serverLayout(o, compact), W = { x: 0, y: 0, ...WORLD_SIZE[o] }, rooms = Object.values(L.rooms);
      expect(inside(L.case, W)).toBe(true);
      expect(ptInside(L.inNode, W)).toBe(true);
      expect(ptInside(L.originNode, W)).toBe(true);
      for (const [i, r] of rooms.entries()) {
        expect(inside(r, L.case)).toBe(true);
        for (const q of rooms.slice(i + 1)) expect(apart(r, q)).toBe(true);
      }
    }
  });

  it('routes a request from the rack switch to the app, then cache or origin back to the reader', () => {
    const L = server.serverLayout('landscape');
    expect(server.requestPath(L).at(0)).toEqual(L.inNode);
    expect(server.requestPath(L).at(-1)).toEqual(server.appPoint(L));
    expect(server.hitPath(L).at(0)).toEqual(server.cachePoint(L));
    expect(server.hitPath(L).at(-1)).toEqual(L.inNode);
    expect(server.originPath(L)).toEqual([server.appPoint(L), L.originNode]);
    expect(server.missReturnPath(L).at(0)).toEqual(L.originNode);
    expect(server.missReturnPath(L).at(-1)).toEqual(L.inNode);
  });

  it('alternates hit then miss cycles; still pose is a hit at the app', () => {
    const L = server.serverLayout('landscape');
    const hit = server.serverAt(server.PERIOD * 0.2, false, L, true);
    expect(hit.hit).toBe(true);
    expect(hit.request.stage).toBe('in');
    const miss = server.serverAt(server.PERIOD * 1.34, false, L, true);
    expect(miss.hit).toBe(false);
    expect(['origin', 'hidden']).toContain(miss.request.stage);
    expect(server.serverAt(server.PERIOD * 1.34, false, L, false).hit).toBe(true);
    const still = server.serverAt(123, true, L, true);
    expect(still.hit).toBe(true);
    expect(still.request).toMatchObject({ stage: 'app', alpha: 1 });
    expect(still.request.p.x).toBeCloseTo(server.appPoint(L).x);
    expect(still.request.p.y).toBeCloseTo(server.appPoint(L).y);
  });

  it('shows the hit or miss card only once the request reaches the app, and clears it before the next', () => {
    const L = server.serverLayout('landscape');
    const card = (t: number) => server.serverAt(t * server.PERIOD, false, L, true).statusAlpha;
    for (const c of [0, 1]) {
      expect(card(c + 0.1)).toBe(0);
      expect(card(c + 0.6)).toBe(1);
      expect(card(c + 0.99)).toBe(0);
    }
  });

  it('keeps moving carriers inside the authored world', () => {
    const carriers = <S extends string>(m: Moving<S>[]) => m.filter((p) => p.alpha > 0.02);
    for (const [o, compact] of [['landscape', false], ['portrait', false], ['landscape', true]] as const) {
      const L = server.serverLayout(o, compact), W = { x: 0, y: 0, ...WORLD_SIZE[o] };
      for (const hasOrigin of [true, false]) for (let i = 0; i < 120; i++) {
        const s = server.serverAt((i / 60) * server.PERIOD, false, L, hasOrigin);
        for (const c of carriers([s.request, s.video])) expect(ptInside(c.p, W)).toBe(true);
      }
    }
  });
});

function allBoxes(L: ReturnType<typeof fabric.fabricLayout>) {
  return [...fabric.SPINES.map((i) => fabric.spineBox(L, i)), ...fabric.LEAVES.map((l) => L.leafBoxes[l]), L.sticker];
}

describe('leaf-spine fabric scene maths', () => {
  it('lays the fabric out inside the world without overlapping in landscape, portrait and compact', () => {
    for (const [o, compact] of [['landscape', false], ['portrait', false], ['landscape', true]] as const) {
      const L = fabric.fabricLayout(o, compact), W = { x: 0, y: 0, ...WORLD_SIZE[o] };
      for (const b of allBoxes(L)) expect(inside(b, W)).toBe(true);
      for (const [i, b] of allBoxes(L).entries()) for (const q of allBoxes(L).slice(i + 1)) expect(apart(b, q)).toBe(true);
      for (const p of [L.inPort, L.outPort, L.fabricTag, ...L.spines, ...fabric.LEAVES.map((l) => L.leaves[l])]) expect(ptInside(p, W)).toBe(true);
    }
  });

  it('draws every leaf to every spine and highlights only this flow spine on the route leaves', () => {
    const L = fabric.fabricLayout('landscape'), links = fabric.fabricLinks(L);
    expect(links).toHaveLength(fabric.LEAVES.length * fabric.SPINES.length);
    for (const leaf of fabric.LEAVES) expect(new Set(links.filter((l) => l.leaf === leaf).map((l) => l.spine))).toEqual(new Set(fabric.SPINES));
    expect(links.filter((l) => l.highlighted).map((l) => [l.leaf, l.spine])).toEqual([['before', fabric.HIGHLIGHT_SPINE], ['after', fabric.HIGHLIGHT_SPINE]]);
  });

  it('keeps your parcel on the highlighted spine every period', () => {
    const L = fabric.fabricLayout('landscape'), path = fabric.tripPath(L);
    expect(path).toContainEqual(fabric.spinePort(L, fabric.HIGHLIGHT_SPINE));
    expect(path).not.toContainEqual(fabric.spinePort(L, 0));
    expect(path).not.toContainEqual(fabric.spinePort(L, 1));
    expect(path).not.toContainEqual(fabric.spinePort(L, 3));
    const at = (t: number) => fabric.parcelAt(t, false, L);
    expect(at(0)).toMatchObject({ from: 'before', to: 'after', spine: fabric.HIGHLIGHT_SPINE, stage: 'in', alpha: 0 });
    expect(at(fabric.PERIOD * 0.5)).toMatchObject({ from: 'before', to: 'after', spine: fabric.HIGHLIGHT_SPINE, stage: 'fabric', alpha: 1 });
    expect(at(fabric.PERIOD * 0.95)).toMatchObject({ spine: fabric.HIGHLIGHT_SPINE, stage: 'out' });
    expect(at(fabric.PERIOD * 1.35).p.x).toBeCloseTo(at(fabric.PERIOD * 0.35).p.x);
    expect(at(fabric.PERIOD * 1.35).p.y).toBeCloseTo(at(fabric.PERIOD * 0.35).p.y);
  });

  it('spreads other flows over every spine during the period', () => {
    const L = fabric.fabricLayout('portrait');
    const used = new Set(fabric.OTHER_FLOWS.map((f) => f.spine));
    for (let i = 0; i < 60; i++) for (const spec of fabric.OTHER_FLOWS) used.add(fabric.otherFlowAt((i / 60) * fabric.PERIOD, false, L, spec).spine);
    expect(used).toEqual(new Set(fabric.SPINES));
  });

  it('has a stable still pose inside the world', () => {
    const L = fabric.fabricLayout('landscape'), W = { x: 0, y: 0, ...WORLD_SIZE.landscape };
    const a = fabric.parcelAt(0, true, L), b = fabric.parcelAt(123, true, L);
    expect(a).toMatchObject({ stage: 'fabric', alpha: 1, spine: fabric.HIGHLIGHT_SPINE });
    expect(a.p.x).toBeCloseTo(b.p.x);
    expect(a.p.y).toBeCloseTo(b.p.y);
    expect(ptInside(a.p, W)).toBe(true);
    for (const spec of fabric.OTHER_FLOWS) {
      const f0 = fabric.otherFlowAt(0, true, L, spec), f1 = fabric.otherFlowAt(123, true, L, spec);
      expect(f0.p.x).toBeCloseTo(f1.p.x);
      expect(f0.p.y).toBeCloseTo(f1.p.y);
      expect(ptInside(f0.p, W)).toBe(true);
    }
  });
});
