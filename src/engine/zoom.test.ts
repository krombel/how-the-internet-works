import { describe, expect, it } from 'vitest';
import { content } from '../model/registry';
import { resolveRoute } from '../model/resolve';
import { areaCentre, fit, toWorldPt, travelInterpolator, type Viewport } from './camera';
import { DIVE_RIM, camFor, decide, keyOf, mixes, sceneInfo, travelK } from './zoom';
import { chainAt, chainNear, chainOf, childrenOf, toLocal, toRoot, travelOf } from '../model/tree';
import { pathScene } from '../model/layout';
import type { Route } from '../model/resolve';

const home = resolveRoute({ activity: 'watch-video', places: ['home'] });
const vp: Viewport = { w: 1440, h: 900, top: 0, bottom: 0 };
const pvp: Viewport = { w: 390, h: 844, top: 0, bottom: 0 };
const at = (path: string[]) => fit(sceneInfo(home, path, 'landscape').fit, vp);

describe('dives on a phone on its side (issue #33)', () => {
  const svp: Viewport = { w: 844, h: 390, top: 60, bottom: 69 };
  it('fill the height between the bars, running under their edges only by the rim, clear of the side buttons', () => {
    for (const path of [['phone-ap'], ['router~ip'], ['internet', 'olt~ethernet']]) {
      const r = sceneInfo(home, path, 'landscape').fit, cam = camFor(home, path, null, svp, 'landscape');
      const sx = (x: number) => x * cam.k + cam.x, sy = (y: number) => y * cam.k + cam.y;
      expect(cam.k).toBeGreaterThan(fit(r, svp).k * 1.15);
      expect(sx(r.x)).toBeGreaterThanOrEqual(DIVE_RIM.side - 1e-6);
      expect(sx(r.x + r.w)).toBeLessThanOrEqual(svp.w - DIVE_RIM.side + 1e-6);
      expect(sy(r.y + r.h * DIVE_RIM.top)).toBeGreaterThanOrEqual(svp.top - 1e-6);
      expect(sy(r.y + r.h * (1 - DIVE_RIM.bottom))).toBeLessThanOrEqual(svp.h - svp.bottom + 1e-6);
      expect(sx(r.x + r.w / 2)).toBeCloseTo(svp.w / 2);
    }
  });

  it('leave path scenes and other screens as they were', () => {
    expect(camFor(home, [], null, svp, 'landscape')).toEqual(fit(sceneInfo(home, [], 'landscape').fit, svp));
    expect(camFor(home, ['phone-ap'], null, vp, 'landscape')).toEqual(at(['phone-ap']));
  });
});

describe('layer dives in the zoom', () => {
  it('only draws a layer dive when it is on the path', () => {
    const cam = at(['router~ip']);
    expect(mixes(cam, vp, home, [[]], 'landscape').has('router~ip')).toBe(false);
    const m = mixes(cam, vp, home, [['router~ip']], 'landscape');
    expect(m.get('router~ip')).toBeCloseTo(1);
    expect(m.get('')).toBeLessThan(0.05);
  });

  it('hides the link dives beside a layer dive, which would crowd its panel', () => {
    const path = ['internet', 'olt~ethernet'], cam = at(path);
    const m = mixes(cam, vp, home, [path], 'landscape');
    expect(m.get('internet/olt~ethernet')).toBeCloseTo(1);
    expect(m.has('internet/home-cabinet') || m.has('internet/olt-bng')).toBe(false);
  });

  it('draws a layer dive whose stack reaches past the edge of its scene', () => {
    const path = ['internet', 'olt~gpon'], cam = fit(sceneInfo(home, path, 'portrait').fit, pvp);
    const scene = sceneInfo(home, ['internet'], 'portrait').fit, dive = sceneInfo(home, path, 'portrait').fit;
    expect(dive.y).toBeGreaterThan(scene.y + scene.h);
    expect(mixes(cam, pvp, home, [path], 'portrait').get('internet/olt~gpon')).toBeCloseTo(1);
    expect(decide(cam, pvp, home, path, 'portrait')).toBeNull();
  });

  it('never pinches into one, but pinches out of one', () => {
    expect(decide(at(['router~ip']), vp, home, [], 'landscape')).toBeNull();
    expect(decide(at([]), vp, home, ['router~ip'], 'landscape')).toEqual([]);
    expect(decide(at(['phone-ap']), vp, home, [], 'landscape')).toEqual(['phone-ap']);
  });
});

