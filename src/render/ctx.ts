// Per-render contexts: the World (its camera) and the scene being drawn (its place in the scene tree and its frame in
// root coordinates), so text can clamp to a readable on-screen size and backdrop layers can do depth parallax.
import { getContext, setContext } from 'svelte';
import type { Cam } from '../engine/camera';
import type { SLink } from '../model/layout';
import type { Link, Route } from '../model/resolve';
import type { LayerCtx } from '../model/stack';
import type { Frame } from '../model/tree';

/** A scene of the tree that is drawn this frame (key = its path joined by "/"). */
export interface Mounted { key: string; path: string[]; alpha: number }

export interface WorldCtx { readonly cam: Cam }
export interface SceneCtx {
  readonly path: string[];
  /** Local point p → root (x + p.x·s, y + p.y·s). */
  readonly frame: Frame;
  /** The camera zoom (in root units) at which this scene fills the screen. */
  readonly fitK: number;
}
/** What a link dive explains: the link it was opened from, as drawn in its parent and in the route. Scenes use it to
 *  adapt (e.g. the fibre dive shows GPON's up/down colours on the access fibre). */
export interface LinkSubject {
  kind: 'link';
  /** The underlying route link (its technology, stack, ends). */
  link: Link;
  /** The link as drawn in the parent scene (for a collapsed group this is the link entering it). */
  sceneLink: SLink;
  route: Route;
}
/** What a layer dive explains: one layer as one hop sees it (`ctx.to`, with its `role`), e.g. IP at a NAT or TCP
 *  sealed at a router. The same context the layer's envelope gets in the peek panel. */
export interface LayerSubject {
  kind: 'layer';
  layer: string;
  ctx: LayerCtx;
  /** Whether this hop opens the layer (else it only sees it sealed). */
  open: boolean;
  route: Route;
}
export type Subject = LinkSubject | LayerSubject;

/** Set by the peek panel: which envelopes open a layer dive at the hop reading the packet, and how to go there. */
export interface PeekDives {
  can(layer: string): boolean;
  /** `env` is the envelope's element (it grows into the dive). */
  open(layer: string, env: HTMLElement): void;
}

export const setWorld = (w: WorldCtx) => setContext('world', w);
export const getWorld = () => getContext<WorldCtx>('world');
export const setScene = (s: SceneCtx) => setContext('scene', s);
export const getScene = () => getContext<SceneCtx>('scene');
export const setPeekDives = (d: PeekDives) => setContext('peek-dives', d);
export const getPeekDives = () => getContext<PeekDives | undefined>('peek-dives');
