// Inside the video server: light from the rack switch reaches the NIC, bits enter the video app running in a container,
// and the cache either serves the video piece immediately or fetches it from the origin and stores a copy. Pure maths for
// the Svelte scene and tests.
import { along, lengths, type Orient } from '$core/api';
import type { Box, Form, Moving, Pt, RequestStage, Room, ServerLayout, ServerState, VideoStage } from './types';

const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
export const centre = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** Seconds per cache cycle. Odd human-counted cycles are hits, the next ones are misses. */
export const PERIOD = 8.5;

/** Landscape: rack switch on the left, origin high on the right; portrait runs bottom to top. Compact landscape gives
 *  every room enough width for 14 px screen text on a short phone. */
export function serverLayout(o: Orient, compact = false): ServerLayout {
  if (o === 'portrait') return {
    case: box(70, 315, 760, 990),
    rooms: {
      ssd: box(120, 365, 660, 240),
      compute: box(120, 700, 380, 300),
      memory: box(540, 700, 240, 300),
      nic: box(120, 1050, 660, 210),
    },
    inNode: { x: 450, y: 1440 }, originNode: { x: 710, y: 180 }, nodeSize: 160, originSize: 120,
    inLabel: { x: 450, y: 1560, anchor: 'middle' }, originLabel: { x: 620, y: 160, anchor: 'end' },
    inTag: { x: 478, y: 1352, anchor: 'start' }, originTag: { x: 590, y: 285, anchor: 'end' },
    statusTag: { x: 450, y: 652 }, originNote: { x: 620, y: 210, anchor: 'end' },
  };
  if (compact) return {
    case: box(260, 215, 1060, 580),
    rooms: {
      nic: box(290, 470, 250, 270),
      compute: box(570, 470, 320, 270),
      memory: box(925, 255, 360, 210),
      ssd: box(925, 505, 360, 235),
    },
    inNode: { x: 105, y: 625 }, originNode: { x: 1490, y: 215 }, nodeSize: 140, originSize: 118,
    inLabel: { x: 105, y: 760, anchor: 'middle' }, originLabel: { x: 1490, y: 335, anchor: 'middle' },
    inTag: { x: 250, y: 565, anchor: 'end' }, originTag: { x: 1415, y: 320, anchor: 'middle' },
    statusTag: { x: 600, y: 360 }, originNote: { x: 1565, y: 92, anchor: 'end' },
  };
  return {
    case: box(340, 200, 940, 580),
    rooms: {
      nic: box(375, 330, 230, 300),
      compute: box(635, 330, 300, 300),
      memory: box(965, 235, 280, 240),
      ssd: box(965, 500, 280, 250),
    },
    inNode: { x: 165, y: 480 }, originNode: { x: 1460, y: 185 }, nodeSize: 165, originSize: 125,
    inLabel: { x: 165, y: 620, anchor: 'middle' }, originLabel: { x: 1460, y: 305, anchor: 'middle' },
    inTag: { x: 165, y: 375, anchor: 'middle' }, originTag: { x: 1380, y: 345, anchor: 'middle' },
    statusTag: { x: 655, y: 705 }, originNote: { x: 1460, y: 72, anchor: 'middle' },
  };
}

function mouth(b: Box, towards: Pt): Pt {
  const c = centre(b);
  if (Math.abs(towards.x - c.x) > Math.abs(towards.y - c.y)) return { x: towards.x < c.x ? b.x : b.x + b.w, y: c.y };
  return { x: c.x, y: towards.y < c.y ? b.y : b.y + b.h };
}

export const appPoint = (L: ServerLayout): Pt => {
  const c = centre(L.rooms.compute);
  return { x: c.x, y: c.y + L.rooms.compute.h * 0.12 };
};
export const cachePoint = (L: ServerLayout): Pt => {
  const m = centre(L.rooms.memory), s = centre(L.rooms.ssd);
  return { x: (m.x + s.x) / 2, y: (m.y + s.y) / 2 };
};

