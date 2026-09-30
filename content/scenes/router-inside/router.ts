// Inside the home router: four rooms (the switch's sockets, the Wi‑Fi radio, the routing and NAT "brain", the fibre
// ONT) and a parcel's trip through them. It comes in on one medium, is plain bits inside, and leaves on another: the
// room it enters and leaves by follows the links either side. Pure: the scene draws what this computes.
import { along, lengths, type Orient } from '$core/api';
import type { Box, Form, Look, Pt, Room, RouterLayout, Stage } from './types';

/** The room a medium comes in or goes out through: radio at the Wi‑Fi radio, copper at the switch, light at the ONT. */
export const roomFor = (look: Look): Room => (look === 'radio' ? 'wifi' : look === 'cable' ? 'switch' : 'ont');
/** How a parcel travels on a medium: a radio wave, electric pushes or light. */
export const formFor = (look: Look): Form => (look === 'radio' ? 'wave' : look === 'cable' ? 'spark' : 'light');

const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
export const centre = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** Landscape: the parcel runs left to right, through the switch, the brain and the ONT, with the Wi‑Fi radio above the
 *  brain. Portrait: bottom to top, the ONT at the top, the Wi‑Fi radio beside the brain. */
export function routerLayout(o: Orient): RouterLayout {
  if (o === 'portrait') return {
    case: box(70, 330, 760, 950),
    rooms: { ont: box(120, 390, 660, 240), brain: box(120, 690, 380, 280), wifi: box(540, 690, 240, 280), switch: box(120, 1030, 660, 200) },
    inNode: { x: 450, y: 1425 }, outNode: { x: 450, y: 180 }, nodeSize: 160,
    inLabel: { x: 450, y: 1555 }, outLabel: { x: 450, y: 70 },
    antennas: [{ x: 600, y: 330 }, { x: 720, y: 330 }],
  };
  return {
    case: box(370, 220, 860, 560),
    rooms: { switch: box(400, 450, 240, 300), brain: box(680, 450, 240, 300), ont: box(960, 450, 240, 300), wifi: box(680, 250, 240, 170) },
    inNode: { x: 175, y: 600 }, outNode: { x: 1425, y: 600 }, nodeSize: 180,
    inLabel: { x: 175, y: 745 }, outLabel: { x: 1425, y: 745 },
    antennas: [{ x: 740, y: 220 }, { x: 860, y: 220 }],
  };
}

/** Where a medium meets a room: an antenna tip for radio, else the room's edge facing the device it comes from (or goes
 *  to). */
function mouth(L: RouterLayout, room: Room, towards: Pt): Pt {
  const b = L.rooms[room], c = centre(b);
  if (room === 'wifi') return { x: L.antennas[0].x, y: L.antennas[0].y - 60 };
  if (Math.abs(towards.x - c.x) > Math.abs(towards.y - c.y)) return { x: towards.x < c.x ? b.x : b.x + b.w, y: c.y };
  return { x: c.x, y: towards.y < c.y ? b.y : b.y + b.h };
}

/** The trip: from the device before, into the room its medium arrives at, through the brain, out of the room the next
 *  medium leaves from, to the device after. The parcel changes form in the middle of the rooms it enters and leaves by. */
export function tripPath(L: RouterLayout, inLook: Look, outLook: Look): Pt[] {
  const a = roomFor(inLook), b = roomFor(outLook);
  return [L.inNode, mouth(L, a, L.inNode), centre(L.rooms[a]), centre(L.rooms.brain), centre(L.rooms[b]), mouth(L, b, L.outNode), L.outNode];
}
const BRAIN = 3;


/** Seconds per trip. */
export const PERIOD = 6;

/** Where the parcel is at time t (a trip every `PERIOD` s, one at a time, fading in and out at the ends): on the link
 *  it came in on, inside the box (plain bits), or on the one it leaves on; and whether the brain has swapped its
 *  sender's address yet. Held still (reduced motion): just past the brain. */
export function parcelAt(t: number, still: boolean, pts: Pt[]) {
  const cum = lengths(pts), brain = cum[BRAIN] / cum[cum.length - 1];
  const f = still ? brain + 0.03 : (t / PERIOD) % 1;
  const { p, seg } = along(pts, f);
  const stage: Stage = seg < BRAIN - 1 ? 'in' : seg <= BRAIN ? 'inside' : 'out';
  return { p, stage, alpha: Math.min(1, f / 0.04, (1 - f) / 0.04), swapped: f >= brain };
}
