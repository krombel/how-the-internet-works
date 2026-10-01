import type { Orient, Pt } from '$core/api';

type Box = { x: number; y: number; w: number; h: number };
type Spot = Pt & { size: number };

export type LayerKind = 'ethernet' | 'vlan' | 'mpls';
export type RoleKind = 'bridge' | 'router' | 'nat' | 'endpoint';
export type Phase = 'arrive' | 'lookup' | 'fanout' | 'reply' | 'straight';

export interface Layout {
  compact?: boolean;
  road: { y: number; x0: number; x1: number };
  ends: [Spot, Spot];
  hop: Spot;
  cards: [Box, Box];
  box: Box;
  doors: Pt[];
  names: number;
  walk: number;
  text: { title: number; small: number; parcel: number };
}

const ease = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const ramp = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));
export const LOOP = 13;

export function layoutFor(orient: Orient, vp: { h: number; top: number; bottom: number }): Layout {
  if (orient === 'portrait') {
    return {
      road: { y: 1350, x0: 30, x1: 870 },
      ends: [{ x: 120, y: 1275, size: 120 }, { x: 780, y: 1275, size: 120 }],
      hop: { x: 450, y: 1130, size: 190 },
      cards: [{ x: 60, y: 150, w: 780, h: 450 }, { x: 60, y: 625, w: 780, h: 410 }],
      box: { x: 285, y: 1115, w: 330, h: 225 },
      doors: [{ x: 330, y: 1305 }, { x: 410, y: 1305 }, { x: 490, y: 1305 }, { x: 570, y: 1305 }],
      names: 1490,
      walk: 1320,
      text: { title: 58, small: 46, parcel: 1.1 },
    };
  }
  if (vp.h - vp.top - vp.bottom < 420) {
    return {
      compact: true,
      road: { y: 778, x0: 70, x1: 1530 },
      ends: [{ x: 200, y: 700, size: 135 }, { x: 1400, y: 700, size: 135 }],
      hop: { x: 800, y: 590, size: 170 },
      cards: [{ x: 60, y: 130, w: 710, h: 410 }, { x: 830, y: 130, w: 710, h: 410 }],
      box: { x: 620, y: 588, w: 360, h: 225 },
      doors: [{ x: 675, y: 770 }, { x: 760, y: 770 }, { x: 845, y: 770 }, { x: 930, y: 770 }],
      names: 860,
      walk: 740,
      text: { title: 58, small: 35, parcel: 1.1 },
    };
  }
  return {
    road: { y: 730, x0: 70, x1: 1530 },
    ends: [{ x: 215, y: 640, size: 150 }, { x: 1385, y: 640, size: 150 }],
    hop: { x: 800, y: 540, size: 190 },
    cards: [{ x: 150, y: 150, w: 580, h: 300 }, { x: 870, y: 150, w: 580, h: 300 }],
    box: { x: 600, y: 540, w: 400, h: 220 },
    doors: [{ x: 660, y: 720 }, { x: 755, y: 720 }, { x: 850, y: 720 }, { x: 945, y: 720 }],
    names: 835,
    walk: 700,
    text: { title: 40, small: 25, parcel: 1.18 },
  };
}

export function moment(time: number) {
  const t = ((time % LOOP) + LOOP) % LOOP;
  const phase: Phase = t < 2.7 ? 'arrive' : t < 5.1 ? 'lookup' : t < 7.5 ? 'fanout' : t < 10.0 ? 'reply' : 'straight';
  const start = phase === 'arrive' ? 0 : phase === 'lookup' ? 2.7 : phase === 'fanout' ? 5.1 : phase === 'reply' ? 7.5 : 10;
  const dur = phase === 'arrive' ? 2.7 : phase === 'lookup' ? 2.4 : phase === 'fanout' ? 2.4 : phase === 'reply' ? 2.5 : 3;
  return { t, phase, p: ease(clamp01((t - start) / dur)), learned: t >= 7.5 };
}

export function parcelX(L: Layout, m: ReturnType<typeof moment>) {
  const inFront = L.doors[0].x - (L.compact ? 105 : 115);
  const replyFront = L.doors[1].x + (L.compact ? 105 : 115);
  if (m.phase === 'arrive') return mix(L.ends[0].x, inFront, m.p);
  if (m.phase === 'lookup') return inFront;
  if (m.phase === 'fanout') return inFront;
  if (m.phase === 'reply') return mix(L.ends[1].x, replyFront, m.p);
  return mix(inFront, replyFront, m.p);
}

export const bob = (time: number, walking: boolean) => (walking ? -Math.abs(Math.sin(time * 7)) * 10 : 0);
