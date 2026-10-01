// The focus model (issue #53): the spots of a scene a keyboard or screen reader can be at, in the order stepping
// visits them, and what each one opens. The scene's keys (ui/SceneKeys), the text map (model/textmap) and the
// hints all read this one list, so "where you can be" is the same for the pointer, the keys and the list.
import type { Orient, Rect } from '../engine/geometry';
import { doorsOf, type Door } from './doors';
import { pathScene } from './layout';
import type { Route } from './resolve';
import { diveRuns, fitRectLocal, sceneRef, sideways, stopRectLocal } from './tree';

export type SpotKind = 'scene' | 'node' | 'group' | 'link';
export interface Spot {
  /** The stop it is (null: the whole scene, before the first stop). */
  stop: string | null;
  kind: SpotKind;
  /** What it opens: a device's or link's dive, a group's own path, the start device's swap (a stretch of links that is
   *  one dive opens it from each of its links). The whole scene opens nothing itself: its stops do. */
  doors: Door[];
  /** What Enter does: the first door (open up, else look inside, else change), or nothing. */
  primary: Door | null;
  /** What the camera frames there, in the scene's own coordinates. */
  rect: Rect;
}

const ORDER: Record<Door['kind'], number> = { expand: 0, dive: 1, swap: 2 };
const memo = new WeakMap<Route, Map<string, Spot[]>>();

/** A scene's spots: the whole scene first, then (path scenes) every stop in stepping order. A dive is one spot: its
 *  neighbours are other scenes, reached by stepping. */
export function spotsOf(r: Route, path: string[], o: Orient): Spot[] {
  let m = memo.get(r);
  if (!m) memo.set(r, (m = new Map()));
  const k = `${path.join('/')}|${o}`;
  const hit = m.get(k);
  if (hit) return hit;
  const ref = sceneRef(r, path, o)!;
  const out: Spot[] = [{ stop: null, kind: 'scene', doors: [], primary: null, rect: fitRectLocal(ref, o) }];
  if (ref.kind === 'path') {
    const ps = pathScene(r, ref.group, o);
    // the badges' spots don't matter here, only which doors there are
    const doors = doorsOf(ps, ref.group === null, diveRuns(r, ref.group, o).byLink, o, () => 0);
    for (const stop of sideways(r, path, null, o).steps) {
      const n = ps.nodes.find((x) => x.id === stop);
      const own = doors.filter((d) => d.id === stop || d.links.includes(stop)).sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
      out.push({ stop, kind: n ? (n.kind === 'group' ? 'group' : 'node') : 'link', doors: own, primary: own[0] ?? null, rect: stopRectLocal(ps, stop)! });
    }
  }
  m.set(k, out);
  return out;
}
