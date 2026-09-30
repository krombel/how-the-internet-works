import { describe, expect, it } from 'vitest';
import { resolveRoute } from '../model/resolve';
import { areaCentre, fit, toWorldPt, travelInterpolator, type Viewport } from './camera';
import { DIVE_RIM, camFor, decide, mixes, sceneInfo, travelK } from './zoom';
import { chainAt, chainNear, chainOf, toLocal, toRoot, travelOf } from '../model/tree';

const home = resolveRoute({ activity: 'watch-video', places: ['home'] });
const vp: Viewport = { w: 1440, h: 900, top: 0, bottom: 0 };
const pvp: Viewport = { w: 390, h: 844, top: 0, bottom: 0 };
const at = (path: string[]) => fit(sceneInfo(home, path, 'landscape').fit, vp);

describe('dives on a phone on its side (issue #33)', () => {
  const svp: Viewport = { w: 844, h: 390, top: 60, bottom: 69 };
  it('fill the height between the bars, running under their edges only by the rim, clear of the side buttons', () => {
    for (const path of [['phone-ap'], ['router~ip'], ['internet', 'cabinet~ethernet']]) {
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
    const path = ['internet', 'cabinet~ethernet'], cam = at(path);
    const m = mixes(cam, vp, home, [path], 'landscape');
    expect(m.get('internet/cabinet~ethernet')).toBeCloseTo(1);
    expect(m.has('internet/home-cabinet') || m.has('internet/cabinet-backhaul')).toBe(false);
  });

  it('draws a layer dive whose stack reaches past the edge of its scene', () => {
    const path = ['internet', 'cabinet~gpon'], cam = fit(sceneInfo(home, path, 'portrait').fit, pvp);
    const scene = sceneInfo(home, ['internet'], 'portrait').fit, dive = sceneInfo(home, path, 'portrait').fit;
    expect(dive.y).toBeGreaterThan(scene.y + scene.h);
    expect(mixes(cam, pvp, home, [path], 'portrait').get('internet/cabinet~gpon')).toBeCloseTo(1);
    expect(decide(cam, pvp, home, path, 'portrait')).toBeNull();
  });

  it('never pinches into one, but pinches out of one', () => {
    expect(decide(at(['router~ip']), vp, home, [], 'landscape')).toBeNull();
    expect(decide(at([]), vp, home, ['router~ip'], 'landscape')).toEqual([]);
    expect(decide(at(['phone-ap']), vp, home, [], 'landscape')).toEqual(['phone-ap']);
  });
});

describe('sideways travel in the zoom', () => {
  it('glides over the path scene with no dive showing, and lands in the next dive', () => {
    for (const [o, v, from, to] of [
      ['landscape', vp, ['phone-ap'], ['router-internet']],
      ['portrait', pvp, ['internet', 'home-cabinet'], ['internet', 'bng-core']],
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
