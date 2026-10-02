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
/** The sea, the sea bed and the land either side (drawn upright: `water` and `ground` are outlines, `land` the land's
 *  top on each side up to the shore, `surface` the water's). */
export interface SeaProps { water: Pt[]; ground: Pt[]; land: number; shore: [number, number]; surface: number; w: number; time: number }
/** An undersea cable lying along `points` (its copper power line inside it). */
export interface CableProps { points: Pt[]; w: number }
/** A landing station standing on the shore at x (its foot at y); `size`: 1 = normal. */
export interface StationProps { x: number; y: number; size: number; time: number }
/** A repeater on the cable, lying on the floor (centred on the cable at x, y). */
export interface RepeaterProps { x: number; y: number; time: number }
/** The cable cut open: its glass threads (`colours`) in the middle, copper round them, armour outside. */
export interface SliceProps { x: number; y: number; r: number; colours: string[] }
/** A shark swimming at x, y (facing left or right). */
export interface SharkProps { x: number; y: number; left: boolean; time: number }
