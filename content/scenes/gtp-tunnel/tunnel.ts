import type { Orient, Pt } from '$core/api';

export const LOOP = 16;
export type Focus = 'start' | 'end';
export type Phase = 'up' | 'unwrap-core' | 'down' | 'unwrap-tower' | 'handover' | 'new-up';

type Spot = Pt & { size: number };
type Box = { x: number; y: number; w: number; h: number };

export interface Layout {
  compact?: boolean;
  road: { y: number; x0: number; x1: number };
  phoneA: Spot;
  phoneB: Spot;
  tower: Spot;
  nextTower: Spot;
  core: Spot;
  cards: [Box, Box];
  names: number;
  walk: number;
  tags: Pt[];
  size: { text: number; big: number; tag: number; parcel: number };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const between = (a: Spot, b: Spot, t: number): Spot => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), size: a.size });

export function layoutFor(orient: Orient, focus: Focus, vp?: { h: number; top: number; bottom: number }): Layout {
  if (orient === 'portrait') {
    return {
      road: { y: 1380, x0: 30, x1: 870 },
      phoneA: { x: 80, y: 1310, size: 110 },
      phoneB: { x: 190, y: 1310, size: 110 },
      tower: { x: 255, y: 1305, size: focus === 'start' ? 210 : 140 },
      nextTower: { x: 505, y: 1305, size: focus === 'start' ? 150 : 120 },
      core: { x: 800, y: 1305, size: focus === 'end' ? 210 : 140 },
      cards: [{ x: 60, y: 170, w: 780, h: 390 }, { x: 60, y: 600, w: 780, h: 420 }],
      names: 1490,
      walk: 1350,
      tags: [{ x: 450, y: 1065 }],
      size: { text: 54, big: 58, tag: 40, parcel: 1.1 },
    };
  }
  if (vp && vp.h - vp.top - vp.bottom < 420) {
    return {
      compact: true,
      road: { y: 770, x0: 70, x1: 1530 },
      phoneA: { x: 200, y: 690, size: 135 },
      phoneB: { x: 410, y: 690, size: 135 },
      tower: { x: 620, y: 650, size: focus === 'start' ? 225 : 150 },
      nextTower: { x: 835, y: 650, size: focus === 'start' ? 225 : 150 },
      core: { x: 1270, y: 650, size: focus === 'end' ? 225 : 150 },
      cards: [{ x: 60, y: 130, w: 710, h: 410 }, { x: 830, y: 130, w: 710, h: 410 }],
      names: 860,
      walk: 740,
      tags: [],
      size: { text: 54, big: 58, tag: 40, parcel: 1.18 },
    };
  }
  return {
    road: { y: 730, x0: 70, x1: 1530 },
    phoneA: { x: 215, y: 640, size: 150 },
    phoneB: { x: 470, y: 640, size: 150 },
    tower: { x: 620, y: 590, size: focus === 'start' ? 250 : 165 },
    nextTower: { x: 840, y: 590, size: focus === 'start' ? 250 : 165 },
    core: { x: 1270, y: 590, size: focus === 'end' ? 250 : 165 },
    cards: [{ x: 150, y: 150, w: 580, h: 300 }, { x: 870, y: 150, w: 580, h: 300 }],
    names: 835,
    walk: 700,
    tags: [{ x: 440, y: 480 }, { x: 940, y: 480 }],
    size: { text: 36, big: 40, tag: 28, parcel: 1.3 },
  };
}

export function moment(time: number) {
  const t = ((time % LOOP) + LOOP) % LOOP;
  let phase: Phase = 'up';
  let p = 0;
  if (t < 4.6) { phase = 'up'; p = ease(t / 4.6); }
  else if (t < 6.2) { phase = 'unwrap-core'; p = ease((t - 4.6) / 1.6); }
  else if (t < 9.2) { phase = 'down'; p = ease((t - 6.2) / 3.0); }
  else if (t < 10.4) { phase = 'unwrap-tower'; p = ease((t - 9.2) / 1.2); }
  else if (t < 13.4) { phase = 'handover'; p = ease((t - 10.4) / 3.0); }
  else { phase = 'new-up'; p = ease((t - 13.4) / 2.6); }
  return { t, phase, p };
}

export function sceneState(time: number, L: Layout) {
  const m = moment(time);
  const phone = m.phase === 'handover' || m.phase === 'new-up' ? between(L.phoneA, L.phoneB, m.phase === 'handover' ? m.p : 1) : L.phoneA;
  const towerEnd = m.phase === 'handover' || m.phase === 'new-up' ? between(L.tower, L.nextTower, m.phase === 'handover' ? m.p : 1) : L.tower;
  const goingToCore = m.phase === 'up' || m.phase === 'unwrap-core' || m.phase === 'new-up';
  const activeStart = m.phase === 'new-up' ? L.nextTower : L.tower;
  // Doorsteps: the envelope (≈ 164 × 0.92 wide) stops beside a hop, never on it.
  const half = 80 * L.size.parcel;
  const doorOf = (spot: Spot, side: 1 | -1) => spot.x + side * (spot.size * 0.5 + half);
  const oldTowerDoor = doorOf(L.tower, 1);
  const coreDoor = doorOf(L.core, -1);
  const towerDoor = Math.min(doorOf(activeStart, 1), coreDoor - 120);
  const from = goingToCore ? towerDoor : coreDoor;
  const to = goingToCore ? coreDoor : oldTowerDoor;
  const progress = m.phase === 'unwrap-core' ? 1 : m.phase === 'unwrap-tower' ? 1 : m.phase === 'handover' ? 0 : m.p;
  const x = mix(from, to, progress);
  const y = L.walk;
  const opening = m.phase === 'unwrap-core' || m.phase === 'unwrap-tower';
  return { ...m, phone, towerEnd, activeStart, parcel: { x, y }, opening, goingToCore };
}
