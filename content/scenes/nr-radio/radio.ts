// The 5G dive's maths (style-agnostic): where things sit per orientation, the beams from the tower's antenna panel to
// each phone, and a scheduler that hands out seats in a time × frequency grid (OFDMA resource blocks, slowed down a
// million times: one column here is one 0.5 ms slot). 3G (HSPA) shares the air differently: one wave over the whole
// sector, and a grid of spreading codes × 2 ms slots, each slot's codes mostly one phone's.
import type { Orient, Pt } from '$core/api';

export const USERS = 3;
export const ROWS = 5;
export const COLS = 11;
/** How a radio shares the air, by its technology: beams or one wave for the sector, seconds per grid column (one
 *  slot, slowed down alike: 0.5 ms in 5G, 2 ms in 3G) and who gets each seat. */
export interface Mode { beams: boolean; slot: number; owner: (slot: number, row: number) => number }

export interface Layout {
  tower: Pt & { size: number };
  /** Where the beams leave the antenna panel. */
  source: Pt;
  phones: (Pt & { size: number })[];
  grid: { x: number; y: number; cw: number; ch: number };
  labels: { beams: Pt; grid: Pt; time: Pt; freq: Pt & { rotate: number }; you: Pt };
  tags: { tower: Pt; grid: Pt };
}

export const LAYOUT: Record<Orient, Layout> = {
  landscape: {
    tower: { x: 250, y: 520, size: 380 },
    source: { x: 300, y: 450 },
    phones: [{ x: 1390, y: 560, size: 170 }, { x: 1250, y: 300, size: 140 }, { x: 1240, y: 780, size: 140 }],
    grid: { x: 520, y: 80, cw: 56, ch: 36 },
    labels: { beams: { x: 760, y: 700 }, grid: { x: 828, y: 300 }, time: { x: 1136, y: 300 }, freq: { x: 488, y: 170, rotate: -90 }, you: { x: 1390, y: 690 } },
    tags: { tower: { x: 250, y: 790 }, grid: { x: 828, y: 350 } },
  },
  portrait: {
    tower: { x: 450, y: 1210, size: 400 },
    source: { x: 450, y: 1090 },
    phones: [{ x: 450, y: 620, size: 180 }, { x: 170, y: 690, size: 150 }, { x: 730, y: 690, size: 150 }],
    grid: { x: 142, y: 110, cw: 56, ch: 40 },
    labels: { beams: { x: 450, y: 1450 }, grid: { x: 450, y: 404 }, time: { x: 758, y: 352 }, freq: { x: 112, y: 210, rotate: -90 }, you: { x: 450, y: 770 } },
    tags: { tower: { x: 450, y: 1500 }, grid: { x: 450, y: 454 } },
  },
};

/** A fixed pseudo-random 0..1 per slot + row, so the grid doesn't flicker. */
function rnd(slot: number, row: number) {
  const h = Math.sin(slot * 12.9898 + row * 78.233) * 43758.5453;
  return h - Math.floor(h);
}
/** Who gets a share with chance f (0..USERS-1, or -1 for free): "you" (the video) the most. */
const pick = (f: number) => (f < 0.45 ? 0 : f < 0.65 ? 1 : f < 0.85 ? 2 : -1);

/** 5G: who got this seat, each resource block on its own. */
export const owner = (slot: number, row: number) => pick(rnd(slot, row));
/** 3G: a slot's codes go to one phone, now and then a few of them to a second (HSDPA code multiplexing). */
function shared(slot: number, row: number) {
  const u = pick(rnd(slot, 0));
  return u >= 0 && row >= ROWS - 2 && rnd(slot, 1) < 0.3 ? (u + 1) % USERS : u;
}

export const MODES: Record<string, Mode> = {
  nr: { beams: true, slot: 0.55, owner },
  hspa: { beams: false, slot: 2.2, owner: shared },
};

/** Grid columns while slot `at` (the time in slots, floored) slides in on the right: slot number and column from the
 *  left. The one before the newest is "now" (being sent). They all slide left by the share of slot `at` gone by, and
 *  the grid clips them. */
export function columns(at: number) {
  return Array.from({ length: COLS + 1 }, (_, c) => ({ slot: at - COLS + c, col: c, now: c === COLS - 1 }));
}

/** One wide wave from the antenna over every phone (a sector), as an SVG path: a wedge just past the furthest. */
export function sectorPath(a: Pt, phones: (Pt & { size: number })[]): string {
  const ang = phones.map((p) => Math.atan2(p.y - a.y, p.x - a.x));
  const r = Math.max(...phones.map((p) => Math.hypot(p.x - a.x, p.y - a.y) + p.size * 0.6));
  const at = (t: number) => `${Math.round(a.x + r * Math.cos(t))} ${Math.round(a.y + r * Math.sin(t))}`;
  return `M${a.x} ${a.y} L${at(Math.min(...ang) - 0.14)} A${Math.round(r)} ${Math.round(r)} 0 0 1 ${at(Math.max(...ang) + 0.14)} Z`;
}

/** A narrow lobe from the antenna to a phone (a beam), as an SVG path. */
export function beamPath(a: Pt, b: Pt, width: number): string {
  const mx = a.x + (b.x - a.x) * 0.62, my = a.y + (b.y - a.y) * 0.62;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = (-(b.y - a.y) / len) * width, ny = ((b.x - a.x) / len) * width;
  return `M${a.x} ${a.y} Q${mx + nx} ${my + ny} ${b.x} ${b.y} Q${mx - nx} ${my - ny} ${a.x} ${a.y} Z`;
}
