// Pure maths for the three-tier dive (2010): a core pair on top, the aggregation pair in the middle (this switch active,
// its twin on standby) and the racks' access switches below, each with an uplink to both. Spanning tree blocks every
// uplink to the standby switch so the tree has no loop: all traffic, yours and the other racks', goes through this one.
import { along, type Orient } from '$core/api';
import { around } from '../leaf-spine/fabric';
import type { Box, Pt } from '../leaf-spine/types';
import type { CoreLink, End, Flow, FlowSpec, Rack, TierLayout, Uplink } from './types';

export const PERIOD = 6;
/** This switch, in the pair; the other one is its standby. */
export const ACTIVE = 0;
export const AGGS = [0, 1] as const;
export const CORES = [0, 1] as const;
export const RACKS: Rack[] = ['other1', 'other2', 'after'];

/** Other racks' traffic: up to the core and the internet, down from it, and across to another rack, always through
 *  the active switch. */
export const OTHER_FLOWS: FlowSpec[] = [
  { from: 'other1', to: 0, phase: 0.05, still: 0.3 },
  { from: 1, to: 'other2', phase: 0.22, still: 0.62 },
  { from: 'other2', to: 'other1', phase: 0.4, still: 0.8 },
  { from: 0, to: 'other1', phase: 0.58, still: 0.45 },
  { from: 'other2', to: 1, phase: 0.76, still: 0.2 },
  { from: 'after', to: 0, phase: 0.9, still: 0.7 },
];

const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
const boxes = (racks: Record<Rack, Pt>, size: number, other: number, h: number) =>
  Object.fromEntries(RACKS.map((r) => [r, around(racks[r], r === 'after' ? size : other, h)])) as Record<Rack, Box>;

export function tierLayout(o: Orient, compact = false): TierLayout {
  if (o === 'portrait') {
    const racks = { other1: { x: 170, y: 1030 }, other2: { x: 440, y: 1030 }, after: { x: 720, y: 1030 } };
    return {
      cores: [{ x: 400, y: 420 }, { x: 720, y: 420 }], coreSize: { w: 150, h: 84 },
      aggs: [{ x: 400, y: 720 }, { x: 720, y: 720 }], aggSize: { w: 160, h: 92 },
      before: { x: 130, y: 720 }, beforeBox: around({ x: 130, y: 720 }, 130, 110),
      racks, rackBoxes: boxes(racks, 140, 170, 110), nodeSize: 130,
      inPort: { x: 130, y: 280 }, outPort: { x: 865, y: 1180 },
      tag: { x: 620, y: 1290, anchor: 'middle' },
      sticker: box(48, 1238, 330, 82),
    };
  }
  if (compact) {
    const racks = { other1: { x: 470, y: 640 }, other2: { x: 850, y: 640 }, after: { x: 1230, y: 640 } };
    return {
      cores: [{ x: 640, y: 245 }, { x: 1080, y: 245 }], coreSize: { w: 150, h: 80 },
      aggs: [{ x: 640, y: 450 }, { x: 1080, y: 450 }], aggSize: { w: 170, h: 86 },
      before: { x: 230, y: 450 }, beforeBox: around({ x: 230, y: 450 }, 132, 105),
      racks, rackBoxes: boxes(racks, 132, 180, 105), nodeSize: 132,
      inPort: { x: 45, y: 450 }, outPort: { x: 1555, y: 640 },
      tag: { x: 800, y: 790, anchor: 'middle' },
      sticker: box(38, 738, 420, 92),
    };
  }
  const racks = { other1: { x: 450, y: 730 }, other2: { x: 830, y: 730 }, after: { x: 1210, y: 730 } };
  return {
    cores: [{ x: 640, y: 240 }, { x: 1080, y: 240 }], coreSize: { w: 170, h: 88 },
    aggs: [{ x: 640, y: 480 }, { x: 1080, y: 480 }], aggSize: { w: 180, h: 96 },
    before: { x: 250, y: 480 }, beforeBox: around({ x: 250, y: 480 }, 150, 110),
    racks, rackBoxes: boxes(racks, 150, 190, 110), nodeSize: 150,
    inPort: { x: 60, y: 480 }, outPort: { x: 1540, y: 730 },
    tag: { x: 800, y: 860, anchor: 'middle' },
    sticker: box(1225, 438, 330, 84),
  };
}