describe('device dives in the zoom', () => {
  it('pinches into a device\'s dive, and not from a stop on it', () => {
    for (const [o, v] of [['landscape', vp], ['portrait', pvp]] as const) {
      expect(decide(fit(sceneInfo(home, ['router'], o).fit, v), v, home, [], o)).toEqual(['router']);
      // standing at the router: its dive stays shut until pinched further in
      const stop = camFor(home, [], 'router', v, o);
      expect(decide(stop, v, home, [], o)).toBeNull();
      expect(mixes(stop, v, home, [[]], o).get('router') ?? 0).toBe(0);
    }
  });

  it('shows one panel at a time between a device\'s dive and the link dive beside it, whichever path it is on', () => {
    for (const [o, v] of [['landscape', vp], ['portrait', pvp]] as const) {
      const a = fit(sceneInfo(home, ['ap-router'], o).fit, v), b = fit(sceneInfo(home, ['router'], o).fit, v);
      for (const t of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
        const cam = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, k: a.k + (b.k - a.k) * t };
        const [near, far] = t < 0.5 ? ['ap-router', 'router'] : ['router', 'ap-router'];
        for (const paths of [[['router']], [['ap-router']]]) {
          const m = mixes(cam, v, home, paths, o);
          expect(m.get(near)).toBeCloseTo(1);
          expect(m.get(far) ?? 0).toBeLessThan(0.01);
        }
      }
    }
  });
});

describe('dives whose panels overlap (#136)', () => {
  it('show one panel at a time: in a dive, a sibling dive drawn over part of it stays hidden', () => {
    const over = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    let seen = 0;
    for (const place of Object.keys(content.places))
      for (const [o, v] of [['landscape', vp], ['portrait', pvp]] as const) {
        const r = resolveRoute({ activity: 'watch-video', places: [place] });
        const walk = (path: string[]) => {
          const kids = childrenOf(r, sceneInfo(r, path, o).ref, o).filter((c) => c.kind !== 'layer');
          for (const c of kids) {
            const p = [...path, c.step], f = sceneInfo(r, p, o).fit, m = mixes(camFor(r, p, null, v, o), v, r, [p], o);
            expect(m.get(keyOf(p)), `${place} ${o} ${keyOf(p)}`).toBeCloseTo(1);
            for (const d of kids)
              if (d !== c && d.kind === 'dive' && over(f, sceneInfo(r, [...path, d.step], o).fit)) {
                seen++;
                expect(m.get(keyOf([...path, d.step])) ?? 0, `${place} ${o} ${keyOf(p)} under ${d.step}`).toBeLessThan(0.01);
              }
            if (c.kind === 'expand') walk(p);
          }
        };
        walk([]);
      }
    // the fibre to the building's two backhaul links on a phone, at least
    expect(seen).toBeGreaterThan(0);
  });
});

