// Props of the fibre dive's own art (art/*.svelte). A different look can swap these files; the maths stays in light.ts.
import type { Pt } from '$core/api';

export interface FibreProps { x0: number; x1: number; y: number; coreH: number; cladH: number; time: number }
export interface PulseProps { head: Pt; trail: Pt[]; channel: number; colour: string; time: number }
export interface PrismProps { x: number; y: number; kind: 'mux' | 'demux'; time: number }
export interface EmitterProps { x: number; y: number; kind: 'laser' | 'detector'; channel: number; colour: string; time: number }
export interface RouteProps { points: Pt[]; channel: number; colour: string }
