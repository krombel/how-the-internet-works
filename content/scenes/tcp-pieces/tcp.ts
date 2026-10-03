import type { Orient, Pt } from '$core/api';

export const LOOP = 18;
export type Phase = 'handshake' | 'send' | 'loss' | 'resend' | 'ready';

export type Spot = Pt & { size: number };
type Box = { x: number; y: number; w: number; h: number };

export interface Layout {
  road: { y: number; x0: number; x1: number };
  ends: [Spot, Spot];
  hop: Spot;
  home: [Spot, Spot];
  cards: [Box, Box];
  names: number;
  parcel: number;
  box: number;
  text: { label: number; title: number; tag: number };
  tags: Pt[];
  endNames: boolean;
  pothole: Pt & { w: number; h: number };
}

const LAYOUT: Record<Orient | 'compact', Layout> = {
  landscape: {
    road: { y: 730, x0: 70, x1: 1530 },
    ends: [{ x: 215, y: 640, size: 150 }, { x: 1385, y: 640, size: 150 }],
    hop: { x: 800, y: 590, size: 240 },
    home: [{ x: 330, y: 590, size: 250 }, { x: 1270, y: 590, size: 250 }],
    cards: [{ x: 150, y: 150, w: 580, h: 300 }, { x: 870, y: 150, w: 580, h: 300 }],
    names: 830,
    parcel: 1.25,
    box: 68,
    text: { label: 36, title: 40, tag: 28 },
    tags: [{ x: 440, y: 505 }, { x: 1160, y: 505 }],
    endNames: true,
    pothole: { x: 655, y: 730, w: 130, h: 42 },
  },
  compact: {
    road: { y: 770, x0: 70, x1: 1530 },
    ends: [{ x: 200, y: 690, size: 140 }, { x: 1400, y: 690, size: 140 }],
    hop: { x: 800, y: 650, size: 220 },
    home: [{ x: 330, y: 640, size: 230 }, { x: 1270, y: 640, size: 230 }],
    cards: [{ x: 60, y: 130, w: 710, h: 410 }, { x: 830, y: 130, w: 710, h: 410 }],
    names: 860,
    parcel: 1.18,
    box: 76,
    text: { label: 54, title: 58, tag: 40 },
    tags: [],
    endNames: false,
    pothole: { x: 655, y: 770, w: 130, h: 42 },
  },
  portrait: {
    road: { y: 1330, x0: 30, x1: 870 },
    ends: [{ x: 130, y: 1250, size: 120 }, { x: 770, y: 1250, size: 120 }],
    hop: { x: 450, y: 1195, size: 230 },
    home: [{ x: 250, y: 1195, size: 240 }, { x: 650, y: 1195, size: 240 }],
    cards: [{ x: 60, y: 170, w: 780, h: 390 }, { x: 60, y: 600, w: 780, h: 420 }],
    names: 1450,
    parcel: 1.35,
    box: 82,
    text: { label: 54, title: 58, tag: 40 },
    tags: [{ x: 450, y: 1530 }],
    endNames: false,
    pothole: { x: 345, y: 1330, w: 120, h: 40 },
  },
};

export function layoutFor(orient: Orient, vp: { h: number; top: number; bottom: number }): Layout {
  return orient === 'landscape' && vp.h - vp.top - vp.bottom < 420 ? LAYOUT.compact : LAYOUT[orient];
}

export function clock(time: number): number {
  return ((time % LOOP) + LOOP) % LOOP;
}

export function phase(time: number): Phase {
  const t = clock(time);
  return t < 3.2 ? 'handshake' : t < 7.2 ? 'send' : t < 10.2 ? 'loss' : t < 14 ? 'resend' : 'ready';
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));
export const ramp = (time: number, a: number, b: number) => clamp((clock(time) - a) / (b - a));
export const ease = (x: number) => {
  const k = clamp(x);
  return k * k * (3 - 2 * k);
};
export const lerp = (a: number, b: number, k: number) => a + (b - a) * ease(k);

export function roadX(L: Layout, p: number): number {
  return lerp(L.ends[1].x, L.ends[0].x, p);
}

export function ackX(L: Layout, p: number): number {
  return lerp(L.ends[0].x, L.ends[1].x, p);
}

