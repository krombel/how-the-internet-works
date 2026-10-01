// Inside the ISP border router: an MPLS-tagged parcel comes from the core, the label is popped, BGP route notes feed
// a routing table, and the selected row sends the parcel to the exchange instead of paid transit. Pure maths for Svelte
// and the model tests.
import { along, type Orient } from '$core/api';
import type { BorderLayout, Box, Exit, NoteSource, Parcel, Pt, RouteNote, Stage, StickerState, Tag } from './types';

export const PERIOD = 8;
export const CHOSEN_EXIT: Exit = 'exchange';
export const STAGE_TIMES = {
  inEnd: 0.16,
  popEnd: 0.28,
  tableEnd: 0.48,
  chooseEnd: 0.62,
  outEnd: 0.92,
} as const;

const STILL_PHASE = 0.55;

const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
const around = (p: Pt, w: number, h: number): Box => box(p.x - w / 2, p.y - h / 2, w, h);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => x * x * (3 - 2 * x);
const ramp = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));
const tag = (x: number, y: number, anchor: Tag['anchor'] = 'middle'): Tag => ({ x, y, anchor });

/** The router's floor plan. Inside the case the parcel's track runs from the core-facing line card to a fork by the
 *  route book: one branch to the exchange, the other (dim, dashed) to transit. Landscape: the core is on the left and
 *  the exits on the right, exchange below and transit above. Portrait: the core is at the bottom, the exits at the
 *  top, exchange left and transit right. Short landscape is landscape with a bigger book and fewer words. */
export function borderLayout(o: Orient, compact = false): BorderLayout {
  if (o === 'portrait') return {
    case: box(80, 360, 740, 900),
    lineCard: box(335, 1010, 230, 150),
    table: box(190, 520, 520, 380),
    rows: { destination: box(225, 605, 450, 62), exchange: box(225, 690, 450, 80), transit: box(225, 790, 450, 80) },
    inNode: { x: 450, y: 1440 }, exchangeNode: { x: 135, y: 215 }, transitNode: { x: 765, y: 225 },
    nodeSize: 150, transitSize: 115,
    inPort: { x: 450, y: 1260 }, popPoint: { x: 450, y: 1085 }, tablePoint: { x: 450, y: 955 },
    exchangeCorner: { x: 135, y: 955 }, outPort: { x: 135, y: 360 },
    transitCorner: { x: 765, y: 955 }, transitPort: { x: 765, y: 360 },
    inLabel: tag(545, 1450, 'start'), exchangeLabel: tag(60, 105, 'start'), transitLabel: tag(845, 115, 'end'),
    inTag: tag(430, 1320, 'end'), exchangeTag: tag(160, 330, 'start'), transitTag: tag(745, 330, 'end'),
    popTag: tag(425, 1215, 'end'),
  };
  if (compact) return {
    case: box(250, 160, 1080, 660),
    lineCard: box(300, 440, 170, 230),
    table: box(560, 250, 640, 400),
    rows: { destination: box(595, 335, 570, 72), exchange: box(595, 425, 570, 88), transit: box(595, 530, 570, 88) },
    inNode: { x: 110, y: 600 }, exchangeNode: { x: 1480, y: 740 }, transitNode: { x: 1480, y: 205 },
    nodeSize: 135, transitSize: 112,
    inPort: { x: 250, y: 600 }, popPoint: { x: 385, y: 600 }, tablePoint: { x: 515, y: 600 },
    exchangeCorner: { x: 515, y: 740 }, outPort: { x: 1330, y: 740 },
    transitCorner: { x: 515, y: 205 }, transitPort: { x: 1330, y: 205 },
    inLabel: tag(110, 730), exchangeLabel: tag(1480, 860), transitLabel: tag(1480, 320),
    inTag: tag(180, 560), exchangeTag: tag(1405, 712), transitTag: tag(1405, 180),
    popTag: tag(385, 760),
  };
  return {
    case: box(340, 170, 850, 640),
    lineCard: box(395, 420, 165, 220),
    table: box(650, 260, 480, 360),
    rows: { destination: box(690, 344, 400, 54), exchange: box(690, 418, 400, 70), transit: box(690, 504, 400, 70) },
    inNode: { x: 155, y: 585 }, exchangeNode: { x: 1438, y: 700 }, transitNode: { x: 1438, y: 215 },
    nodeSize: 160, transitSize: 125,
    inPort: { x: 340, y: 585 }, popPoint: { x: 477, y: 585 }, tablePoint: { x: 605, y: 585 },
    exchangeCorner: { x: 605, y: 700 }, outPort: { x: 1190, y: 700 },
    transitCorner: { x: 605, y: 215 }, transitPort: { x: 1190, y: 215 },
    inLabel: tag(155, 725), exchangeLabel: tag(1438, 832), transitLabel: tag(1438, 325),
    inTag: tag(288, 560), exchangeTag: tag(1274, 676), transitTag: tag(1274, 191),
    popTag: tag(477, 690),
  };
}

