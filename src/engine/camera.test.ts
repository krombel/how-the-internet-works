import { describe, expect, it } from 'vitest';
import { TRAVEL, isShort, slideCams, travelInterpolator, viewportFor, type Cam, type Viewport } from './camera';

const stage = (w: number, h: number) => ({ clientWidth: w, clientHeight: h }) as HTMLElement;

describe('viewport insets', () => {
  it('a phone on its side is short; portrait phones and desktops are not', () => {
    expect(isShort(844, 390)).toBe(true);
    expect(isShort(390, 844)).toBe(false);
    expect(isShort(1440, 900)).toBe(false);
  });

  it('leaves the scene most of the height on a short landscape screen', () => {
    const vp = viewportFor(stage(844, 390));
    expect(vp.h - vp.top - vp.bottom).toBeGreaterThan(390 * 0.7);
    expect(viewportFor(stage(844, 390), { top: 58, bottom: 70 })).toMatchObject({ top: 58, bottom: 70 });
  });

  it('keeps the phone and desktop minimums', () => {
    expect(viewportFor(stage(390, 844))).toMatchObject({ top: 64, bottom: 136 });
    expect(viewportFor(stage(1440, 900))).toMatchObject({ top: 72, bottom: 132 });
  });
});

describe('sideways travel', () => {
  const vp: Viewport = { w: 1000, h: 800, top: 0, bottom: 0 };
  const camAt = (x: number, y: number, k: number): Cam => ({ k, x: 500 - x * k, y: 400 - y * k });
  const centre = (m: Cam) => ({ x: (500 - m.x) / m.k, y: (400 - m.y) / m.k });
  // a straight path 0 → 1000 along y = 0; dives at each end are 4× deeper than the travel zoom
  const along = (u: number) => ({ x: u * 1000, y: 0 });
  const a = camAt(0, 0, 4), b = camAt(1000, 0, 4), kT = 1;
  const ts = Array.from({ length: 201 }, (_, i) => i / 200);

  it('starts and ends exactly on its cameras', () => {
    const f = travelInterpolator(a, b, along, 1000, kT, vp);
    for (const [t, m] of [[0, a], [1, b]] as const) {
      const c = f(t);
      expect(c.k).toBeCloseTo(m.k);
      expect(c.x).toBeCloseTo(m.x);
      expect(c.y).toBeCloseTo(m.y);
    }
  });

  it('zooms out to the travel zoom, glides along the path, and zooms in', () => {
    const f = travelInterpolator(a, b, along, 1000, kT, vp);
    const ks = ts.map((t) => f(t).k);
    expect(Math.min(...ks)).toBeCloseTo(kT);
    expect(Math.min(...ks)).toBeGreaterThanOrEqual(kT - 1e-9);
    // at the travel zoom the view centre is on the path, and it only ever moves forwards
    for (const t of ts) if (f(t).k < kT * 1.001) expect(Math.abs(centre(f(t)).y)).toBeLessThan(1e-6);
    for (let i = 1; i < ts.length; i++) expect(f.pos(ts[i])).toBeGreaterThanOrEqual(f.pos(ts[i - 1]));
    expect([f.pos(0), f.pos(1)]).toEqual([0, 1]);
  });

  it('glides slowly enough to follow: at least the minimum, longer past more devices, capped, a little quicker chained', () => {
    const glide = (o: Parameters<typeof travelInterpolator>[6] = {}, length = 1000) => {
      const f = travelInterpolator(a, camAt(length, 0, 4), (u) => ({ x: u * length, y: 0 }), length, kT, vp, o);
      // the time spent at the travel zoom, gliding
      return ts.filter((t) => f(t).k < kT * 1.001).length / (ts.length - 1) * f.duration;
    };
    const one = glide(), three = glide({ devices: 3 });
    expect(one).toBeGreaterThan(TRAVEL.minGlideMs * 0.5);
    expect(three).toBeGreaterThan(one + TRAVEL.perDeviceMs);
    expect(glide({}, 1e6)).toBeLessThan(TRAVEL.maxGlideMs);
    expect(glide({ devices: 3, chained: true })).toBeLessThan(three);
    const total = travelInterpolator(a, b, along, 1000, kT, vp).duration;
    expect(total).toBeGreaterThan(TRAVEL.minGlideMs);
    expect(total).toBeLessThan(TRAVEL.outMs * 1.3 + TRAVEL.maxGlideMs + TRAVEL.inMs * 1.3);
  });

  it('carries on at the speed it was going when a step comes mid-glide', () => {
    const mid = camAt(400, 0, kT);
    const still = travelInterpolator(mid, b, (u) => ({ x: 400 + u * 600, y: 0 }), 600, kT, vp);
    const going = travelInterpolator(mid, b, (u) => ({ x: 400 + u * 600, y: 0 }), 600, kT, vp, { v0: 2 });
    // already at the travel zoom: no zoom-out leg to speak of, and it doesn't stop to start again
    expect(going.pos(0.05)).toBeGreaterThan(still.pos(0.05) * 2);
    expect(going(0).x).toBeCloseTo(mid.x);
    expect(going(1).x).toBeCloseTo(b.x);
  });
});

describe('slide between rungs (#62)', () => {
  // two panels of a stack, of different scales and far apart in the root scene
  const fa = { x: 100, y: 200, s: 0.05 }, fb = { x: 900, y: -400, s: 0.02 };
  const panel = (c: Cam, f: typeof fa) => ({ x: c.x + f.x * c.k, y: c.y + f.y * c.k, s: c.k * f.s });
  const a: Cam = { k: 30, x: -2000, y: -5000 }, b: Cam = { k: 60, x: -53000, y: 24100 };

  it('keeps both scenes\' panels in one place on screen all along, from where the old one was to the new fit', () => {
    const at = slideCams(a, b, fa, fb);
    for (const e of [0, 0.25, 0.5, 0.75, 1]) {
      const { a: ca, b: cb } = at(e), pa = panel(ca, fa), pb = panel(cb, fb);
      for (const q of ['x', 'y', 's'] as const) expect(pa[q]).toBeCloseTo(pb[q], 6);
    }
    for (const q of ['x', 'y', 'k'] as const) {
      expect(at(0).a[q]).toBeCloseTo(a[q], 6);
      expect(at(1).b[q]).toBeCloseTo(b[q], 6);
    }
  });

  it('never zooms out on the way: the panel only eases from one size to the other', () => {
    const at = slideCams(a, b, fa, fb), s0 = panel(a, fa).s, s1 = panel(b, fb).s;
    for (let e = 0; e <= 1; e += 0.05) {
      const s = panel(at(e).b, fb).s;
      expect(s).toBeGreaterThanOrEqual(Math.min(s0, s1) - 1e-9);
      expect(s).toBeLessThanOrEqual(Math.max(s0, s1) + 1e-9);
    }
  });
});
