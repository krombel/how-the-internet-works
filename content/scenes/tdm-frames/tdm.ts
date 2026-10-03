// Timeslots (TDM), the maths of the tdm-frames dive (style-agnostic): a 1990s digital line is a frame of 8-bit slots,
// sent 8,000 times a second. An E1 has 32 slots (slot 0 keeps the frames in step); an ISDN PRI is an E1 whose slot 16
// sets up calls and whose other 30 slots are calls; a leased E1 bundles slots 1–31 into one pipe; a T1 has 24 slots
// and one framing bit. On the copper, ones are pulses that alternate up and down (AMI), with long runs of zeros
// replaced so the clock never loses its beat (HDB3 on an E1, B8ZS on a T1).
import { SLOT } from '../modem-call/modem';

export type Mode = 'pri' | 'e1' | 't1';
const MODES: Record<string, Mode> = { pri: 'pri', e1: 'e1', t1: 't1' };
/** How a line is told, from its technology (any other is a leased E1). */
export const modeOf = (tech: string): Mode => MODES[tech] ?? 'e1';

/** What a slot carries: frame sync (or a T1's framing bit), call set-up (a PRI's D channel), your call, other calls,
 *  a free slot, or one bundled pipe (a leased line). */
export type Kind = 'sync' | 'signal' | 'yours' | 'other' | 'idle' | 'pipe';
/** A PRI's free slots: not every caller is online. */
const FREE = new Set([4, 11, 20, 26, 29]);

/** The slots of one frame, in the order they are sent (a T1's framing bit first). */
export function slotsOf(mode: Mode): Kind[] {
  if (mode === 't1') return ['sync', ...Array.from({ length: 24 }, (): Kind => 'pipe')];
  return Array.from({ length: 32 }, (_, i): Kind => {
    if (i === 0) return 'sync';
    if (mode === 'e1') return 'pipe';
    return i === 16 ? 'signal' : i === SLOT ? 'yours' : FREE.has(i) ? 'idle' : 'other';
  });
}

/** Bits per second: (bits in a frame) × 8,000 frames a second. A T1's framing bit is one bit, not a slot of eight. */
export const lineRate = (mode: Mode) => (mode === 't1' ? 24 * 8 + 1 : 32 * 8) * 8000;

/** Seconds to send one frame: 125 µs, whatever the line. */
export const FRAME_S = 1 / 8000;

export interface SlotAt { x: number; i: number }
/** The slots of a train of frames on a wire from x0 to x1 at time t, moving `dir` (1: to x1), slot 0 of each frame in
 *  front. `w`: a slot's width (a T1's framing bit is a third of it), `gap` between frames, `speed` in units a second.
 *  Only the slots wholly on the wire. */
export function train(t: number, mode: Mode, x0: number, x1: number, w: number, gap: number, speed: number, dir: 1 | -1): SlotAt[] {
  const widths = slotsOf(mode).map((_, i) => (mode === 't1' && i === 0 ? w / 3 : w));
  const frame = widths.reduce((a, b) => a + b, 0) + gap;
  const shift = (((t * speed) % frame) + frame) % frame;
  const out: SlotAt[] = [];
  for (let head = x0 + shift; head - frame < x1 + frame; head += frame) {
    let edge = head;
    widths.forEach((sw, i) => {
      const a = edge - sw;
      edge = a;
      if (a >= x0 && a + sw <= x1) out.push({ x: dir > 0 ? a : x0 + x1 - a - sw, i });
    });
  }
  return out;
}

/** A short run of bits and their pulses on the copper: +1, 0 or −1 each, and whether it's a deliberate violation (V:
 *  the same sign as the pulse before, so the far end knows it stands for zeros). An E1's HDB3 turns 0000 into 000V
 *  after an odd number of ones; a T1's example keeps its zeros short, so its AMI needs no help. */
export function lineCode(mode: Mode): { bit: number; level: number; v: boolean }[] {
  const bits = mode === 't1' ? [1, 0, 1, 1, 0, 1, 0, 0, 1, 0] : [1, 0, 1, 1, 0, 0, 0, 0, 1, 0];
  const out: { bit: number; level: number; v: boolean }[] = [];
  let last = -1, ones = 0;
  for (let i = 0; i < bits.length; i++) {
    if (mode !== 't1' && bits.slice(i, i + 4).join('') === '0000') {
      // 000V after an odd count of ones (B00V after an even one, not needed here)
      const v = ones % 2 ? last : -last;
      out.push({ bit: 0, level: 0, v: false }, { bit: 0, level: 0, v: false }, { bit: 0, level: 0, v: false }, { bit: 0, level: v, v: true });
      last = v;
      ones = 0;
      i += 3;
    } else if (bits[i]) {
      last = -last;
      ones++;
      out.push({ bit: 1, level: last, v: false });
    } else out.push({ bit: 0, level: 0, v: false });
  }
  return out;
}

/** The pulses as a path in a box: each bit a half-width pulse (return to zero) at its level. */
export function pulsePath(code: { level: number }[], x: number, y: number, w: number, h: number) {
  const step = w / code.length, mid = y + h / 2;
  let d = `M${x} ${mid}`;
  code.forEach((c, i) => {
    const a = x + i * step, top = mid - (c.level * h) / 2;
    if (c.level) d += ` H${(a + step * 0.2).toFixed(1)} V${top.toFixed(1)} H${(a + step * 0.7).toFixed(1)} V${mid}`;
  });
  return `${d} H${x + w}`;
}
