// Content discovery: every folder under /content is found with import.meta.glob, so adding a folder adds content.
// This module only loads data (definition files + strings), never Svelte components (those load on demand,
// render/lazy.svelte.ts), so it also runs in tests.
import type { ActivityDef, EraDef, LayerDef, NodeDef, OwnerDef, PlaceDef, SceneDef, SegmentDef, TechDef } from '../define';

export type WithId<T> = T & { id: string; /** Source file, for error messages. */ file: string };

export interface Content {
  nodes: Record<string, WithId<NodeDef>>;
  owners: Record<string, WithId<OwnerDef>>;
  technologies: Record<string, WithId<TechDef>>;
  layers: Record<string, WithId<LayerDef>>;
  scenes: Record<string, WithId<SceneDef>>;
  segments: Record<string, WithId<SegmentDef>>;
  places: Record<string, WithId<PlaceDef>>;
  activities: Record<string, WithId<ActivityDef>>;
  eras: Record<string, WithId<EraDef>>;
}

/** '/content/nodes/phone/node.ts' → 'phone' (the folder name is the id). */
const folderId = (path: string) => path.split('/')[3];

function collect<T>(mods: Record<string, T>): Record<string, WithId<T>> {
  const out: Record<string, WithId<T>> = {};
  for (const [file, def] of Object.entries(mods)) {
    const id = folderId(file);
    out[id] = { ...def, id, file: file.slice(1) };
  }
  return out;
}

export const content: Content = {
  nodes: collect(import.meta.glob<NodeDef>('/content/nodes/*/node.ts', { eager: true, import: 'default' })),
  owners: collect(import.meta.glob<OwnerDef>('/content/owners/*/owner.ts', { eager: true, import: 'default' })),
  technologies: collect(import.meta.glob<TechDef>('/content/technologies/*/technology.ts', { eager: true, import: 'default' })),
  layers: collect(import.meta.glob<LayerDef>('/content/layers/*/layer.ts', { eager: true, import: 'default' })),
  scenes: collect(import.meta.glob<SceneDef>('/content/scenes/*/scene.ts', { eager: true, import: 'default' })),
  segments: collect(import.meta.glob<SegmentDef>('/content/segments/*/segment.ts', { eager: true, import: 'default' })),
  places: collect(import.meta.glob<PlaceDef>('/content/places/*/place.ts', { eager: true, import: 'default' })),
  activities: collect(import.meta.glob<ActivityDef>('/content/activities/*/activity.ts', { eager: true, import: 'default' })),
  eras: collect(import.meta.glob<EraDef>('/content/eras/*/era.ts', { eager: true, import: 'default' })),
};

const byOrder = <T extends { id: string; order?: number }>(list: T[]) =>
  list.sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.id.localeCompare(b.id));
export const placeIds = (c: Content = content) => byOrder(Object.values(c.places)).map((p) => p.id);
/** The place a place is a way of getting online from: itself, or the one it is a variant of. */
export const basePlace = (id: string, c: Content = content) => c.places[id]?.variantOf ?? id;
/** A place and its variants (its ways of getting online), in order, out of `among` (default: all places). */
export const placeFamily = (id: string, among?: string[], c: Content = content) =>
  (among ?? placeIds(c)).filter((p) => basePlace(p, c) === basePlace(id, c));
/** The activities to choose from: the bases (a variant of another era stands in for its base there, #59). */
export const activityIds = (c: Content = content) =>
  byOrder(Object.values(c.activities).filter((a) => a.variantOf === undefined)).map((a) => a.id);
/** A segment's or an activity's version for an era (#59): its variant of that era, or itself. */
export const inEra = <T extends { id: string; variantOf?: string; era?: string }>(all: Record<string, T>, id: string, era: string) =>
  Object.values(all).find((v) => v.variantOf === id && v.era === era) ?? all[id];
/** The newest era (today). */
export const nowEra = (c: Content = content) => Object.values(c.eras).reduce((a, b) => (b.year > a.year ? b : a)).id;
/** A place's era (#59). A place without one (the street, the desk) is today's. */
export const eraOf = (place: string, c: Content = content) => c.places[place]?.era ?? nowEra(c);
