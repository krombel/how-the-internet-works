import type { Orient, Pt } from '$core/api';

export const LOOP = 12;
/** Whose view: the phone's, the tower's, or (in 3G, where RLC ends in the radio controller) the one behind it. */
export type Focus = 'tower' | 'phone' | 'core';
export type Phase = 'request' | 'grant' | 'send' | 'nack' | 'combine' | 'ack';

type Spot = Pt & { size: number };
type Box = { x: number; y: number; w: number; h: number };

export interface Layout {
  compact?: boolean;
  road: { y: number; x0: number; x1: number };
  phone: Spot;
  tower: Spot;
  core: Spot;
  cards: [Box, Box];
  names: number;
  walk: number;
  schedule: { x: number; y: number; w: number; row: number };
  harq: { y: number; gap: number };
  tags: Pt[];
  size: { title: number; text: number; small: number; tag: number; piece: number; ticket: number };
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
export const mix = (a: number, b: number, t: number) => a + (b - a) * ease(t);

export function layoutFor(orient: Orient, focus: Focus, vp: { h: number; top: number; bottom: number }): Layout {
  if (orient === 'portrait') {
    return {
      road: { y: 1385, x0: 30, x1: 870 },
      phone: { x: 150, y: 1280, size: focus === 'phone' ? 245 : 125 },
      tower: { x: 450, y: 1235, size: focus === 'tower' ? 245 : 165 },
      core: { x: 750, y: 1280, size: focus === 'core' ? 245 : 135 },
      cards: [{ x: 60, y: 160, w: 780, h: 600 }, { x: 60, y: 790, w: 780, h: 360 }],
      names: 1490,
      walk: 1355,
      schedule: { x: 125, y: 555, w: 650, row: 72 },
      harq: { y: 925, gap: 180 },
      tags: [{ x: 450, y: 1080 }],
      size: { title: 54, text: 42, small: 28, tag: 40, piece: 80, ticket: 1.0 },
    };
  }
  if (vp.h - vp.top - vp.bottom < 420) {
    return {
      compact: true,
      road: { y: 770, x0: 70, x1: 1530 },
      phone: { x: 245, y: 690, size: focus === 'phone' ? 230 : 135 },
      tower: { x: 800, y: 650, size: focus === 'tower' ? 230 : 155 },
      core: { x: 1345, y: 690, size: focus === 'core' ? 230 : 130 },
      cards: [{ x: 60, y: 118, w: 710, h: 440 }, { x: 830, y: 118, w: 710, h: 440 }],
      names: 860,
      walk: 740,
      schedule: { x: 100, y: 368, w: 630, row: 66 },
      harq: { y: 326, gap: 150 },
      tags: [],
      size: { title: 54, text: 44, small: 34, tag: 40, piece: 78, ticket: 0.96 },
    };
  }
  return {
    road: { y: 730, x0: 70, x1: 1530 },
    phone: { x: 245, y: 640, size: focus === 'phone' ? 250 : 150 },
    tower: { x: 800, y: 590, size: focus === 'tower' ? 250 : 170 },
    core: { x: 1345, y: 640, size: focus === 'core' ? 250 : 145 },
    cards: [{ x: 100, y: 140, w: 650, h: 360 }, { x: 850, y: 140, w: 650, h: 360 }],
    names: 835,
    walk: 700,
    schedule: { x: 150, y: 385, w: 550, row: 42 },
    harq: { y: 300, gap: 140 },
    tags: [{ x: 430, y: 495 }, { x: 1180, y: 495 }],
    size: { title: 40, text: 34, small: 27, tag: 28, piece: 104, ticket: 0.76 },
  };
}

export function clock(time: number): number {
  return ((time % LOOP) + LOOP) % LOOP;
}

export function sceneState(time: number) {
  const t = clock(time);
  let phase: Phase = 'request';
  let p = 0;
  if (t < 1.8) { phase = 'request'; p = ease(t / 1.8); }
  else if (t < 3.4) { phase = 'grant'; p = ease((t - 1.8) / 1.6); }
  else if (t < 5.3) { phase = 'send'; p = ease((t - 3.4) / 1.9); }
  else if (t < 6.8) { phase = 'nack'; p = ease((t - 5.3) / 1.5); }
  else if (t < 9.4) { phase = 'combine'; p = ease((t - 6.8) / 2.6); }
  else { phase = 'ack'; p = ease((t - 9.4) / 2.6); }
  return { t, phase, p };
}

export function pieceOffset(i: number, phase: Phase, p: number): number {
  if (phase === 'send') return clamp(p * 1.4 - i * 0.22);
  if (phase === 'nack' || phase === 'combine' || phase === 'ack') return 1;
  return 0;
}

export function combineAmount(phase: Phase, p: number): number {
  if (phase === 'combine') return p;
  return phase === 'ack' ? 1 : 0;
}
