import type { Orient, Pt } from '$core/api';

export const LOOP = 12;

type Spot = Pt & { size: number };
type Box = { x: number; y: number; w: number; h: number };

export interface Layout {
  compact?: boolean;
  road: { y: number; x0: number; x1: number };
  phone: Spot;
  ap: Spot;
  router: Spot;
  laptop: Spot;
  cards: [Box, Box];
  names: number;
  walk: number;
  tags: Pt[];
  size: { text: number; big: number; tag: number; envelope: number };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mod = (time: number) => ((time % LOOP) + LOOP) % LOOP;

export function layoutFor(orient: Orient, vp: { h: number; top: number; bottom: number }): Layout {
  if (orient === 'portrait') {
    return {
      road: { y: 1340, x0: 30, x1: 870 },
      phone: { x: 140, y: 1255, size: 124 },
      ap: { x: 450, y: 1195, size: 216 },
      router: { x: 760, y: 1255, size: 120 },
      laptop: { x: 280, y: 1270, size: 86 },
      cards: [{ x: 60, y: 170, w: 780, h: 520 }, { x: 60, y: 730, w: 780, h: 320 }],
      names: 1466,
      walk: 1294,
      tags: [{ x: 450, y: 1090 }],
      size: { text: 40, big: 52, tag: 38, envelope: 1.22 },
    };
  }
  if (vp.h - vp.top - vp.bottom < 420) {
    return {
      compact: true,
      road: { y: 770, x0: 70, x1: 1530 },
      phone: { x: 210, y: 690, size: 135 },
      ap: { x: 800, y: 650, size: 220 },
      router: { x: 1390, y: 690, size: 135 },
      laptop: { x: 420, y: 704, size: 95 },
      cards: [{ x: 50, y: 128, w: 730, h: 410 }, { x: 820, y: 128, w: 730, h: 410 }],
      names: 858,
      walk: 724,
      tags: [],
      size: { text: 38, big: 48, tag: 34, envelope: 1.04 },
    };
  }
  return {
    road: { y: 730, x0: 70, x1: 1530 },
    phone: { x: 225, y: 640, size: 150 },
    ap: { x: 800, y: 590, size: 240 },
    router: { x: 1375, y: 640, size: 150 },
    laptop: { x: 420, y: 660, size: 110 },
    cards: [{ x: 120, y: 145, w: 660, h: 345 }, { x: 835, y: 145, w: 645, h: 345 }],
    names: 835,
    walk: 690,
    tags: [{ x: 465, y: 510 }, { x: 1135, y: 510 }],
    size: { text: 31, big: 40, tag: 28, envelope: 1.0 },
  };
}

export type WalkKind = 'radio' | 'cable' | null;
export type AirPhase = 'listen' | 'wait' | 'send' | 'clash' | 'noack' | 'longer' | 'retry' | 'sifs' | 'ack' | 'rest';

export interface SceneState {
  t: number;
  walk: { x: number; y: number; kind: WalkKind; p: number; swapping: boolean; reverse: boolean } | null;
  air: { phase: AirPhase; p: number; retry: boolean; ack: boolean; clash: boolean; noAck: boolean; cursor: number };
}

function airState(t: number): SceneState['air'] {
  let phase: AirPhase = 'rest';
  let p = 1;
  let cursor = 3;
  if (t < 1.05) { phase = 'listen'; p = t / 1.05; cursor = ease(p) * 0.45; }
  else if (t < 2.35) { phase = 'wait'; p = (t - 1.05) / 1.3; cursor = 0.45 + ease(p) * 0.75; }
  else if (t < 3.05) { phase = 'send'; p = (t - 2.35) / 0.7; cursor = 1.2 + ease(p) * 0.65; }
  else if (t < 3.75) { phase = 'clash'; p = (t - 3.05) / 0.7; cursor = 2; }
  else if (t < 4.45) { phase = 'noack'; p = (t - 3.75) / 0.7; cursor = 2; }
  else if (t < 5.85) { phase = 'longer'; p = (t - 4.45) / 1.4; cursor = 1.15 - ease(p) * 0.25; }
  else if (t < 6.95) { phase = 'retry'; p = (t - 5.85) / 1.1; cursor = 1.35 + ease(p) * 0.65; }
  else if (t < 7.35) { phase = 'sifs'; p = (t - 6.95) / 0.4; cursor = 2 + ease(p) * 0.5; }
  else if (t < 8.3) { phase = 'ack'; p = (t - 7.35) / 0.95; cursor = 2.5 + ease(p) * 0.5; }
  return { phase, p: ease(p), retry: t >= 5.85 && t < 7.4, ack: t >= 7.35 && t < 8.8, clash: t >= 3.05 && t < 3.95, noAck: t >= 3.75 && t < 4.65, cursor };
}

export function sceneState(time: number, L: Layout, down: boolean): SceneState {
  const t = mod(time);
  const air = airState(t);
  const routerEdge = { ...L.router, x: L.router.x - L.router.size * 1.25 };
  const leg = (from: Spot, to: Spot, a: number, b: number, kind: WalkKind, reverse: boolean, swapping = false) => {
    const p = ease((t - a) / (b - a));
    return { x: mix(from.x, to.x, p), y: L.walk, kind, p, swapping, reverse };
  };
  let walk: SceneState['walk'] = null;
  if (down) {
    if (t < 2.15) walk = leg(routerEdge, L.ap, 0, 2.15, 'cable', true);
    else if (t < 3.45) walk = { x: L.ap.x, y: L.walk, kind: t < 2.8 ? 'cable' : 'radio', p: ease((t - 2.15) / 1.3), swapping: true, reverse: true };
    else if (t < 6.15) walk = leg(L.ap, L.phone, 3.45, 6.15, 'radio', true);
  } else {
    if (t < 2.3) walk = leg(L.phone, L.ap, 0, 2.3, 'radio', false);
    else if (t < 3.65) walk = { x: L.ap.x, y: L.walk, kind: t < 3 ? 'radio' : 'cable', p: ease((t - 2.3) / 1.35), swapping: true, reverse: false };
    else if (t < 6.25) walk = leg(L.ap, routerEdge, 3.65, 6.25, 'cable', false);
  }
  return { t, walk, air };
}

export const bob = (time: number, moving: boolean) => moving ? -Math.abs(Math.sin(time * 12)) * 10 : 0;
export const airPulse = (time: number) => 0.5 + Math.sin(time * 5) * 0.5;
