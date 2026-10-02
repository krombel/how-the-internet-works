// Art that loads on demand, one chunk each, reactive so it appears once loaded.
// - Device art and backdrops (#91): a node's art (content/nodes/<id>/art/Device.svelte), a place's backdrop
//   (content/places/<id>/art/Backdrop.svelte) and a group's (content/nodes/<id>/art/Backdrop.svelte). A route's all
//   load together when it is first shown (`loadRouteArt`: before the first paint for the start route, main.ts; on a
//   place switch; ahead of one when the picker or the time machine points at it), and anything drawn asks for its own.
//   Until a device's art is here the theme draws a small placeholder (`pending`); until a backdrop is, the theme's sky
//   and hills show.
// - Dive scenes (content/scenes/<id>/Scene.svelte): a flight into a dive takes long enough to fetch one, and the peek
//   panel preloads the layer dives it offers.
// - The era flavour (#59): an era's props and parcel touch (content/eras/<id>/art/Props.svelte and Packet.svelte),
//   the first time a route of that era is drawn or when the time machine's panel chooses it. Decoration needs no
//   placeholder.
import type { Component } from 'svelte';
import type { Route } from '../model/resolve';
import type { Subject } from './ctx';
import type { EraParcelProps, EraPropsProps, PlaceBackdropProps } from './theme-types';

let pending = 0;

/** A keyed set of chunks: `load` fetches one once (again after a failure: offline, try next time), `get` gives it or
 *  null while it loads (asking starts the load) or if there's none by that id (`has`). */
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
  return { load, has: (id: string) => id in loaders, get: (id: string): T | null => { if (!got[id]) void load(id); return got[id] ?? null; } };
}
/** content/<kind>/<id>/…: the loaders by id, each giving the module's default export. */
const byFolder = <T>(mods: Record<string, () => Promise<{ default: T }>>) =>
  Object.fromEntries(Object.entries(mods).map(([p, l]) => [p.split('/')[3], () => l().then((m) => m.default)]));

/** A node's art: a 200×200 body, and where a theme may put a face (`export const face = [x, y]` in <script module>). */
interface NodeArt { default: Component<{ time: number }>; face?: [number, number] }
const devices = lazy<NodeArt>(Object.fromEntries(Object.entries(import.meta.glob<NodeArt>('/content/nodes/*/art/Device.svelte'))
  .map(([p, l]) => [p.split('/')[3], l])));
/** A node's art for the theme's `Device`: `pending` while it loads (Art null), Art null too for a node without art. */
export const deviceArt = (id: string) => {
  const a = devices.get(id);
  return { Art: a?.default ?? null, face: a?.face ?? null, pending: !a && devices.has(id) };
};
/** Load these nodes' art (a dialog's pictures, before it opens). */
export const loadDevices = (ids: string[]) => Promise.all(ids.map(devices.load)).then(() => {});

type PlaceBackdrop = Component<PlaceBackdropProps>;
const places = lazy(byFolder(import.meta.glob<{ default: PlaceBackdrop }>('/content/places/*/art/Backdrop.svelte')));
const groups = lazy(byFolder(import.meta.glob<{ default: PlaceBackdrop }>('/content/nodes/*/art/Backdrop.svelte')));
/** A place's backdrop (drawn over the theme's sky in the root path scene), or null while it loads or if it has none. */
export const placeBackdrop = places.get;
/** A network node's own backdrop, drawn over the theme's in its unfolded scene (the hall of a data centre), or null. */
export const groupBackdrop = groups.get;

/** The art a route draws: every hop's device (inside groups and on side branches too) and each group's entry (the
 *  house you came from), its places' backdrops and its groups'. */
export function routeArt(route: Route) {
  const nodes = [...new Set([...Object.values(route.hops), ...Object.values(route.entry)].map((h) => h.node.id))];
  return { devices: nodes.filter(devices.has), places: route.slots.map((s) => s.place).filter(places.has), groups: nodes.filter(groups.has) };
}
/** Load all of a route's art; resolves when it's here (or failed: what's missing is asked for again when drawn). */
export function loadRouteArt(route: Route) {
  const a = routeArt(route);
  return Promise.all([...a.devices.map(devices.load), ...a.places.map(places.load), ...a.groups.map(groups.load)]).then(() => {});
}

const scenes = lazy(byFolder(import.meta.glob<{ default: Component<{ subject: Subject }> }>('/content/scenes/*/Scene.svelte')));
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
