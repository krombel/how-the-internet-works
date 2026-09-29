// Dive scenes (content/scenes/<id>/Scene.svelte) load on demand, one chunk each: a flight into a dive takes long enough
// to fetch it, and the peek panel preloads the layer dives it offers. Reactive, so a scene appears once it's loaded.
import type { Component } from 'svelte';
import type { Subject } from './ctx';

type DiveView = Component<{ subject: Subject }>;
const loaders = Object.fromEntries(Object.entries(import.meta.glob<{ default: unknown }>('/content/scenes/*/Scene.svelte')).map(([p, l]) => [p.split('/')[3], l]));
let views = $state.raw<Record<string, DiveView>>({});
const loading = new Map<string, Promise<void>>();
let pending = 0;

export function loadDive(id: string): Promise<void> {
  let p = loading.get(id);
  if (!p && loaders[id]) {
    pending++;
    p = loaders[id]()
      .then((m) => { views = { ...views, [id]: m.default as DiveView }; })
      .catch(() => { loading.delete(id); }) // offline: try again next time
      .finally(() => { pending--; });
    loading.set(id, p);
  }
  return p ?? Promise.resolve();
}

/** A dive scene's component, or null while it loads (asking for it starts the load). */
export function diveView(id: string): DiveView | null {
  if (!views[id]) void loadDive(id);
  return views[id] ?? null;
}

/** Some dive is still loading (the screenshot script waits for it). */
export const divesLoading = () => pending > 0;
