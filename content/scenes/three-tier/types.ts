import type { Box, Pt, Tag } from '../leaf-spine/types';

/** The three access switches drawn: two other racks and the rack the parcel goes to (`after`, the route's next hop). */
export type Rack = 'other1' | 'other2' | 'after';
/** One end of a background flow: a rack, or a core switch (0 or 1), where traffic leaves for the internet. */
export type End = Rack | 0 | 1;

export interface TierLayout {
  cores: Pt[];
  coreSize: { w: number; h: number };
  /** The aggregation pair: 0 is this switch (active), 1 its standby twin. */
  aggs: Pt[];
  aggSize: { w: number; h: number };
  /** The load balancer before this switch, on its left. */
  before: Pt;
  beforeBox: Box;
  racks: Record<Rack, Pt>;
  rackBoxes: Record<Rack, Box>;
  nodeSize: number;
  inPort: Pt;
  outPort: Pt;
  /** One name for every fibre in the picture: they are all the same kind. */
  tag: Tag;
  sticker: Box;
}

/** A rack's uplink to one of the pair: spanning tree blocks the one to the standby switch. */
export interface Uplink { rack: Rack; agg: number; a: Pt; b: Pt; blocked: boolean; yours: boolean }
export interface CoreLink { core: number; agg: number; a: Pt; b: Pt }
export interface FlowSpec { from: End; to: End; phase: number; still: number }
export interface Flow { p: Pt; alpha: number }
