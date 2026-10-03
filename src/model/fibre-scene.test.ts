import { describe, expect, it } from 'vitest';
import { boostersOf, breaksOf, fadeAt, haulOf, kmAt, modeOf, oneColour, stretchKm, wordsOf } from '../../content/scenes/fibre-light/light';
import { CABLE_W, SEA, cable, cablePulses, seaHaul, shark, water } from '../../content/scenes/fibre-light/sea';
import { content } from './registry';
import { resolveRoute } from './resolve';
import { runOf, sceneRef } from './tree';

const close = (xs: number[], ys: number[]) => {
  expect(xs).toHaveLength(ys.length);
  xs.forEach((x, i) => expect(x).toBeCloseTo(ys[i]));
};

describe('long-haul fibre (#42)', () => {
  it('cuts a thread into as many spans as its length needs, each fading as far as it is long', () => {
    const far = haulOf(240, 80, 330, 1270);
    close(boostersOf(far), [643.33, 956.67]);
    close(breaksOf(far), [486.67, 800, 1113.33]);
    expect(far.fade).toBeCloseTo(0.7);
    // too short for a booster: one span, and the light only fades a little
    const short = haulOf(25, 80, 330, 1270);
    expect(boostersOf(short)).toEqual([]);
    close(breaksOf(short), [800]);
    expect(short.fade).toBeCloseTo((0.7 * 25) / 80);
    expect(boostersOf(haulOf(81, 80, 0, 100))).toHaveLength(1);
    // an ocean is drawn as a handful of spans, not hundreds
    expect(boostersOf(haulOf(6000, 80, 0, 100))).toHaveLength(5);
  });

  it('fades through each span and is bright again after each booster', () => {
    const h = haulOf(180, 60, 0, 900);
    expect(fadeAt(h, -5)).toBe(0);
    expect(fadeAt(h, 299)).toBeCloseTo(h.fade, 1);
    expect(fadeAt(h, 301)).toBeLessThan(0.01);
    expect(fadeAt(h, 2000)).toBe(h.fade);
  });

  it("counts the lead flash's kilometres along the whole stretch", () => {
    const h = haulOf(180, 60, 0, 900);
    expect(kmAt(h, -1)).toBe(0);
    expect(kmAt(h, 450)).toBe(90);
    expect(kmAt(h, 2000)).toBe(180);
    expect(stretchKm([{ km: 6 }, { km: 18 }, {}])).toBe(24);
  });

  it('measures the stretch a dive stands for, from the route', () => {
    const home = resolveRoute({ activity: 'watch-video', places: ['home'] });
    const run = (step: string) => runOf(home, sceneRef(home, ['internet', step], 'landscape')!, 'landscape').map((l) => l.link);
    // the PON runs from the house through the splitter to the OLT
    expect(run('home-cabinet').map((l) => l.id)).toEqual(['router-cabinet', 'cabinet-olt']);
    expect(stretchKm(run('home-cabinet'))).toBe(7.2);
    expect(run('bng-core').map((l) => l.tech.id)).toEqual(['backbone']);
  });
});

describe('before DWDM (1995)', () => {
  it('lights the backbone and the sea cable with one colour each, in their own words', () => {
    expect(modeOf('atm')).toBe('long-haul');
    expect(modeOf('submarine-sdh')).toBe('submarine');
    expect([oneColour('atm'), oneColour('submarine-sdh'), oneColour('backbone'), oneColour('submarine')]).toEqual([true, true, false, false]);
    expect([wordsOf('atm', 'backbone'), wordsOf('backbone', 'backbone'), wordsOf('submarine-sdh', 'submarine')]).toEqual(['atm', 'backbone', 'submarine-sdh']);
  });
});