export const nodeBox = (p: Pt, size: number) => around(p, size, size);

/** The track from the core-facing port to the fork by the route book. */
export const inTrack = (L: BorderLayout): Pt[] => [L.inPort, L.popPoint, L.tablePoint];
/** Each exit's track, from the fork out to its neighbour. */
export const exitTrack = (L: BorderLayout, exit: Exit): Pt[] => exit === 'exchange'
  ? [L.tablePoint, L.exchangeCorner, L.outPort, L.exchangeNode]
  : [L.tablePoint, L.transitCorner, L.transitPort, L.transitNode];

const phaseOf = (t: number, still: boolean) => still ? STILL_PHASE : ((t / PERIOD) % 1 + 1) % 1;
const fade = (phase: number) => Math.min(1, phase / 0.035, (1 - phase) / 0.055);

function alongPhase(pts: Pt[], u: number): Pt {
  return along(pts, ease(clamp01(u))).p;
}

function segmentStage(phase: number): Stage {
  if (phase < STAGE_TIMES.inEnd) return 'in';
  if (phase < STAGE_TIMES.popEnd) return 'pop';
  if (phase < STAGE_TIMES.tableEnd) return 'table';
  if (phase < STAGE_TIMES.chooseEnd) return 'choose';
  return 'out';
}

export function parcelAt(t: number, still: boolean, L: BorderLayout): Parcel {
  const phase = phaseOf(t, still);
  const stage = segmentStage(phase);
  let p: Pt;
  if (stage === 'in') p = alongPhase([L.inNode, L.inPort], phase / STAGE_TIMES.inEnd);
  else if (stage === 'pop') p = alongPhase([L.inPort, L.popPoint], (phase - STAGE_TIMES.inEnd) / (STAGE_TIMES.popEnd - STAGE_TIMES.inEnd));
  else if (stage === 'table') p = alongPhase([L.popPoint, L.tablePoint], (phase - STAGE_TIMES.popEnd) / (STAGE_TIMES.tableEnd - STAGE_TIMES.popEnd));
  else if (stage === 'choose') p = L.tablePoint;
  else p = alongPhase(exitTrack(L, CHOSEN_EXIT), (phase - STAGE_TIMES.chooseEnd) / (STAGE_TIMES.outEnd - STAGE_TIMES.chooseEnd));

  const stickerAlpha = Math.max(0, 1 - ramp(phase, 0.18, 0.255));
  return {
    p,
    stage,
    phase,
    alpha: fade(phase),
    popped: phase >= 0.255,
    stickerAlpha,
    stickerDetached: phase >= 0.18 && stickerAlpha > 0,
    chosenAlpha: still ? 1 : ramp(phase, 0.47, 0.55) * (1 - ramp(phase, 0.94, 0.995)),
    exit: CHOSEN_EXIT,
  };
}

export function stickerAt(parcel: Parcel): StickerState {
  const dx = parcel.stickerDetached ? -48 - ramp(parcel.phase, 0.18, 0.255) * 48 : 0;
  const dy = parcel.stickerDetached ? -54 - ramp(parcel.phase, 0.18, 0.255) * 38 : -4;
  return {
    p: { x: parcel.p.x + dx, y: parcel.p.y + dy },
    alpha: parcel.stickerAlpha,
    detached: parcel.stickerDetached,
  };
}

const NOTE_SPECS: { source: NoteSource; start: number; still: number }[] = [
  { source: 'exchange', start: 0.78, still: 0.18 },
  { source: 'transit', start: 0.86, still: 0.72 },
];

function wrap01(x: number) {
  return ((x % 1) + 1) % 1;
}

/** A neighbour's route note comes in along its exit's track and lands in the route book, by its row. */
export function notePath(L: BorderLayout, source: NoteSource): Pt[] {
  const row = L.rows[source];
  return [...exitTrack(L, source).reverse(), { x: row.x + 36, y: row.y + row.h / 2 }];
}

export function routeNotesAt(t: number, still: boolean, L: BorderLayout, hasTransit = true): RouteNote[] {
  const phase = phaseOf(t, false);
  return NOTE_SPECS
    .filter((s) => hasTransit || s.source !== 'transit')
    .map((s) => {
      const u = still ? s.still : wrap01(phase - s.start) / 0.22;
      const active = still || (phase >= s.start && phase <= s.start + 0.22);
      const p = along(notePath(L, s.source), clamp01(u)).p;
      return { p, stage: s.source, source: s.source, alpha: active ? Math.min(0.85, u / 0.12, (1 - u) / 0.12) : 0 };
    });
}

