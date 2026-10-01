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
/** Inside a group: the way the packets go through it (issue #20), under the links and devices and over the owner
 *  regions: the entry, every hop and the links between as one path. Side branches are off it. */
export interface RoadProps { d: string; orient: Orient; time: number }
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
  /** Focused from the keyboard (issue #53): draw the engine's focus ring round it, the ink (--focus-ink, else --ink)
   *  over a gap in the page colour (--focus-gap, else --bg) so it shows on anything, in a group with class "kbd". */
  kbd?: boolean;
}
/** Links are drawn by their technology's look. */
type LinkLook = 'radio' | 'cable' | 'fibre' | 'trunk';
export interface LinkProps {
  look: LinkLook; d: string; curve: Curve; colour: string; dashed: boolean; time: number; focused: boolean;
  /** Focused from the keyboard: the focus ring along it, as for a device. */
  kbd?: boolean;
}
export interface PacketProps {
  kind: string; pose: Pose; colour: string; time: number;
  /** The user is following this packet (draw a reticle / highlight). */
  followed: boolean;
}
/** Tap affordances ("doors"), each with its own mark: 'dive' = look inside, 'expand' = open up (more stops inside),
 *  'swap' = change where you are / what you do. Drawn in two parts: 'glow' under the devices (a breathing outline
 *  around the thing it opens) and 'badge' over them. */
export interface HintProps {
  kind: 'dive' | 'expand' | 'swap';
  part: 'glow' | 'badge';
  /** The mark's centre; a labelled 'expand' pill is centred here instead. (The engine may nudge a labelled badge up or
   *  down, off its spot, so lit labels don't cover each other.) */
  x: number; y: number;
  /** The verb in the reader's language ("Look inside", "Open up", "Change"), and its width at `size` in --label-font. */
  label: string; labelW: number;
  /** Show the label in a pill running on from the mark (centred on the spot for 'expand'): on every door while "What
   *  can I explore?" is on, or when hot. Keep the pill within about label width + 3.2·size by 2.4·size (the engine's tap target). */
  labelled: boolean;
  /** Label font size in scene units, clamped to a readable screen size; draw the badge in proportion to it. */
  size: number;
  /** Pointed at (mouse over it, or its caption chip focused) or lit by "What can I explore?". */
  hot: boolean;
  /** What it opens: a node (a group, or a device to look inside; centre and size) or a link (its path). */
  target: { x: number; y: number; size: number } | { d: string };
  /** Scene clock. Frozen with prefers-reduced-motion, so the badges and outlines stand still. */
  time: number;
}
/** An owner region (issue #20): the part of a path scene one network runs (your internet company, an exchange…).
 *  Drawn in two parts: 'area' under the road and the devices, and 'sign' (its name) over them. */
export interface RegionProps {
  part: 'area' | 'sign';
  /** Its outline, a closed path round its devices. */
  d: string;
  /** Its colour slot: the owner's place along the route (0 = the first), the same in every scene; cycle your own
   *  colours. Neighbouring networks get different tones. */
  tone: number;
  /** Only side branches (a way the packets don't take): draw it fainter. */
  aside: boolean;
  /** The sign's centre, its text (the owner's name, levelled) and font size in scene units (clamped to a readable
   *  screen size). */
  x: number; y: number; label: string; size: number;
}
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
  Road: Component<RoadProps>;
  Device: Component<DeviceProps>;
  Link: Component<LinkProps>;
  Packet: Component<PacketProps>;
  Hint: Component<HintProps>;
  Region: Component<RegionProps>;
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
  /** The theme has a night mode: its tokens.css sets night tokens under `:root[data-mode='night']`, and
   *  these replace `themeColor` and `scheme` at night. Without it the theme is always day and the ☀/🌙 toggle hides. */
  night?: { themeColor: string; scheme: 'light' | 'dark' };
  motion: MotionPreset;
  timbre: Timbre;
  /** Labels never render smaller than this many CSS px on screen. */
  labelMinPx: number;
  art: ArtSlots;
}

export type ThemeInput = Omit<Theme, 'art'> & { art?: Partial<ArtSlots> };
