type Orient = 'landscape' | 'portrait';
type Pt = { x: number; y: number };
type Spot = Pt & { size: number };
type Box = { x: number; y: number; w: number; h: number };

export interface Layout {
  compact?: boolean;
  road: { y: number; x0: number; x1: number };
  client: Spot;
  hop: Spot;
  server: Spot;
  cards: [Box, Box];
  names: number;
  walk: number;
  cabinet: Pt;
  splitter: Pt;
  houses: [Spot, Spot, Spot, Spot];
  timeline: Box;
  tags: Pt[];
  size: { text: number; big: number; tag: number; env: number };
}

const ease = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function layoutFor(orient: Orient, vp?: { h: number; top: number; bottom: number }): Layout {
  if (orient === 'portrait') {
    return {
      road: { y: 1380, x0: 30, x1: 870 },
      client: { x: 130, y: 1290, size: 120 },
      hop: { x: 450, y: 1230, size: 235 },
      server: { x: 770, y: 1290, size: 120 },
      cards: [{ x: 60, y: 155, w: 780, h: 520 }, { x: 60, y: 720, w: 780, h: 450 }],
      names: 1500,
      walk: 1348,
      cabinet: { x: 450, y: 320 },
      splitter: { x: 450, y: 430 },
      houses: [
        { x: 190, y: 565, size: 82 },
        { x: 365, y: 565, size: 82 },
        { x: 540, y: 565, size: 96 },
        { x: 715, y: 565, size: 82 },
      ],
      timeline: { x: 110, y: 890, w: 680, h: 110 },
      tags: [{ x: 450, y: 1188 }],
      size: { text: 40, big: 46, tag: 34, env: 0.92 },
    };
  }
  if (vp && vp.h - vp.top - vp.bottom < 420) {
    return {
      compact: true,
      road: { y: 770, x0: 70, x1: 1530 },
      client: { x: 210, y: 690, size: 135 },
      hop: { x: 800, y: 650, size: 225 },
      server: { x: 1390, y: 690, size: 135 },
      cards: [{ x: 60, y: 130, w: 710, h: 410 }, { x: 830, y: 130, w: 710, h: 410 }],
      names: 860,
      walk: 738,
      cabinet: { x: 415, y: 250 },
      splitter: { x: 415, y: 335 },
      houses: [
        { x: 165, y: 475, size: 70 },
        { x: 330, y: 475, size: 70 },
        { x: 500, y: 475, size: 84 },
        { x: 650, y: 475, size: 70 },
      ],
      timeline: { x: 890, y: 295, w: 590, h: 92 },
      tags: [],
      size: { text: 44, big: 50, tag: 36, env: 0.74 },
    };
  }
  return {
    road: { y: 730, x0: 70, x1: 1530 },
    client: { x: 215, y: 640, size: 150 },
    hop: { x: 800, y: 590, size: 250 },
    server: { x: 1385, y: 640, size: 150 },
    cards: [{ x: 115, y: 145, w: 645, h: 360 }, { x: 840, y: 145, w: 645, h: 360 }],
    names: 835,
    walk: 700,
    cabinet: { x: 440, y: 265 },
    splitter: { x: 440, y: 345 },
    houses: [
      { x: 215, y: 435, size: 68 },
      { x: 365, y: 435, size: 68 },
      { x: 515, y: 435, size: 82 },
      { x: 655, y: 435, size: 68 },
    ],
    timeline: { x: 910, y: 300, w: 500, h: 82 },
    tags: [{ x: 350, y: 540 }, { x: 1160, y: 540 }],
    size: { text: 34, big: 40, tag: 28, env: 0.82 },
  };
}

export function sceneState(time: number) {
  const t = ((time % 12) + 12) % 12;
  const slotTime = (t % 8) / 2;
  const slot = Math.floor(slotTime) % 4;
  const slotP = ease(slotTime - Math.floor(slotTime));
  return {
    down: ease((t % 4) / 4),
    keep: ease(Math.max(0, Math.min(1, (t - 2.2) / 1.1))),
    burst: ease(((t + 5) % 6) / 6),
    slot,
    slotP,
    bob: -Math.abs(Math.sin(time * 8)) * 10,
  };
}

export function branchPoint(L: Layout, house: Spot, progress: number): Pt {
  const p = Math.max(0, Math.min(1, progress));
  if (p < 0.43) {
    const k = p / 0.43;
    return { x: mix(L.cabinet.x, L.splitter.x, k), y: mix(L.cabinet.y, L.splitter.y, k) };
  }
  const k = (p - 0.43) / 0.57;
  return { x: mix(L.splitter.x, house.x, k), y: mix(L.splitter.y, house.y - house.size * 0.42, k) };
}

export function slotX(box: Box, slot: number, slots = 4) {
  return box.x + (slot / slots) * box.w;
}