export const coreBox = (L: TierLayout, i: number): Box => around(L.cores[i], L.coreSize.w, L.coreSize.h);
export const aggBox = (L: TierLayout, i: number): Box => around(L.aggs[i], L.aggSize.w, L.aggSize.h);
const coreBottom = (L: TierLayout, i: number): Pt => ({ x: L.cores[i].x, y: L.cores[i].y + L.coreSize.h / 2 });
const aggTop = (L: TierLayout, i: number): Pt => ({ x: L.aggs[i].x, y: L.aggs[i].y - L.aggSize.h / 2 });
const aggBottom = (L: TierLayout, i: number): Pt => ({ x: L.aggs[i].x, y: L.aggs[i].y + L.aggSize.h / 2 });
const rackTop = (L: TierLayout, r: Rack): Pt => ({ x: L.racks[r].x, y: L.rackBoxes[r].y });
export const wire = (a: Pt, b: Pt) => `M${a.x} ${a.y} L${b.x} ${b.y}`;

/** Every rack has an uplink to both of the pair; only the ones to this switch carry traffic. */
export const uplinks = (L: TierLayout): Uplink[] => RACKS.flatMap((rack) => AGGS.map((agg) => ({
  rack, agg, a: rackTop(L, rack), b: aggBottom(L, agg), blocked: agg !== ACTIVE, yours: agg === ACTIVE && rack === 'after',
})));
/** Each of the pair has a link up to both cores. */
export const coreLinks = (L: TierLayout): CoreLink[] => CORES.flatMap((core) => AGGS.map((agg) => ({ core, agg, a: aggTop(L, agg), b: coreBottom(L, core) })));
/** The link between the pair (layer 2 runs across it, which is why the racks' second uplinks would make a loop). */
export const peerLink = (L: TierLayout): [Pt, Pt] => [{ x: L.aggs[0].x + L.aggSize.w / 2, y: L.aggs[0].y }, { x: L.aggs[1].x - L.aggSize.w / 2, y: L.aggs[1].y }];
/** Where spanning tree's no-entry sign sits on a blocked uplink: near the rack, whose port it shuts. */
export const blockAt = (u: Uplink): Pt => ({ x: u.a.x + (u.b.x - u.a.x) * 0.28, y: u.a.y + (u.b.y - u.a.y) * 0.28 });

/** Your parcel: in from the load balancer, through this switch and down to the rack's access switch. */
export const tripPath = (L: TierLayout): Pt[] => [
  L.inPort, L.before, L.aggs[ACTIVE], aggBottom(L, ACTIVE), rackTop(L, 'after'), L.racks.after, L.outPort,
];

const endAt = (L: TierLayout, e: End): Pt => (typeof e === 'number' ? coreBottom(L, e) : rackTop(L, e));
const fromCore = (e: End) => typeof e === 'number';
/** A background flow: from its end, through this switch (its top for a core, its bottom for a rack), to the other end. */
export function flowPath(L: TierLayout, f: FlowSpec): Pt[] {
  const side = (e: End) => (fromCore(e) ? aggTop(L, ACTIVE) : aggBottom(L, ACTIVE));
  const via = fromCore(f.from) === fromCore(f.to) ? [side(f.from)] : [side(f.from), side(f.to)];
  return [endAt(L, f.from), ...via, endAt(L, f.to)];
}

function fade(f: number, peak = 1) { return Math.min(peak, f / 0.055, (1 - f) / 0.055); }

/** Your parcel this frame; with reduced motion, held on its way down from this switch to the rack. */
export function parcelAt(t: number, still: boolean, L: TierLayout): Flow {
  const f = still ? 0.56 : (t / PERIOD) % 1;
  return { p: along(tripPath(L), f).p, alpha: fade(f) };
}

export function otherFlowAt(t: number, still: boolean, L: TierLayout, spec: FlowSpec): Flow {
  const f = still ? spec.still : (t / PERIOD + spec.phase) % 1;
  return { p: along(flowPath(L, spec), f).p, alpha: fade(f, 0.72) };
}
