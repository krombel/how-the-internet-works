export interface Pt { x: number; y: number }
export interface Box { x: number; y: number; w: number; h: number }
export interface Tag extends Pt { anchor: 'start' | 'middle' | 'end' }
export type Room = 'antenna' | 'radio' | 'baseband' | 'fibre';
/** A parcel as it travels: on a radio wave, as light, as bits, or as bits wrapped in the tunnel envelope. */
export type Form = 'wave' | 'light' | 'parcel' | 'envelope';
/** Where a parcel is: on the radio link, inside the tower, or on the fibre. */
export type Stage = 'in' | 'inside' | 'out';
export interface TowerLayout {
  /** The rooms (the antennas and the radio unit up the mast, baseband and the fibre out in the cabinet at its foot). */
  rooms: Record<Room, Box>;
  cabinet: Box;
  /** The devices either side and their size, their name labels and the names of the links to them. */
  inNode: Pt; outNode: Pt; nodeSize: number;
  inLabel: Tag; outLabel: Tag; inTag: Tag; outTag: Tag;
}
export interface RoomProps { box: Box; tint: string; title: string; line: string; head: number; body: number }
export interface CaseProps { cabinet: Box; mast: { x: number; y0: number; y1: number } }
export interface CarrierProps { p: Pt; form: Form; colour: string; alpha: number; time: number; night: boolean }
