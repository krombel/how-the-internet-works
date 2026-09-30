export interface Pt { x: number; y: number }
export interface Box { x: number; y: number; w: number; h: number }
export type Room = 'switch' | 'wifi' | 'brain' | 'ont';
export type Look = 'radio' | 'cable' | 'fibre' | 'trunk';
/** A parcel as it travels: on a radio wave, as electric pushes, as light, or inside the box as plain bits. */
export type Form = 'wave' | 'spark' | 'light' | 'parcel';
/** Where a parcel is: on the link it came in on, inside the box, or on the link it leaves on. */
export type Stage = 'in' | 'inside' | 'out';
export interface RouterLayout {
  /** The router's box, and its rooms inside it. */
  case: Box;
  rooms: Record<Room, Box>;
  /** The devices either side, their size and name labels; the Wi‑Fi radio's antennas (their feet, on the box). */
  inNode: Pt; outNode: Pt; nodeSize: number;
  inLabel: Pt; outLabel: Pt;
  antennas: Pt[];
}
export interface RoomProps { box: Box; tint: string; title: string; line: string; used: boolean; head: number; body: number }
export interface CaseProps { box: Box; antennas: Pt[]; time: number; night: boolean }
export interface CarrierProps { p: Pt; form: Form; colour: string; alpha: number; time: number; night: boolean }
