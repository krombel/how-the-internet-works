// Props of the 5G dive's own art (art/*.svelte). A different look can swap these files; the maths stays in radio.ts.
import type { Pt } from '$core/api';

export interface BeamProps { d: string; from: Pt; to: Pt; colour: string; strength: number; time: number }
export interface SeatProps { x: number; y: number; w: number; h: number; colour: string | null; now: boolean }
