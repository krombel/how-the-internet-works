import { describe, expect, it } from 'vitest';
import { doorsOf } from './doors';
import { spotsOf } from './focus';
import { pathScene } from './layout';
import { content } from './registry';
import { resolveRoute } from './resolve';
import { childrenOf, diveRuns, fitRectLocal, sceneRef, sideways } from './tree';

const home = resolveRoute({ activity: 'watch-video', places: ['home'] });
const list = (spots: ReturnType<typeof spotsOf>) => spots.map((s) => `${s.kind}:${s.stop ?? '-'}:${s.primary ? `${s.primary.kind}>${s.primary.id}` : ''}`);
const routes = () =>
  Object.keys(content.activities).flatMap((activity) => Object.keys(content.places).map((place) => resolveRoute({ activity, places: [place] })));

describe('focus', () => {
  it('lists the whole scene, then every stop in stepping order, with what Enter opens', () => {
    expect(list(spotsOf(home, [], 'landscape'))).toEqual([
      'scene:-:', 'node:phone:swap>phone', 'link:phone-ap:dive>phone-ap', 'node:ap:', 'link:ap-router:dive>ap-router',
      'node:router:dive>router', 'link:router-internet:dive>router-internet', 'group:internet:expand>internet',
    ]);
    // a stretch of same-technology links is one dive, and each of its links opens it
    const inside = spotsOf(home, ['internet'], 'landscape');
    expect(inside.filter((s) => s.stop === 'cabinet-backhaul' || s.stop === 'backhaul-bng').map((s) => s.primary?.id)).toEqual(['cabinet-backhaul', 'cabinet-backhaul']);
    // a dive is one spot: the whole scene
    expect(list(spotsOf(home, ['router'], 'landscape'))).toEqual(['scene:-:']);
  });

  it('is the same list stepping walks, everywhere, and every door is at a spot', () => {
    for (const r of routes())
      for (const o of ['landscape', 'portrait'] as const) {
        const walk = (path: string[]): void => {
          const ref = sceneRef(r, path, o)!, spots = spotsOf(r, path, o), where = `${r.key} /${path.join('/')} ${o}`;
          expect(spots[0], where).toMatchObject({ stop: null, kind: 'scene', doors: [], primary: null, rect: fitRectLocal(ref, o) });
          if (ref.kind !== 'path') {
            expect(spots.length, where).toBe(1);
            return;
          }
          expect(spots.slice(1).map((s) => s.stop), where).toEqual(sideways(r, path, null, o).steps);
          const doors = doorsOf(pathScene(r, ref.group, o), ref.group === null, diveRuns(r, ref.group, o).byLink, o, () => 0);
          const at = spots.flatMap((s) => s.doors.map((d) => `${d.kind}:${d.id}`));
          expect(new Set(at), where).toEqual(new Set(doors.map((d) => `${d.kind}:${d.id}`)));
          for (const s of spots.slice(1)) {
            expect(s.rect.w, where).toBeGreaterThan(0);
            expect(s.primary, where).toBe(s.doors[0] ?? null);
          }
          for (const c of childrenOf(r, ref, o)) walk([...path, c.step]);
        };
        walk([]);
      }
  });
});
