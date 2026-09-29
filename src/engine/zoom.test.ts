import { describe, expect, it } from 'vitest';
import { resolveRoute } from '../model/resolve';
import { fit, type Viewport } from './camera';
import { decide, mixes, sceneInfo } from './zoom';

const home = resolveRoute({ activity: 'watch-video', places: ['home'] });
const vp: Viewport = { w: 1440, h: 900, top: 0, bottom: 0 };
const at = (path: string[]) => fit(sceneInfo(home, path, 'landscape').fit, vp);

describe('layer dives in the zoom', () => {
  it('only draws a layer dive when it is on the path', () => {
    const cam = at(['router~ip']);
    expect(mixes(cam, vp, home, [[]], 'landscape').has('router~ip')).toBe(false);
    const m = mixes(cam, vp, home, [['router~ip']], 'landscape');
    expect(m.get('router~ip')).toBeCloseTo(1);
    expect(m.get('')).toBeLessThan(0.05);
  });

  it('never pinches into one, but pinches out of one', () => {
    expect(decide(at(['router~ip']), vp, home, [], 'landscape')).toBeNull();
    expect(decide(at([]), vp, home, ['router~ip'], 'landscape')).toEqual([]);
    expect(decide(at(['phone-ap']), vp, home, [], 'landscape')).toEqual(['phone-ap']);
  });
});
