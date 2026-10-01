// Pure maths for the leaf–spine fabric dive: all leaves connect to all four spines, ECMP keeps this flow on one spine,
// and other flows demonstrate that the fabric spreads traffic across every equal-cost path.
import { along, type Orient } from '$core/api';
import type { Box, FabricLayout, FabricLink, Flow, FlowSpec, Leaf, Parcel, Pt } from './types';

export const PERIOD = 6;
export const HIGHLIGHT_SPINE = 2;
export const LEAVES: Leaf[] = ['before', 'other1', 'other2', 'after'];
export const SPINES = [0, 1, 2, 3] as const;

export const OTHER_FLOWS: FlowSpec[] = [
  { from: 'other1', to: 'after', spine: 0, phase: 0.03, still: 0.18 },
  { from: 'before', to: 'other2', spine: 1, phase: 0.16, still: 0.36 },
  { from: 'other2', to: 'other1', spine: 2, phase: 0.29, still: 0.54 },
  { from: 'after', to: 'before', spine: 3, phase: 0.42, still: 0.72 },
  { from: 'other2', to: 'before', spine: 0, phase: 0.55, still: 0.30 },
  { from: 'after', to: 'other1', spine: 1, phase: 0.68, still: 0.48 },
  { from: 'before', to: 'after', spine: 2, phase: 0.81, still: 0.66 },
  { from: 'other1', to: 'other2', spine: 3, phase: 0.94, still: 0.84 },
];

const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
export const centre = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
export const around = (p: Pt, w: number, h: number): Box => box(p.x - w / 2, p.y - h / 2, w, h);

export function fabricLayout(o: Orient, compact = false): FabricLayout {
  if (o === 'portrait') {
    const leaves = {
      before: { x: 130, y: 1080 }, other1: { x: 345, y: 1080 }, other2: { x: 555, y: 1080 }, after: { x: 770, y: 1080 },
    } satisfies Record<Leaf, Pt>;
    return {
      spines: [{ x: 170, y: 420 }, { x: 360, y: 420 }, { x: 540, y: 420 }, { x: 730, y: 420 }],
      spineSize: { w: 145, h: 92 },
      leaves,
      leafBoxes: Object.fromEntries(LEAVES.map((l) => [l, around(leaves[l], l === 'before' || l === 'after' ? 140 : 170, 110)])) as Record<Leaf, Box>,
      nodeSize: 130,
      inPort: { x: 55, y: 1390 }, outPort: { x: 845, y: 1390 },
      fabricTag: { x: 620, y: 1290, anchor: 'middle' },
      sticker: box(48, 1238, 330, 82),
    };
  }
  if (compact) {
    const leaves = {
      before: { x: 165, y: 610 }, other1: { x: 590, y: 610 }, other2: { x: 1010, y: 610 }, after: { x: 1435, y: 610 },
    } satisfies Record<Leaf, Pt>;
    return {
      spines: [{ x: 400, y: 225 }, { x: 670, y: 225 }, { x: 930, y: 225 }, { x: 1200, y: 225 }],
      spineSize: { w: 150, h: 86 },
      leaves,
      leafBoxes: Object.fromEntries(LEAVES.map((l) => [l, around(leaves[l], l === 'before' || l === 'after' ? 132 : 180, 105)])) as Record<Leaf, Box>,
      nodeSize: 132,
      inPort: { x: 45, y: 610 }, outPort: { x: 1555, y: 610 },
      fabricTag: { x: 800, y: 790, anchor: 'middle' },
      sticker: box(38, 738, 420, 92),
    };
  }
  const leaves = {
    before: { x: 230, y: 650 }, other1: { x: 610, y: 650 }, other2: { x: 990, y: 650 }, after: { x: 1370, y: 650 },
  } satisfies Record<Leaf, Pt>;
  return {
    spines: [{ x: 430, y: 250 }, { x: 675, y: 250 }, { x: 920, y: 250 }, { x: 1165, y: 250 }],
    spineSize: { w: 160, h: 96 },
    leaves,
    leafBoxes: Object.fromEntries(LEAVES.map((l) => [l, around(leaves[l], l === 'before' || l === 'after' ? 150 : 190, 110)])) as Record<Leaf, Box>,
    nodeSize: 150,
    inPort: { x: 60, y: 650 }, outPort: { x: 1540, y: 650 },
    fabricTag: { x: 800, y: 830, anchor: 'middle' },
    sticker: box(78, 462, 315, 76),
  };
}

export const spineBox = (L: FabricLayout, i: number): Box => around(L.spines[i], L.spineSize.w, L.spineSize.h);
export const leafTop = (L: FabricLayout, l: Leaf): Pt => ({ x: L.leaves[l].x, y: L.leafBoxes[l].y });
export const spinePort = (L: FabricLayout, i: number): Pt => ({ x: L.spines[i].x, y: spineBox(L, i).y + L.spineSize.h });
export const wire = (a: Pt, b: Pt) => `M${a.x} ${a.y} L${b.x} ${b.y}`;

export function fabricLinks(L: FabricLayout): FabricLink[] {
  return LEAVES.flatMap((leaf) => SPINES.map((spine) => ({
    leaf, spine, a: leafTop(L, leaf), b: spinePort(L, spine),
    highlighted: spine === HIGHLIGHT_SPINE && (leaf === 'before' || leaf === 'after'),
  })));
}

export const tripPath = (L: FabricLayout): Pt[] => [
  L.inPort, L.leaves.before, leafTop(L, 'before'), spinePort(L, HIGHLIGHT_SPINE), leafTop(L, 'after'), L.leaves.after, L.outPort,
];

export const flowPath = (L: FabricLayout, f: FlowSpec): Pt[] => [leafTop(L, f.from), spinePort(L, f.spine), leafTop(L, f.to)];

function fade(f: number, peak = 1) { return Math.min(peak, f / 0.055, (1 - f) / 0.055); }

export function parcelAt(t: number, still: boolean, L: FabricLayout): Parcel {
  const pts = tripPath(L);
  const f = still ? 0.56 : (t / PERIOD) % 1;
  const { p, seg } = along(pts, f);
  const stage = seg === 0 ? 'in' : seg >= pts.length - 2 ? 'out' : 'fabric';
  return { p, alpha: fade(f), spine: HIGHLIGHT_SPINE, from: 'before', to: 'after', stage };
}

export function otherFlowAt(t: number, still: boolean, L: FabricLayout, spec: FlowSpec): Flow {
  const f = still ? spec.still : (t / PERIOD + spec.phase) % 1;
  return { ...along(flowPath(L, spec), f), alpha: fade(f, 0.72), spine: spec.spine, from: spec.from, to: spec.to };
}
