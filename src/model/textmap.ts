// The text map (issue #53): the whole scene tree of a route as nested lists, for the list view. Each path scene lists
// its stops in stepping order (model/focus), and under each stop the scenes it opens: its own dive, a group's path,
// the dive of a stretch of links, the layers the hop reads. Structure only: the list view fills in the words.
import type { Orient } from '../engine/geometry';
import { spotsOf, type Spot } from './focus';
import type { Route } from './resolve';
import { childrenOf, sceneRef, type Child } from './tree';

export interface MapScene {
  path: string[];
  /** How its parent opens it (null: the root). */
  via: Child['kind'] | null;
  /** Path scenes: every stop, in stepping order. Dives have none. */
  stops: MapStop[];
}
export interface MapStop { spot: Spot; scenes: MapScene[] }

const memo = new WeakMap<Route, Map<Orient, MapScene>>();

/** The map of a route: the root scene, every scene below it once, under the stop that opens it. */
export function mapOf(r: Route, o: Orient): MapScene {
  let m = memo.get(r);
  if (!m) memo.set(r, (m = new Map()));
  let hit = m.get(o);
  if (!hit) m.set(o, (hit = sceneOf(r, [], null, o)));
  return hit;
}

function sceneOf(r: Route, path: string[], via: Child['kind'] | null, o: Orient): MapScene {
  const ref = sceneRef(r, path, o)!;
  const stops = spotsOf(r, path, o).filter((s) => s.stop !== null).map((spot): MapStop => ({ spot, scenes: [] }));
  const at = new Map(stops.map((s) => [s.spot.stop, s]));
  for (const c of childrenOf(r, ref, o)) {
    const next = [...path, c.step];
    // a layer dive hangs under the hop that reads it; the rest under the stop that is their step
    const owner = c.kind === 'layer' ? sceneRef(r, next, o)!.at!.hop : c.step;
    at.get(owner)!.scenes.push(sceneOf(r, next, c.kind, o));
  }
  return { path, via, stops };
}