describe('undersea cable (#39)', () => {
  it('is on every way to the video, its own fibre-light mode, with repeaters to match its length', () => {
    expect(modeOf('submarine')).toBe('submarine');
    expect(modeOf('backbone')).toBe('long-haul');
    for (const place of Object.keys(content.places)) {
      const r = resolveRoute({ activity: 'watch-video', places: [place] });
      const sea = r.links.filter((l) => modeOf(l.tech.id) === 'submarine');
      expect(sea, place).toHaveLength(1);
      // today's 180 km cable has a repeater every 60 km; 1995's CANTAT-3 is drawn as the most spans a haul gets
      const repeaters = r.era === '1995' ? 5 : 2;
      for (const o of ['landscape', 'portrait'] as const) {
        const run = runOf(r, sceneRef(r, ['internet', sea[0].id], o)!, o).map((l) => l.link);
        expect(run.map((l) => l.id)).toEqual([sea[0].id]);
        expect(boostersOf(seaHaul(SEA[o], stretchKm(run)))).toHaveLength(repeaters);
      }
    }
  });

  it('lays the cable from station to station, down the slopes and along the floor', () => {
    for (const o of ['landscape', 'portrait'] as const) {
      const s = SEA[o], c = cable(s);
      expect(c[0].x).toBeGreaterThan(s.stations[0].x);
      expect(c.at(-1)!.x).toBeLessThan(s.stations[1].x);
      expect(c.every((p) => p.x >= 0 && p.x <= s.w && p.y >= s.land && p.y <= s.floor)).toBe(true);
      // it lies on the floor across the sea, where the repeaters sit
      const floor = c.filter((p) => p.y === s.floor - CABLE_W / 2);
      expect(floor).toHaveLength(2);
      for (const x of boostersOf(seaHaul(s, 180))) expect(x > floor[0].x && x < floor[1].x).toBe(true);
      // the water fills the sea from the surface down to the floor, between the shores
      const w = water(s);
      expect(Math.min(...w.map((p) => p.y))).toBe(s.surface);
      expect(Math.max(...w.map((p) => p.y))).toBe(s.floor);
      expect(w.every((p) => p.x > s.shore[0] && p.x < s.shore[1])).toBe(true);
    }
  });

  it('keeps the landing stations inside the panel frame, and on a phone fills the panel down to the floor (#136)', () => {
    // a station is 144 × 132 at size 1; the panel's frame is drawn over the outer 20 units
    for (const o of ['landscape', 'portrait'] as const) {
      const s = SEA[o];
      for (const st of s.stations) {
        expect(st.x - 72 * s.stationSize, o).toBeGreaterThanOrEqual(20);
        expect(st.x + 72 * s.stationSize, o).toBeLessThanOrEqual(s.w - 20);
        expect(st.y - 132 * s.stationSize, o).toBeGreaterThanOrEqual(20);
      }
      // each station stands on dry land, clear of its shore
      expect(s.stations[0].x + 72 * s.stationSize).toBeLessThan(s.shore[0]);
      expect(s.stations[1].x - 72 * s.stationSize).toBeGreaterThan(s.shore[1]);
      expect(s.slice.y + s.slice.r).toBeLessThan(s.floor - CABLE_W);
    }
    // a tall panel's sea reaches past two thirds of it, not leaving its lower half bare soil
    expect(SEA.portrait.floor).toBeGreaterThan(SEA.portrait.h * 0.7);
  });

  it('sends each colour across twice, and the shark keeps to its lane, facing the way it swims', () => {
    const c = cable(SEA.landscape), ps = cablePulses(1.5, c, 4);
    expect(ps).toHaveLength(8);
    expect([...new Set(ps.map((p) => p.channel))]).toEqual([0, 1, 2, 3]);
    let prev = shark(0, 300, 600, 340);
    for (let t = 0.1; t < 20; t += 0.1) {
      const f = shark(t, 300, 600, 340);
      expect(f.x).toBeGreaterThanOrEqual(300);
      expect(f.x).toBeLessThanOrEqual(600);
      if (Math.abs(f.x - prev.x) > 1 && f.left === prev.left) expect(f.x < prev.x).toBe(f.left);
      prev = f;
    }
  });
});
