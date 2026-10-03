import { describe, expect, it } from 'vitest';
import { livePackets, specsFor } from '../engine/packets';
import { pathScene } from './layout';
import { resolveRoute } from './resolve';
import { bottleneck, formatBytes, formatDuration, formatRate, formatTimes, howLong, paceOf, PACE, slowFor, transferSecs } from './speed';

const at = (place: string) => resolveRoute({ activity: 'watch-video', places: [place] });
const PLACES = ['home', 'on-the-go', 'desk', 'home-dsl', 'on-the-go-2010', 'desk-2010', 'home-dialup'];

describe('how long it takes (#59)', () => {
  it('finds each route’s slowest link, each way', () => {
    const slowest = (place: string) => { const r = at(place), d = bottleneck(r, 'down'), u = bottleneck(r, 'up'); return [d.tech.id, d.rate.down, u.tech.id, u.rate.up]; };
    expect(slowest('home')).toEqual(['wifi', 500e6, 'wifi', 500e6]);
    expect(slowest('on-the-go')).toEqual(['nr', 300e6, 'nr', 50e6]);
    // a 2010 home: the copper line, not its own Wi‑Fi (a link's rate overrides its technology's)
    expect(slowest('home-dsl')).toEqual(['vdsl', 20e6, 'vdsl', 2e6]);
    expect(at('home-dsl').links.find((l) => l.tech.id === 'wifi')!.rate).toEqual({ down: 50e6, up: 50e6 });
    expect(slowest('on-the-go-2010')).toEqual(['hspa', 2e6, 'hspa', 1e6]);
    expect(slowest('home-dialup')).toEqual(['dialup', 28_800, 'dialup', 28_800]);
  });

  it('says how long the thing the reader waits for takes, and today’s thing at the same speed (like with like)', () => {
    expect(transferSecs(40_000, 28_800)).toBeCloseTo(11.1, 1);
    const dialup = howLong(at('home-dialup'))!;
    expect([dialup.bytes, dialup.plays, Math.round(dialup.secs)]).toEqual([40_000, undefined, 11]);
    expect(dialup.now.bytes).toBe(100e6);
    expect(dialup.now.secs / 3600).toBeCloseTo(7.7, 1);
    const dsl = howLong(at('home-dsl'))!;
    expect([dsl.bytes, dsl.plays, dsl.secs]).toEqual([17e6, 180, 6.8]);
    const home = howLong(at('home'))!;
    expect([home.bytes, home.secs, home.now]).toEqual([100e6, 1.6, { bytes: 100e6, secs: 1.6 }]);
    // every video comes faster than it plays, or "N times faster" would be wrong
    for (const p of PLACES) { const h = howLong(at(p))!; if (h.plays) expect(h.plays / h.secs, p).toBeGreaterThan(2); }
  });

  it('formats times, rates, sizes and ratios for people, in each language', () => {
    expect(formatDuration(11.1, 'en', 1)).toBe('10 seconds');
    expect(formatDuration(11.1, 'en', 2)).toBe('11 seconds');
    expect(formatDuration(1.6, 'en', 2)).toBe('1.6 seconds');
    expect(formatDuration(400, 'en', 1)).toBe('7 minutes');
    expect(formatDuration(27_778, 'en', 2)).toBe('7.7 hours');
    expect(formatDuration(27_778, 'da', 2)).toBe('7,7 timer');
    expect(formatDuration(68, 'en', 2)).toBe('68 seconds');
    expect(formatDuration(68, 'da', 1)).toBe('70 sekunder');
    expect(formatDuration(120, 'da', 1)).toBe('2 minutter');
    expect(formatRate(28_800, 'en')).toBe('28.8\u00a0kbit/s');
    expect(formatRate(28_800, 'da')).toBe('28,8\u00a0kbit/s');
    expect(formatRate(20e6, 'en')).toBe('20\u00a0Mbit/s');
    expect(formatRate(1e9, 'en')).toBe('1\u00a0Gbit/s');
    expect(formatBytes(40_000, 'en')).toBe('40 kB');
    expect(formatBytes(17e6, 'da')).toBe('17 MB');
    expect(formatTimes(112.5, 'en', 1)).toBe('100');
    expect(formatTimes(112.5, 'en', 2)).toBe('110');
  });

  it('slows the parcels gently on a slow route: fast today, medium in 2010, slow on 1995’s modem', () => {
    expect([slowFor(1e9), slowFor(100e6), slowFor(20e6), slowFor(1e6), slowFor(28_800)]).toEqual([1, 1, 1.6, 1.6, 2.5]);
    expect(PACE.at(-1)!.slow).toBeLessThanOrEqual(3);
    expect(PLACES.map((p) => paceOf(at(p)))).toEqual([1, 1, 1, 1.6, 1.6, 1.6, 2.5]);
  });

  it('stretches every parcel’s trip and spacing alike, so as many are on their way at once', () => {
    const r = at('home-dialup'), ps = pathScene(r, null, 'landscape'), slow = paceOf(r);
    const plain = specsFor(ps, r.activity.flows), slowed = specsFor(ps, r.activity.flows, slow);
    expect(slowed.map((s) => [s.duration, s.every, s.offset])).toEqual(plain.map((s) => [s.duration * slow, s.every * slow, s.offset * slow]));
    expect(specsFor(ps, r.activity.flows, slow)).toBe(slowed);
    const ids = (specs: typeof plain, t: number) => livePackets(specs, ps.links, t, 'x').map((p) => p.id);
    for (const t of [3, 7.5, 12, 40]) expect(ids(slowed, t * slow)).toEqual(ids(plain, t));
  });
});
