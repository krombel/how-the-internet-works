// Props of the Wi-Fi dive's own art (art/*.svelte). A different look can swap these files; the maths stays in wave.ts.
import type { Pt } from '$core/api';

export interface WaveProps { d: string; points: Pt[]; time: number }
export interface BitProps { x: number; y: number; bit: number; alpha: number; stem: [Pt, Pt]; time: number; colour: string }
export interface RingsProps { cx: number; cy: number; rings: { r: number; alpha: number }[]; time: number }
