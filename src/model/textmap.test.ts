import { describe, expect, it } from 'vitest';
import { spotsOf } from './focus';
import { content } from './registry';
import { resolveRoute } from './resolve';
import { mapOf, type MapScene } from './textmap';
import { childrenOf, sceneRef } from './tree';

const home = resolveRoute({ activity: 'watch-video', places: ['home'] });
const all = (s: MapScene): MapScene[] => [s, ...s.stops.flatMap((st) => st.scenes.flatMap(all))];
const routes = () =>
  Object.keys(content.activities).flatMap((activity) => Object.keys(content.places).map((place) => resolveRoute({ activity, places: [place] })));

describe('text map', () => {
  it('hangs each scene under the stop that opens it', () => {
    const m = mapOf(home, 'landscape');
    expect(m).toMatchObject({ path: [], via: null });
    const under = (stop: string) => m.stops.find((s) => s.spot.stop === stop)!.scenes.map((c) => `${c.via}:${c.path.join('/')}`);
    // a device with no dive of its own still has the layers it reads
    expect(under('ap').length).toBeGreaterThan(0);
    expect(under('ap').every((s) => s.startsWith('layer:ap~'))).toBe(true);
    expect(under('phone-ap')).toEqual(['dive:phone-ap']);
    expect(under('router-internet')).toEqual(['dive:router-internet']);
    expect(under('internet')).toEqual(['expand:internet']);
    // a device's own dive first, then the layers it reads, bottom of the stack first
    expect(under('router')[0]).toBe('dive:router');
    expect(under('router').slice(1).every((s) => s.startsWith('layer:router~'))).toBe(true);
    // a stretch of links that is one dive hangs under its first link only
    const inside = m.stops.find((s) => s.spot.stop === 'internet')!.scenes[0];
    expect(inside.stops.find((s) => s.spot.stop === 'cabinet-backhaul')!.scenes.map((c) => c.path.at(-1))).toEqual(['cabinet-backhaul']);
    expect(inside.stops.find((s) => s.spot.stop === 'backhaul-bng')!.scenes).toEqual([]);
    // the backbone and the undersea cable are a dive each, side by side (#39)
    expect(inside.stops.find((s) => s.spot.stop === 'bng-core')!.scenes.map((c) => `${c.via}:${c.path.join('/')}`)).toEqual(['dive:internet/bng-core']);
    expect(inside.stops.find((s) => s.spot.stop === 'core-border')!.scenes.map((c) => `${c.via}:${c.path.join('/')}`)).toEqual(['dive:internet/core-border']);
  });

  it('has every scene of every route exactly once, in both orientations, and each one resolves', () => {
    for (const r of routes())
      for (const o of ['landscape', 'portrait'] as const) {
        const scenes = all(mapOf(r, o)), keys = scenes.map((s) => s.path.join('/'));
        expect(new Set(keys).size, `${r.key} ${o}`).toBe(keys.length);
        const tree: string[] = [];
        const walk = (path: string[]): void => {
          tree.push(path.join('/'));
          for (const c of childrenOf(r, sceneRef(r, path, o)!, o)) walk([...path, c.step]);
        };
        walk([]);
        expect(new Set(keys), `${r.key} ${o}`).toEqual(new Set(tree));
        for (const s of scenes) {
          const ref = sceneRef(r, s.path, o)!;
          expect(s.stops.map((st) => st.spot), `${r.key} /${s.path.join('/')}`).toEqual(spotsOf(r, s.path, o).slice(1));
          expect(s.via ?? 'root').toBe(ref.path.length ? childrenOf(r, sceneRef(r, s.path.slice(0, -1), o)!, o).find((c) => c.step === s.path.at(-1))!.kind : 'root');
        }
      }
  });
});
