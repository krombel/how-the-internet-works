// The one module Svelte content (node art, dive scenes, layers, place backdrops, themes) imports, as `$core/api`.
// Keeping content on this surface is what lets the engine change underneath it. (Data files use `$core/define`.)
export type { Level, Orient } from './define';
export type { Pt } from './engine/geometry';
export type { LayerCtx } from './model/stack';
export type { Subject } from './render/ctx';
export type * from './render/theme-types';

export { pts, textBox } from './engine/svg';
export { fakeMac } from './model/stack';
export { defineTheme } from './render/art-base';
export { fill, nameOf, view, yours } from './state.svelte';

export { default as Depth } from './render/Depth.svelte';
export { default as Node } from './render/Node.svelte';
export { default as TagAt } from './render/TagAt.svelte';
export { default as Text } from './render/Text.svelte';
export { default as Envelope } from './ui/Envelope.svelte';

import { trl } from './state.svelte';
import type { Level } from './define';
/** Strings of one content item: `const L = strings('layer.ip')` then `L('from')` (level-aware, English fallback). */
export const strings = (prefix: string) => (key: string, level?: Level) => trl(`${prefix}.${key}`, level);
