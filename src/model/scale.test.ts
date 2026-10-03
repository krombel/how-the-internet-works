// Issue #20: whose networks the packets pass through (owner regions), and how far they go (the links' km).
import { describe, expect, it } from 'vitest';
import { resolveRoute, within } from './resolve';
import { pathScene } from './layout';
import { hull, regionsOf, roundPath } from './regions';
import { FIBRE_KM_PER_MS, formatKm, formatLight, groupKm, kmTo, lightMs, ownersOf, tripKm } from './trip';

const home = resolveRoute({ activity: 'watch-video', places: ['home'] });
const street = resolveRoute({ activity: 'watch-video', places: ['street'] });

describe('owners', () => {
  it('lists the networks on the way in route order, side branches last', () => {
    expect(ownersOf(home)).toEqual(['isp', 'ixp', 'cdn']);
    expect(ownersOf(home, true)).toEqual(['isp', 'ixp', 'cdn', 'transit', 'cloud']);
    expect(ownersOf(street, false, 'internet')).toEqual(['isp', 'ixp', 'cdn']);
  });

  it('draws one region per owner inside the internet, with a stable tone and the side branch set apart', () => {
    for (const o of ['landscape', 'portrait'] as const) {
      const ps = pathScene(home, 'internet', o), regions = regionsOf(home, ps);
      expect(regions.map((g) => [g.owner, g.tone, g.aside])).toEqual([['isp', 0, false], ['ixp', 1, false], ['cdn', 2, false], ['transit', 3, true]]);
      expect(regions.find((g) => g.owner === 'isp')!.nodes).toEqual(['cabinet', 'olt', 'bng', 'core', 'border']);
      // the layout's sign spot is where the sign goes
      expect(regions.find((g) => g.owner === 'isp')!.sign).toEqual(ps.signs.isp);
      expect(regionsOf(home, ps)).toBe(regions);
      // a group inside it is in its owner's region; unfolded, it has the owner's region and the side branch's
      expect(regions.find((g) => g.owner === 'cdn')!.nodes).toEqual(['datacentre']);
      expect(regionsOf(home, pathScene(home, 'datacentre', o)).map((g) => [g.owner, g.aside])).toEqual([['cdn', false], ['cloud', true]]);
    }
  });

  it('leaves entries and exits out: they stand for something else', () => {
    const top = pathScene(home, null, 'landscape');
    expect(regionsOf(home, top)).toEqual([]);
  });
});

describe('region outlines', () => {
  it('wraps points in a convex hull, dropping the ones inside', () => {
    const sq = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 5, y: 5 }, { x: 5, y: 0 }];
    const h = hull(sq);
    expect(h).toHaveLength(4);
    expect(h).toEqual(expect.arrayContaining([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]));
  });

  it('rounds a polygon into a closed path of curves through its edge midpoints', () => {
    const d = roundPath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]);
    expect(d).toBe('M5.0 5.0 Q0.0 0.0 5.0 0.0 Q10.0 0.0 10.0 5.0 Q10.0 10.0 5.0 5.0 Z');
  });
});

describe('trip scale', () => {
  it('measures every link on every route', () => {
    for (const place of ['home', 'desk', 'street']) {
      const r = resolveRoute({ activity: 'watch-video', places: [place] });
      expect(r.links.filter((l) => !(l.km! > 0)).map((l) => l.id)).toEqual([]);
    }
  });

  it('adds up km along the chain', () => {
    const i = home.chain.findIndex((h) => h.id === 'core');
    expect(kmTo(home, 0)).toBe(0);
    expect(kmTo(home, i)).toBeCloseTo(home.links.slice(0, i).reduce((s, l) => s + l.km!, 0));
    expect(tripKm(home)).toBeCloseTo(home.links.reduce((s, l) => s + l.km!, 0));
    expect(tripKm(home)).toBeGreaterThan(kmTo(home, i));
  });

  it('counts the links into and out of a group as part of it', () => {
    // a group inside it (the data centre) is part of it too
    const inner = home.links.filter((l) => within(home.hops, home.hops[l.from], 'internet') || within(home.hops, home.hops[l.to], 'internet'));
    expect(groupKm(home, 'internet')).toBeCloseTo(inner.reduce((s, l) => s + l.km!, 0));
    expect(groupKm(home, 'internet')).toBeLessThan(tripKm(home));
  });

  it('times light in fibre', () => {
    expect(lightMs(FIBRE_KM_PER_MS)).toBe(1);
    expect(formatLight(64, 'en')).toBe('320 μs');
    expect(formatLight(1000, 'da')).toBe('5 ms');
  });

  it('formats distances for people: metres, then one decimal, then whole km', () => {
    expect(formatKm(0.005, 'en')).toBe('5 m');
    expect(formatKm(0.3, 'en')).toBe('300 m');
    expect(formatKm(6.54, 'da')).toBe('6,5 km');
    expect(formatKm(64.5, 'en')).toBe('65 km');
  });
});
