// The Svelte side of content discovery (kept apart from registry.ts so the data model also runs in tests):
// node art, layer envelopes and place backdrops, found by folder. Dive scenes load on demand (render/dives.svelte.ts).
import type { Component, Snippet } from 'svelte';
import type { LayerCtx } from './stack';
import type { PlaceBackdropProps } from '../render/theme-types';

type Mod<P extends Record<string, any>> = { default: Component<P>; face?: [number, number]; hollow?: string };
const byFolder = <P extends Record<string, any>>(mods: Record<string, Mod<P>>) => Object.fromEntries(Object.entries(mods).map(([p, m]) => [p.split('/')[3], m]));

/** content/nodes/<id>/art/Device.svelte (a 200×200 body; `export const face = [x, y]` in <script module>, and for a
 *  group node optionally `hollow`, the outline of the body a theme may see through to show what's inside). */
export const nodeArt = byFolder(import.meta.glob<Mod<{ time: number }>>('/content/nodes/*/art/Device.svelte', { eager: true }));
export type LayerView = Component<{ ctx: LayerCtx; open: boolean; depth: number; children?: Snippet }>;
export const layerViews = Object.fromEntries(Object.entries(byFolder(import.meta.glob<Mod<never>>('/content/layers/*/Layer.svelte', { eager: true }))).map(([k, m]) => [k, m.default as unknown as LayerView]));
/** content/places/<id>/art/Backdrop.svelte: drawn over the theme's sky in the root path scene. */
export type PlaceBackdrop = Component<PlaceBackdropProps>;
export const placeBackdrops = Object.fromEntries(Object.entries(byFolder(import.meta.glob<Mod<never>>('/content/places/*/art/Backdrop.svelte', { eager: true }))).map(([k, m]) => [k, m.default as unknown as PlaceBackdrop]));
