import { describe, expect, it } from 'vitest';
import { TRAVEL, isShort, travelInterpolator, viewportFor, type Cam, type Viewport } from './camera';

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

  it('is snappy: overlapping legs, a glide clamped by distance', () => {
    const near = travelInterpolator(a, b, along, 1000, kT, vp).duration;
    expect(near).toBeLessThan(TRAVEL.outMs + TRAVEL.maxGlideMs + TRAVEL.inMs);
    expect(near).toBeGreaterThan(TRAVEL.outMs);
    const far = travelInterpolator(a, camAt(1e5, 0, 4), (u) => ({ x: u * 1e5, y: 0 }), 1e5, kT, vp).duration;
    expect(far).toBeLessThan(TRAVEL.outMs * 1.3 + TRAVEL.maxGlideMs + TRAVEL.inMs * 1.3);
  });

  it('carries on at the speed it was going when a step comes mid-glide', () => {
    const mid = camAt(400, 0, kT);
    const still = travelInterpolator(mid, b, (u) => ({ x: 400 + u * 600, y: 0 }), 600, kT, vp);
    const going = travelInterpolator(mid, b, (u) => ({ x: 400 + u * 600, y: 0 }), 600, kT, vp, 2);
    // already at the travel zoom: no zoom-out leg to speak of, and it doesn't stop to start again
    expect(going.pos(0.05)).toBeGreaterThan(still.pos(0.05) * 2);
    expect(going(0).x).toBeCloseTo(mid.x);
    expect(going(1).x).toBeCloseTo(b.x);
  });
});
