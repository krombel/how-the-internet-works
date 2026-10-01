// Content discovery: every folder under /content is found with import.meta.glob, so adding a folder adds content.
// This module only loads data (definition files + strings), never Svelte components (see components.ts), so it
// also runs in tests.
import type { ActivityDef, LayerDef, NodeDef, OwnerDef, PlaceDef, SceneDef, SegmentDef, TechDef } from '../define';

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
};

const byOrder = <T extends { id: string; order?: number }>(list: T[]) =>
  list.sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.id.localeCompare(b.id));
export const placeIds = (c: Content = content) => byOrder(Object.values(c.places)).map((p) => p.id);
export const activityIds = (c: Content = content) => byOrder(Object.values(c.activities)).map((a) => a.id);