describe('sideways travel in the zoom', () => {
  it('glides over the path scene with no dive showing, and lands in the next dive', () => {
    for (const [o, v, from, to] of [
      ['landscape', vp, ['phone-ap'], ['router-internet']],
      ['portrait', pvp, ['internet', 'olt-bng'], ['internet', 'core-border']],
      // into a stretch through the splitter, whose dive sits at its middle
      ['landscape', vp, ['internet', 'olt-bng'], ['internet', 'home-cabinet']],
      // past a device with a dive of its own, which stays shut; and into one
      ['landscape', vp, ['ap-router'], ['router-internet']],
      ['portrait', pvp, ['ap-router'], ['router']],
    ] as const) {
      const tv = travelOf(home, [...from], [...to], o)!, info = sceneInfo(home, tv.parent, o), ch = chainOf(home, info.ref.group, o);
      const kT = travelK(home, tv.parent, [...to], v, o), a = fit(sceneInfo(home, [...from], o).fit, v), b = fit(sceneInfo(home, [...to], o).fit, v);
      // it sets off from where the camera is on the chain: the midpoint of the link we're in
      const c = areaCentre(v), s0 = chainNear(ch, toLocal(info.frame, toWorldPt(a, c.x, c.y)));
      expect(s0).toBeCloseTo(ch.items.find((x) => x.id === from[from.length - 1])!.s, 3);
      const f = travelInterpolator(a, b, (u) => toRoot(info.frame, chainAt(ch, s0 + (tv.b - s0) * u)), Math.abs(tv.b - s0) * info.frame.s, kT, v);
      let gliding = 0;
      for (let i = 0; i <= 50; i++) {
        const cam = f(i / 50);
        if (cam.k > kT * 1.08) continue;
        gliding++;
        const m = mixes(cam, v, home, [[...to], [...from]], o);
        expect(m.get(tv.parent.join('/'))).toBeCloseTo(1);
        for (const [k, alpha] of m) if (k.split('/').length > tv.parent.length && k !== '' && k !== tv.parent.join('/')) expect(alpha).toBe(0);
      }
      expect(gliding).toBeGreaterThan(5);
      expect(mixes(f(1), v, home, [[...to]], o).get(to.join('/'))).toBeCloseTo(1);
    }
  });
});

describe('no previews of what is inside on a phone (#90)', () => {
  const phones: [Viewport, 'portrait' | 'landscape'][] = [[{ w: 390, h: 844, top: 110, bottom: 280 }, 'portrait'], [{ w: 844, h: 390, top: 60, bottom: 69 }, 'landscape']];
  const places = ['home', 'on-the-go', 'desk', 'home-dsl', 'home-fttb', 'home-dialup'];
  /** Every path scene of a route, with its children. */
  const walk = (r: Route, o: 'portrait' | 'landscape', path: string[] = []): string[][] =>
    [path, ...childrenOf(r, sceneInfo(r, path, o).ref, o).filter((c) => c.kind === 'expand').flatMap((c) => walk(r, o, [...path, c.step]))];

  it('at a stop, nothing of the groups and dives below shows through', () => {
    for (const place of places) {
      const r = resolveRoute({ activity: 'watch-video', places: [place] });
      for (const [v, o] of phones)
        for (const path of walk(r, o))
          for (const stop of pathScene(r, sceneInfo(r, path, o).ref.group, o).stops) {
            const m = mixes(camFor(r, path, stop, v, o), v, r, [path], o);
            const below = [...m].filter(([k, a]) => k.startsWith(path.length ? `${keyOf(path)}/` : '') && k !== keyOf(path) && a > 0.001);
            expect(below, `${place} ${keyOf(path)}@${stop}`).toEqual([]);
            expect(m.get(keyOf(path))).toBeCloseTo(1);
          }
    }
  });

  it('pinching on in still fades a child in, and lands on it whole', () => {
    const [v, o] = phones[0], path = ['internet'], s = sceneInfo(home, ['internet', 'ixp'], o);
    const stop = camFor(home, path, 'ixp', v, o), dive = fit(s.fit, v), mid = areaCentre(v);
    // from the stop's zoom to the dive's, centred on the dive
    const cam = (t: number) => {
      const k = stop.k * (dive.k / stop.k) ** t;
      return { k, x: mid.x - (s.fit.x + s.fit.w / 2) * k, y: mid.y - (s.fit.y + s.fit.h / 2) * k };
    };
    const at = (t: number) => mixes(cam(t), v, home, [path], o).get('internet/ixp') ?? 0;
    expect(at(0)).toBe(0);
    expect(at(0.5)).toBeGreaterThan(0.05);
    expect(at(1)).toBeCloseTo(1);
    expect(decide(cam(1), v, home, path, o)).toEqual(['internet', 'ixp']);
  });

  it('leaves a desktop as it was', () => {
    const m = mixes(camFor(home, ['internet'], 'core', vp, 'landscape'), { ...vp, top: 80, bottom: 260 }, home, [['internet']], 'landscape');
    expect([...m.keys()].some((k) => k.startsWith('internet/') && m.get(k)! > 0.01)).toBe(true);
  });
});
