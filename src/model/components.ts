// The Svelte side of content discovery (kept apart from registry.ts so the data model also runs in tests):
// node art and place and group backdrops, found by folder. Dive scenes load on demand (render/dives.svelte.ts).
import type { Component } from 'svelte';
import type { PlaceBackdropProps } from '../render/theme-types';

type Mod<P extends Record<string, any>> = { default: Component<P>; face?: [number, number] };
const byFolder = <P extends Record<string, any>>(mods: Record<string, Mod<P>>) => Object.fromEntries(Object.entries(mods).map(([p, m]) => [p.split('/')[3], m]));

/** content/nodes/<id>/art/Device.svelte (a 200×200 body; `export const face = [x, y]` in <script module>). */
export const nodeArt = byFolder(import.meta.glob<Mod<{ time: number }>>('/content/nodes/*/art/Device.svelte', { eager: true }));
/** content/places/<id>/art/Backdrop.svelte: drawn over the theme's sky in the root path scene. */
export type PlaceBackdrop = Component<PlaceBackdropProps>;
export const placeBackdrops = Object.fromEntries(Object.entries(byFolder(import.meta.glob<Mod<never>>('/content/places/*/art/Backdrop.svelte', { eager: true }))).map(([k, m]) => [k, m.default as unknown as PlaceBackdrop]));
/** content/nodes/<id>/art/Backdrop.svelte: a network node's own backdrop, drawn over the theme's in its unfolded scene
 *  (the hall of a data centre). */
export const groupBackdrops = Object.fromEntries(Object.entries(byFolder(import.meta.glob<Mod<never>>('/content/nodes/*/art/Backdrop.svelte', { eager: true }))).map(([k, m]) => [k, m.default as unknown as PlaceBackdrop]));
