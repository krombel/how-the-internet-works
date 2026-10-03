export interface Pt { x: number; y: number }
export interface Box { x: number; y: number; w: number; h: number }
export interface Tag extends Pt { anchor: 'start' | 'middle' | 'end' }
export type Room = 'nic' | 'compute' | 'memory' | 'ssd';
/** A carrier in the server: fibre light, a request parcel, a video piece, or (1995) a web page or its picture. */
export type Form = 'light' | 'parcel' | 'video' | 'page' | 'picture';
export type RequestStage = 'in' | 'app' | 'origin' | 'disk' | 'hidden';
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
/** The 1995 web server (a tower): its network card, the computer with its one program, and the hard disk. */
export type TowerRoom = 'nic' | 'compute' | 'disk';
export type FileStage = 'disk' | 'out' | 'hidden';
export interface TowerLayout {
  case: Box;
  rooms: Record<TowerRoom, Box>;
  inNode: Pt;
  nodeSize: number;
  inLabel: Tag;
  inTag: Tag;
  statusTag: Pt;
}
export interface TowerState {
  /** Which file this cycle sends: the page, or the picture on it. */
  file: 'page' | 'picture';
  request: Moving<RequestStage>;
  reply: Moving<FileStage>;
  /** How hard the disk is reading, 0–1. */
  reading: number;
  statusAlpha: number;
}
export interface RoomProps { box: Box; tint: string; title: string; line: string; head: number; body: number; active?: boolean }
export interface CaseProps { box: Box; time: number; night: boolean; fill?: string }
export interface CarrierProps { p: Pt; form: Form; colour: string; alpha: number; time: number; night: boolean }
