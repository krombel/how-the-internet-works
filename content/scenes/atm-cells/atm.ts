// ATM cells, the maths of the atm-cells dive (style-agnostic): AAL5 (RFC 1483, 1993, LLC/SNAP) puts an 8-byte header in
// front of the IP packet and an 8-byte trailer (length and CRC-32) at the end, pads to a multiple of 48 and cuts it
// into 48-byte pieces; each gets a 5-byte cell header (VPI/VCI, type, priority, header check), so 53 bytes a cell.

export const CELL = 53, HEADER = 5, PAYLOAD = CELL - HEADER;
/** AAL5's own bytes around the packet: the LLC/SNAP header in front (says "IPv4") and the trailer behind. */
export const LLC = 8, TRAILER = 8;

/** How many cells a packet of `bytes` takes. */
export const cellsFor = (bytes: number) => Math.ceil((bytes + LLC + TRAILER) / PAYLOAD);
/** The bytes on the line for it. */
export const lineBytes = (bytes: number) => cellsFor(bytes) * CELL;
/** The share of the line that isn't the packet: headers, AAL5's bytes and padding. */
export const overhead = (bytes: number) => 1 - bytes / lineBytes(bytes);

/** The example: a full-size packet. */
export const PACKET = 1500;

export interface CellAt { x: number; n: number; swapped: boolean }
/** The cells on the line from x0 to x1 at time t: a stream `gap` apart moving at `speed`, numbered in order (n), the
 *  switch at `mid` having swapped their labels once past it. Only the cells wholly on the line (`w` wide). */
export function cellsOnLine(t: number, x0: number, x1: number, mid: number, w: number, gap: number, speed: number): CellAt[] {
  const shift = (((t * speed) % gap) + gap) % gap, first = Math.floor((t * speed) / gap);
  const out: CellAt[] = [];
  for (let k = 0, x = x0 + shift - gap; x <= x1; k++, x += gap) {
    if (x >= x0 && x + w <= x1) out.push({ x, n: first - k + Math.ceil((x1 - x0) / gap), swapped: x + w / 2 > mid });
  }
  return out;
}
