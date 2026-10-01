// Inside the cell tower: the antennas and the radio unit up the mast, baseband and the fibre out in the cabinet at its
// foot. A parcel comes in as a radio wave, is bits from the radio unit on, is wrapped in the mobile network's tunnel
// envelope by baseband and leaves as light. Pure: the scene draws what this computes.
import { along, lengths, type Orient } from '$core/api';
import type { Box, Form, Pt, Stage, TowerLayout } from './types';

const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
export const centre = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** Landscape: the antennas face the phone on the left, the radio unit beside them; the mast goes down from the radio
 *  unit into baseband, and the fibre leaves the cabinet on the right. Portrait: the same, the fibre leaving downwards,
 *  with the phone down the left, clear of the cabinet. */
export function towerLayout(o: Orient, compact = false): TowerLayout {
  if (o === 'portrait') return {
    rooms: { antenna: box(60, 140, 340, 280), radio: box(440, 140, 400, 280), baseband: box(440, 640, 400, 320), fibre: box(440, 1000, 400, 240) },
    cabinet: box(405, 590, 470, 690),
    inNode: { x: 200, y: 1150 }, outNode: { x: 640, y: 1440 }, nodeSize: 150,
    inLabel: { x: 200, y: 1270, anchor: 'middle' }, outLabel: { x: 545, y: 1452, anchor: 'end' },
    inTag: { x: 185, y: 760, anchor: 'end' }, outTag: { x: 680, y: 1330, anchor: 'start' },
  };
  // a phone on its side: wider rooms for titles big enough to read, the devices either side closer to the edges
  if (compact) return {
    rooms: { antenna: box(310, 170, 350, 230), radio: box(690, 170, 390, 230), baseband: box(690, 540, 390, 230), fibre: box(1110, 540, 300, 230) },
    cabinet: box(660, 505, 780, 300),
    inNode: { x: 150, y: 600 }, outNode: { x: 1520, y: 655 }, nodeSize: 130,
    inLabel: { x: 150, y: 735, anchor: 'middle' }, outLabel: { x: 1520, y: 790, anchor: 'middle' },
    inTag: { x: 260, y: 405, anchor: 'end' }, outTag: { x: 1465, y: 612, anchor: 'middle' },
  };
  return {
    rooms: { antenna: box(450, 170, 290, 230), radio: box(780, 170, 290, 230), baseband: box(780, 540, 290, 230), fibre: box(1105, 540, 215, 230) },
    cabinet: box(750, 505, 600, 300),
    inNode: { x: 190, y: 600 }, outNode: { x: 1500, y: 655 }, nodeSize: 160,
    inLabel: { x: 190, y: 735, anchor: 'middle' }, outLabel: { x: 1500, y: 790, anchor: 'middle' },
    inTag: { x: 300, y: 405, anchor: 'end' }, outTag: { x: 1385, y: 612, anchor: 'middle' },
  };
}

/** Where a link meets a room: the side of it facing the device it comes from or goes to. */
function mouth(b: Box, towards: Pt): Pt {
  const c = centre(b);
  if (Math.abs(towards.x - c.x) > Math.abs(towards.y - c.y)) return { x: towards.x < c.x ? b.x : b.x + b.w, y: c.y };
  return { x: c.x, y: towards.y < c.y ? b.y : b.y + b.h };
}

/** The trip: from the device before into the antennas, through the radio unit, down the mast into baseband, out
 *  through the fibre to the device after. */
export function tripPath(L: TowerLayout): Pt[] {
  const { antenna, radio, baseband, fibre } = L.rooms;
  return [L.inNode, mouth(antenna, L.inNode), centre(antenna), centre(radio), centre(baseband), centre(fibre), mouth(fibre, L.outNode), L.outNode];
}
const RADIO = 3, BASEBAND = 4, OUT = 5;


/** Seconds per trip. */
export const PERIOD = 7;

/** Where the parcel is at time t (a trip every `PERIOD` s, fading in and out at the ends): a radio wave until the
 *  radio unit, bits inside, light from the fibre room on; and whether baseband has wrapped it in the tunnel envelope.
 *  Held still (reduced motion): just past baseband. */
export function parcelAt(t: number, still: boolean, pts: Pt[]) {
  const cum = lengths(pts), wrap = cum[BASEBAND] / cum[cum.length - 1];
  const f = still ? wrap + 0.03 : (t / PERIOD) % 1;
  const { p, seg } = along(pts, f);
  const stage: Stage = seg < RADIO ? 'in' : seg >= OUT ? 'out' : 'inside';
  return { p, stage, alpha: Math.min(1, f / 0.04, (1 - f) / 0.04), wrapped: f >= wrap };
}

/** How a parcel crosses a link of this look: a radio wave, light, or plainly as a parcel. */
export const formFor = (look: string): Form => (look === 'radio' ? 'wave' : look === 'fibre' ? 'light' : 'parcel');
