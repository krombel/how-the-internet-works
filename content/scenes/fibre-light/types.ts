// Props of the fibre dive's own art (art/*.svelte). A different look can swap these files; the maths stays in light.ts.
import type { Pt } from '$core/api';

export interface FibreProps { x0: number; x1: number; y: number; coreH: number; cladH: number; time: number }
/** `fade`: 0 = as bright as it left the laser, up to 1 = faint (long haul); `size`: 1 = normal, less = thinner. */
export interface PulseProps { head: Pt; trail: Pt[]; channel: number; colour: string; time: number; fade?: number; size?: number }
export interface PrismProps { x: number; y: number; kind: 'mux' | 'demux'; time: number }
export interface EmitterProps { x: number; y: number; kind: 'laser' | 'detector'; channel: number; colour: string; time: number; size?: number }
export interface RouteProps { points: Pt[]; channel: number; colour: string; size?: number }
/** A home on a shared access fibre (drawn upright); `you`: the reader's own. */
export interface HouseProps { x: number; y: number; size: number; you: boolean; time: number }
/** The passive splitter where one thread becomes one per house (in track space: the thread arrives from the right). */
export interface SplitterProps { x: number; y: number; time: number }
/** A booster on a long-haul thread (in track space, centred on the thread). */
export interface AmplifierProps { x: number; y: number; time: number }
/** A "much longer than drawn" cut across the thread (in track space). */
export interface BreakProps { x: number; y: number; h: number }
