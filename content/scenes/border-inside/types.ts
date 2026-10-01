export interface Pt { x: number; y: number }
export interface Box { x: number; y: number; w: number; h: number }
export interface Tag extends Pt { anchor: 'start' | 'middle' | 'end' }

export type Row = 'destination' | 'exchange' | 'transit';
export type Stage = 'in' | 'pop' | 'table' | 'choose' | 'out';
export type Exit = 'exchange' | 'transit';
export type NoteSource = 'exchange' | 'transit';

export interface BorderLayout {
  case: Box;
  lineCard: Box;
  table: Box;
  rows: Record<Row, Box>;
  inNode: Pt;
  exchangeNode: Pt;
  transitNode: Pt;
  nodeSize: number;
  transitSize: number;
  inPort: Pt;
  popPoint: Pt;
  /** The fork by the route book, where the parcel waits while the book is read. */
  tablePoint: Pt;
  exchangeCorner: Pt;
  outPort: Pt;
  transitCorner: Pt;
  transitPort: Pt;
  inLabel: Tag;
  exchangeLabel: Tag;
  transitLabel: Tag;
  inTag: Tag;
  exchangeTag: Tag;
  transitTag: Tag;
  popTag: Tag;
}

export interface Moving<S extends string> {
  p: Pt;
  stage: S;
  alpha: number;
}

export interface Parcel extends Moving<Stage> {
  phase: number;
  popped: boolean;
  stickerAlpha: number;
  stickerDetached: boolean;
  chosenAlpha: number;
  exit: Exit;
}

export interface StickerState {
  p: Pt;
  alpha: number;
  detached: boolean;
}

export interface RouteNote extends Moving<NoteSource> {
  source: NoteSource;
}

export interface CaseProps { box: Box; lineCard: Box; active: boolean; night: boolean; time: number }
export interface BoardProps { box: Box; active: boolean; night: boolean }
export interface CarrierProps { p: Pt; alpha: number; stickerAlpha: number; time: number; night: boolean }
export interface StickerProps { p: Pt; alpha: number; text: string; detached: boolean }
export interface NoteProps { p: Pt; alpha: number; text: string; colour: string; night: boolean }
