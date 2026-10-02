// Art that loads on demand, one chunk each, reactive so it appears once loaded; until then nothing is drawn.
// - Dive scenes (content/scenes/<id>/Scene.svelte): a flight into a dive takes long enough to fetch one, and the peek
//   panel preloads the layer dives it offers.
// - The era flavour (#59): an era's props and parcel touch (content/eras/<id>/art/Props.svelte and Packet.svelte),
//   the first time a route of that era is drawn or when the time machine's panel chooses it. Decoration needs no
//   placeholder.
import type { Component } from 'svelte';
import type { Subject } from './ctx';
import type { EraParcelProps, EraPropsProps } from './theme-types';

let pending = 0;

/** A keyed set of chunks: `load` fetches one once (again after a failure: offline, try next time), `get` gives it or
 *  null while it loads (asking starts the load) or if there's none by that id. */
function lazy<T>(loaders: Record<string, () => Promise<T>>) {
  let got = $state.raw<Record<string, T>>({});
  const loading = new Map<string, Promise<void>>();
  const load = (id: string): Promise<void> => {
    let p = loading.get(id);
    if (!p && loaders[id]) {
      pending++;
      p = loaders[id]()
        .then((v) => { got = { ...got, [id]: v }; })
        .catch(() => { loading.delete(id); })
        .finally(() => { pending--; });
      loading.set(id, p);
    }
    return p ?? Promise.resolve();
  };
  return { load, get: (id: string): T | null => { if (!got[id]) void load(id); return got[id] ?? null; } };
}

const scenes = lazy(Object.fromEntries(Object.entries(import.meta.glob<{ default: Component<{ subject: Subject }> }>('/content/scenes/*/Scene.svelte'))
  .map(([p, l]) => [p.split('/')[3], () => l().then((m) => m.default)])));
export const loadDive = scenes.load;
/** A dive scene's component, or null while it loads. */
export const diveView = scenes.get;

export interface EraArt { Props?: Component<EraPropsProps>; Packet?: Component<EraParcelProps> }
const eraFiles: Record<string, [string, () => Promise<{ default: unknown }>][]> = {};
for (const [p, l] of Object.entries(import.meta.glob<{ default: unknown }>('/content/eras/*/art/{Props,Packet}.svelte'))) {
  const [, , , era, , file] = p.split('/');
  (eraFiles[era] ??= []).push([file.replace('.svelte', ''), l]);
}
const eras = lazy(Object.fromEntries(Object.entries(eraFiles).map(([era, files]) =>
  [era, () => Promise.all(files.map(([, l]) => l())).then((ms): EraArt => Object.fromEntries(ms.map((m, i) => [files[i][0], m.default])))])));
export const loadEra = eras.load;
/** An era's art, or null while it loads or if it has none. */
export const eraArt = eras.get;

/** Some art is still loading (the screenshot script waits for it). */
export const artLoading = () => pending > 0;
