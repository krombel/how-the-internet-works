import { describe, expect, it } from 'vitest';
import { resolveRoute } from '../model/resolve';
import { fit, type Viewport } from './camera';
import { decide, mixes, sceneInfo } from './zoom';

const home = resolveRoute({ activity: 'watch-video', places: ['home'] });
const vp: Viewport = { w: 1440, h: 900, top: 0, bottom: 0 };
const pvp: Viewport = { w: 390, h: 844, top: 0, bottom: 0 };
const at = (path: string[]) => fit(sceneInfo(home, path, 'landscape').fit, vp);

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
