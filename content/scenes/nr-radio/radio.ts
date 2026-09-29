// The 5G dive's maths (style-agnostic): where things sit per orientation, the beams from the tower's antenna panel to
// each phone, and a scheduler that hands out seats in a time × frequency grid (OFDMA resource blocks, slowed down a
// million times: one column here is one 0.5 ms slot).
import type { Orient, Pt } from '$core/api';

export const USERS = 3;
export const ROWS = 5;
export const COLS = 11;
/** Seconds per grid column (one slot). */
const SLOT = 0.55;

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

/** Who got this seat (0..USERS-1) or -1 for free, fixed per slot + row so the grid doesn't flicker. */
export function owner(slot: number, row: number): number {
  const h = Math.sin(slot * 12.9898 + row * 78.233) * 43758.5453;
  const f = h - Math.floor(h);
  // "you" (the video) gets the most seats
  return f < 0.45 ? 0 : f < 0.65 ? 1 : f < 0.85 ? 2 : -1;
}

/** Grid columns at time t: slot number and x offset in columns (they slide left; the grid clips them). The newest
 *  column slides in on the right; the one before it is "now" (being sent). */
export function columns(t: number) {
  const s = t / SLOT, now = Math.floor(s), frac = s - now;
  return Array.from({ length: COLS + 1 }, (_, c) => ({ slot: now - COLS + c, dx: c - frac, now: c === COLS - 1 }));
}

/** A narrow lobe from the antenna to a phone (a beam), as an SVG path. */
export function beamPath(a: Pt, b: Pt, width: number): string {
  const mx = a.x + (b.x - a.x) * 0.62, my = a.y + (b.y - a.y) * 0.62;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = (-(b.y - a.y) / len) * width, ny = ((b.x - a.x) / len) * width;
  return `M${a.x} ${a.y} Q${mx + nx} ${my + ny} ${b.x} ${b.y} Q${mx - nx} ${my - ny} ${a.x} ${a.y} Z`;
}
