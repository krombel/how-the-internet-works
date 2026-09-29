// The contract between the engine and a style/theme (art, tokens, motion, sound). A theme is a folder:
// content/themes/<id>/{meta.json, theme.ts, tokens.css, art/*.svelte, locales/<lang>.json}. meta.json
// ({ order, swatch }) is read eagerly for the style switcher; everything else loads on demand. A theme overrides any
// subset of the art slots below; the rest fall back to src/render/art-base. Slots only draw engine things (sky, links
// by look, packets, hints, labels…): devices, places and dives bring their own art in their content folders.
import type { Component } from 'svelte';
import type { Orient } from '../define';
import type { Curve } from '../engine/geometry';
import type { MotionPreset } from '../engine/motion';
import type { Pose } from '../engine/packets';
import type { Timbre } from '../engine/sound';

/** Everything is in the coordinates of the scene being drawn (1600×900 or 900×1600). */
export interface BackdropProps { kind: 'root' | 'group'; orient: Orient; w: number; h: number; time: number }
/** Props of a place's own backdrop (content/places/<id>/art/Backdrop.svelte), drawn over the theme's root backdrop. */
export interface PlaceBackdropProps { orient: Orient; w: number; h: number; time: number }
/** A node's own art (content/nodes/<id>/art/Device.svelte) draws its body in a 200×200 box; the theme's Device
 *  slot places it, adds a face at `face` (if the theme draws faces), a focus ring, and a fallback when there's no art. */
export interface DeviceProps {
  id: string; x: number; y: number; size: number; time: number;
  Art: Component<{ time: number }> | null;
  face: [number, number] | null;
  /** 'path' = in a path scene; 'dive' = drawn big inside a dive scene. */
  context: 'path' | 'dive';
  focused: boolean;
}
/** Links are drawn by their technology's look. */
type LinkLook = 'radio' | 'cable' | 'fibre' | 'trunk';
export interface LinkProps { look: LinkLook; d: string; curve: Curve; colour: string; dashed: boolean; time: number; focused: boolean }
export interface PacketProps {
  kind: string; pose: Pose; colour: string; time: number;
  /** The user is following this packet (draw a reticle / highlight). */
  followed: boolean;
}
/** Tap affordances: 'dive' = look inside, 'expand' = more hops, 'swap' = choose where you are / what you do. */
export interface HintProps { kind: 'dive' | 'expand' | 'swap'; x: number; y: number; time: number }
/** Nerd-mode callout. `size` is the font size in scene units (already clamped to a readable screen size). */
export interface TagProps { x: number; y: number; text: string; size: number; anchor: 'start' | 'middle' | 'end'; time: number }
/** Scene labels. The engine computes `size` (clamped to a minimum screen size); themes style via CSS or override. */
export interface LabelProps { x: number; y: number; text: string; size: number; kind: 'node' | 'link' | 'big' | 'small'; colour?: string; anchor?: 'start' | 'middle' | 'end' }
/** Background ('back') and frame ('edge') of a nested scene (w×h of its own world): a group's path scene, a link dive
 *  or a layer dive (which the peek panel draws as an envelope; `sealed` when the hop can't open that layer). */
export interface PanelProps { part: 'back' | 'edge'; kind: 'path' | 'dive' | 'layer'; sealed: boolean; w: number; h: number; orient: Orient; time: number }
/** Screen-space overlay (outside the camera: rasterised once, not per zoom frame). */
export interface OverlayProps { w: number; h: number; time: number }

export interface ArtSlots {
  Defs: Component<Record<string, never>>;
  Backdrop: Component<BackdropProps>;
  Device: Component<DeviceProps>;
  Link: Component<LinkProps>;
  Packet: Component<PacketProps>;
  Hint: Component<HintProps>;
  Tag: Component<TagProps>;
  Label: Component<LabelProps>;
  Panel: Component<PanelProps>;
  Overlay: Component<OverlayProps>;
}

export interface Theme {
  id: string;
  /** <meta name="theme-color"> and the page background behind the SVG. */
  themeColor: string;
  /** Colour scheme for native UI (scrollbars, form controls). */
  scheme: 'light' | 'dark';
  motion: MotionPreset;
  timbre: Timbre;
  /** Labels never render smaller than this many CSS px on screen. */
  labelMinPx: number;
  art: ArtSlots;
}

export type ThemeInput = Omit<Theme, 'art'> & { art?: Partial<ArtSlots> };
