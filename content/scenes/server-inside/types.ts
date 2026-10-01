export interface Pt { x: number; y: number }
export interface Box { x: number; y: number; w: number; h: number }
export interface Tag extends Pt { anchor: 'start' | 'middle' | 'end' }
export type Room = 'nic' | 'compute' | 'memory' | 'ssd';
/** A carrier in the server: fibre light, a request parcel, or a video piece. */
export type Form = 'light' | 'parcel' | 'video';
export type RequestStage = 'in' | 'app' | 'origin' | 'hidden';
export type VideoStage = 'cache' | 'origin' | 'store' | 'out' | 'hidden';
export interface ServerLayout {
  case: Box;
  rooms: Record<Room, Box>;
  inNode: Pt;
  originNode: Pt;
  nodeSize: number;
  originSize: number;
  inLabel: Tag;
  originLabel: Tag;
  inTag: Tag;
  originTag: Tag;
  statusTag: Pt;
  originNote: Tag;
}
export interface Moving<S extends string> { p: Pt; stage: S; alpha: number }
export interface ServerState {
  hit: boolean;
  phase: number;
  request: Moving<RequestStage>;
  video: Moving<VideoStage>;
  copyAlpha: number;
  originActive: boolean;
  statusAlpha: number;
}
export interface RoomProps { box: Box; tint: string; title: string; line: string; head: number; body: number; active?: boolean }
export interface CaseProps { box: Box; time: number; night: boolean }
export interface CarrierProps { p: Pt; form: Form; colour: string; alpha: number; time: number; night: boolean }