export function requestPath(L: ServerLayout): Pt[] {
  return [L.inNode, mouth(L.rooms.nic, L.inNode), centre(L.rooms.nic), appPoint(L)];
}

export function hitPath(L: ServerLayout): Pt[] {
  return [cachePoint(L), appPoint(L), centre(L.rooms.nic), mouth(L.rooms.nic, L.inNode), L.inNode];
}

export function originPath(L: ServerLayout): Pt[] {
  return [appPoint(L), L.originNode];
}

export function missReturnPath(L: ServerLayout): Pt[] {
  return [L.originNode, appPoint(L), centre(L.rooms.memory), centre(L.rooms.ssd), appPoint(L), centre(L.rooms.nic), mouth(L.rooms.nic, L.inNode), L.inNode];
}

const hiddenReq = (p: Pt): Moving<RequestStage> => ({ p, stage: 'hidden', alpha: 0 });
const hiddenVideo = (p: Pt): Moving<VideoStage> => ({ p, stage: 'hidden', alpha: 0 });

function fade(u: number) {
  return Math.min(1, u / 0.12, (1 - u) / 0.12);
}

function move<S extends string>(pts: Pt[], phase: number, start: number, end: number, stage: (seg: number) => S): Moving<S> | null {
  if (phase < start || phase > end) return null;
  const u = (phase - start) / (end - start);
  const { p, seg } = along(pts, u);
  return { p, stage: stage(seg), alpha: fade(u) };
}

/** The carriers for this frame. With reduced motion, hold a readable cache-hit pose at the app. */
export function serverAt(t: number, still: boolean, L: ServerLayout, hasOrigin = true): ServerState {
  const app = appPoint(L);
  if (still) return {
    hit: true,
    phase: 0.28,
    request: { p: app, stage: 'app', alpha: 1 },
    video: hiddenVideo(cachePoint(L)),
    copyAlpha: 1,
    originActive: false,
    statusAlpha: 1,
  };

  const raw = t / PERIOD;
  const cycle = Math.floor(raw);
  const phase = ((raw % 1) + 1) % 1;
  const hit = !hasOrigin || cycle % 2 === 0;
  const reqIn = move(requestPath(L), phase, 0.03, hit ? 0.38 : 0.28, (seg) => (seg < 2 ? 'in' : 'app'));
  if (hit) {
    const video = move(hitPath(L), phase, 0.48, 0.96, (seg) => (seg < 1 ? 'cache' : seg < 3 ? 'out' : 'out'));
    return {
      hit, phase,
      request: reqIn ?? hiddenReq(app),
      video: video ?? hiddenVideo(cachePoint(L)),
      copyAlpha: 1,
      originActive: false,
      statusAlpha: Math.min(1, Math.max(0, (phase - 0.24) / 0.12, (0.98 - phase) / 0.12)),
    };
  }

  const reqOrigin = move(originPath(L), phase, 0.30, 0.50, () => 'origin');
  const video = move(missReturnPath(L), phase, 0.55, 0.97, (seg) => (seg < 1 ? 'origin' : seg < 4 ? 'store' : 'out'));
  return {
    hit, phase,
    request: reqIn ?? reqOrigin ?? hiddenReq(app),
    video: video ?? hiddenVideo(L.originNode),
    copyAlpha: Math.min(1, Math.max(0, (phase - 0.69) / 0.08)),
    originActive: phase >= 0.30 && phase <= 0.64,
    statusAlpha: Math.min(1, Math.max(0, (phase - 0.24) / 0.12, (0.98 - phase) / 0.12)),
  };
}

/** How the request looks on the incoming link. */
export const formFor = (look: string): Form => (look === 'fibre' ? 'light' : 'parcel');

export const roomOrder: Room[] = ['nic', 'compute', 'memory', 'ssd'];

export function internalPath(L: ServerLayout): Pt[] {
  return [mouth(L.rooms.nic, L.inNode), centre(L.rooms.nic), appPoint(L), centre(L.rooms.memory), centre(L.rooms.ssd)];
}
