export interface Pt { x: number; y: number }
export interface Box { x: number; y: number; w: number; h: number }
export interface Tag extends Pt { anchor: 'start' | 'middle' | 'end' }
export type Leaf = 'before' | 'other1' | 'other2' | 'after';
export type Stage = 'in' | 'fabric' | 'out';

export interface FabricLayout {
  spines: Pt[];
  spineSize: { w: number; h: number };
  leaves: Record<Leaf, Pt>;
  leafBoxes: Record<Leaf, Box>;
  nodeSize: number;
  inPort: Pt;
  outPort: Pt;
  /** One name for every fibre in the picture: they are all the same kind. */
  fabricTag: Tag;
  sticker: Box;
}

export interface FabricLink { leaf: Leaf; spine: number; a: Pt; b: Pt; highlighted: boolean }
export interface FlowSpec { from: Leaf; to: Leaf; spine: number; phase: number; still: number }
export interface Flow { p: Pt; alpha: number; spine: number; from: Leaf; to: Leaf }
export interface Parcel extends Flow { stage: Stage }
export interface SpineProps { box: Box; active: boolean; night: boolean }
export interface LeafProps { box: Box; active?: boolean; night: boolean }
export interface CarrierProps { p: Pt; alpha: number; time: number; kind: 'yours' | 'other'; colour: string; night: boolean }