export function serverBox(card: Box, n: number, portrait: boolean): Pt {
  const gap = cardGap(card, portrait);
  const start = card.x + card.w / 2 - gap * 3.5;
  return { x: start + (n - 1) * gap, y: card.y + (portrait ? 220 : card.h > 350 ? 205 : 160) };
}

export function shelfBox(card: Box, n: number, portrait: boolean): Pt {
  const gap = cardGap(card, portrait);
  const start = card.x + card.w / 2 - gap * 3.5;
  return { x: start + (n - 1) * gap, y: card.y + (portrait ? 220 : card.h > 350 ? 205 : 165) };
}

export function cardGap(card: Box, portrait: boolean): number {
  return portrait ? 88 : card.w > 650 ? 82 : 70;
}

export function windowStart(time: number): number {
  const t = clock(time);
  if (t < 7.2) return 1;
  if (t < 10.2) return 3;
  if (t < 14) return 5;
  return 5;
}

export function shelfFilled(time: number, n: number): boolean {
  const t = clock(time);
  if (n <= 4) return t >= 5.0;
  if (n === 5) return t >= 13.2;
  if (n <= 7) return t >= 8.1;
  return t >= 14.4;
}

export function travellingBox(time: number): { n: number; x: number | null; lost?: boolean; glow?: boolean } {
  const t = clock(time);
  if (t < 3.2) return { n: 0, x: null };
  if (t < 7.2) return { n: Math.min(4, Math.max(1, Math.floor((t - 3.2) / 0.9) + 1)), x: ramp(time, 3.2, 7.2) };
  if (t < 9.2) return { n: 5, x: ramp(time, 7.2, 9.2), lost: t > 8.35 };
  if (t < 11.1) return { n: 6, x: ramp(time, 9.2, 11.1) };
  if (t < 13.4) return { n: 5, x: ramp(time, 11.1, 13.4), glow: true };
  if (t < 15.8) return { n: 8, x: ramp(time, 13.8, 15.8) };
  return { n: 0, x: null };
}

export function ackTicket(time: number): { text: 'got' | 'missing'; x: number | null } {
  const t = clock(time);
  if (t >= 5.4 && t < 6.8) return { text: 'got', x: ramp(time, 5.4, 6.8) };
  if (t >= 9.0 && t < 12.1) return { text: 'missing', x: ramp(time, 9.0, 12.1) };
  return { text: 'got', x: null };
}

export function handshakeTicket(time: number): { key: 'hi' | 'yes' | 'great'; x: number; back: boolean; on: boolean }[] {
  const t = clock(time);
  const defs = [
    ['hi', 0.3, 1.25, false],
    ['yes', 1.25, 2.2, true],
    ['great', 2.2, 3.05, false],
  ] as const;
  return defs.map(([key, a, b, back]) => ({ key, x: ramp(time, a, b), back, on: t >= a && t < b }));
}

/** A speech ticket's width for its text. */
export const ticketW = (text: string, size: number) => text.length * size * 0.56 + size * 1.4;

/** What each card says under its boxes (keys under `label`), each about its own boxes (issue 138): the server its
 *  window of 4 (nothing during the handshake: the hello tickets are on the road, and labelled there) and sending 5
 *  again; the shelf that 5 is missing while the pieces after it arrive, the gap it keeps, and that all are in order. */
export function cardLabels(time: number): { server: string | null; shelf: string | null } {
  const b = phase(time), gap = shelfFilled(time, 6) && !shelfFilled(time, 5);
  return {
    server: b === 'handshake' ? null : b === 'resend' ? 'resend' : b === 'ready' ? 'done' : 'window',
    shelf: b === 'ready' ? 'ready' : gap ? (b === 'loss' ? 'lost' : 'gap') : null,
  };
}

/** Where the handshake's label goes: on the road, between the client and the next thing along it (`next`: the hop, or
 *  the server), and under the road in portrait, where there's no room beside. On the server's card, under its window,
 *  it read as the window's label (issue 138). */
export function helloSpot(L: Layout, portrait: boolean, client: Spot, next: Spot): Pt {
  if (portrait) return { x: (L.road.x0 + L.road.x1) / 2, y: L.road.y + 105 };
  return { x: (client.x + client.size / 2 + next.x - next.size / 2) / 2, y: L.road.y - 90 };
}

