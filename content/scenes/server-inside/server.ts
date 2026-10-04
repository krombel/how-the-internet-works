// Inside the video server: light from the rack switch reaches the NIC, bits enter the video app running in a container,
// and the cache either serves the video piece immediately or fetches it from the origin and stores a copy. In 1995 (#59)
// the server is a tower instead: the request comes off the hub's cable, the one web program reads the file from its hard
// disk, and the page or its picture goes back. Pure maths for the Svelte scene and tests.
import { along, lengths, type Orient } from '$core/api';
import type { Box, FileStage, Form, Moving, Pt, RequestStage, Room, ServerLayout, ServerState, TowerLayout, TowerRoom, TowerState, VideoStage } from './types';

const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
export const centre = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
/** A room's floor, between its head (`Room`'s title band, 1.9 × its text) and its line of text (or a 14-unit margin):
 *  where its things stand, and how tall it is. On a short landscape screen the head's text grows to stay legible
 *  (`legibleSize`) as the camera zooms out, so it can fill the room: the floor is then 0 tall, never less (issue 182). */
export function roomFloor(b: Box, head: number, body: number): { top: number; bottom: number; mid: number; h: number } {
  const top = b.y + head * 1.9, bottom = b.y + b.h - (body ? body * 1.8 : 14);
  return { top, bottom, mid: (top + bottom) / 2, h: Math.max(0, bottom - top) };
}

/** How the server is drawn, by its node: the 1995 web server is a tower with one disk; anything else is a cache. */
export const modeOf = (node: string): 'tower' | 'cache' => (node === 'web-server' ? 'tower' : 'cache');

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
      statusAlpha: Math.min(1, Math.max(0, Math.min((phase - 0.24) / 0.12, (0.98 - phase) / 0.12))),
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
    statusAlpha: Math.min(1, Math.max(0, Math.min((phase - 0.24) / 0.12, (0.98 - phase) / 0.12))),
  };
}

/** How the request looks on the incoming link. */
export const formFor = (look: string): Form => (look === 'fibre' ? 'light' : 'parcel');

export const roomOrder: Room[] = ['nic', 'compute', 'memory', 'ssd'];

export function internalPath(L: ServerLayout): Pt[] {
  return [mouth(L.rooms.nic, L.inNode), centre(L.rooms.nic), appPoint(L), centre(L.rooms.memory), centre(L.rooms.ssd)];
}

/** The tower (1995): the hub on the left, or below in portrait; the disk at the top of the case, the network card at
 *  the bottom. Compact landscape gives every room enough width for 14 px screen text on a short phone. */
export function towerLayout(o: Orient, compact = false): TowerLayout {
  if (o === 'portrait') return {
    case: box(110, 250, 680, 1040),
    rooms: {
      disk: box(160, 305, 580, 290),
      compute: box(160, 635, 580, 290),
      nic: box(160, 965, 580, 270),
    },
    inNode: { x: 450, y: 1450 }, nodeSize: 160,
    inLabel: { x: 450, y: 1565, anchor: 'middle' }, inTag: { x: 478, y: 1345, anchor: 'start' },
    statusTag: { x: 450, y: 180 },
  };
  if (compact) return {
    case: box(260, 200, 1080, 600),
    rooms: {
      nic: box(290, 460, 300, 300),
      compute: box(620, 460, 340, 300),
      disk: box(990, 245, 320, 515),
    },
    inNode: { x: 105, y: 610 }, nodeSize: 140,
    inLabel: { x: 105, y: 745, anchor: 'middle' }, inTag: { x: 250, y: 550, anchor: 'end' },
    statusTag: { x: 625, y: 355 },
  };
  return {
    case: box(380, 160, 860, 640),
    rooms: {
      nic: box(415, 330, 250, 300),
      compute: box(695, 475, 510, 290),
      disk: box(695, 200, 510, 245),
    },
    inNode: { x: 170, y: 480 }, nodeSize: 165,
    inLabel: { x: 170, y: 620, anchor: 'middle' }, inTag: { x: 170, y: 375, anchor: 'middle' },
    statusTag: { x: 810, y: 850 },
  };
}

/** Where the web program sits in the computer, and where the head reads the disk. */
export const programPoint = (L: TowerLayout): Pt => centre(L.rooms.compute);
export const diskPoint = (L: TowerLayout): Pt => centre(L.rooms.disk);

/** In from the hub, through the card to the program, which asks the disk. */
export function askPath(L: TowerLayout): Pt[] {
  return [L.inNode, mouth(L.rooms.nic, L.inNode), centre(L.rooms.nic), programPoint(L), diskPoint(L)];
}

/** The file off the disk, through the program and the card, back to the hub. */
export function filePath(L: TowerLayout): Pt[] {
  return [diskPoint(L), programPoint(L), centre(L.rooms.nic), mouth(L.rooms.nic, L.inNode), L.inNode];
}

export const towerRooms: TowerRoom[] = ['nic', 'compute', 'disk'];

/** The carriers for this frame: odd human-counted cycles fetch the page, the next ones its picture. With reduced
 *  motion, hold the page leaving the program, with its status card up. */
export function towerAt(t: number, still: boolean, L: TowerLayout): TowerState {
  if (still) return {
    file: 'page',
    request: { p: programPoint(L), stage: 'hidden', alpha: 0 },
    reply: { p: along(filePath(L), 0.38).p, stage: 'out', alpha: 1 },
    reading: 0,
    statusAlpha: 1,
  };
  const raw = t / PERIOD;
  const phase = ((raw % 1) + 1) % 1;
  const file = Math.floor(raw) % 2 === 0 ? 'page' : 'picture';
  const request = move(askPath(L), phase, 0.03, 0.4, (seg): RequestStage => (seg < 2 ? 'in' : seg < 3 ? 'app' : 'disk'));
  const reply = move(filePath(L), phase, 0.5, 0.96, (seg): FileStage => (seg < 1 ? 'disk' : 'out'));
  return {
    file,
    request: request ?? { p: L.inNode, stage: 'hidden', alpha: 0 },
    reply: reply ?? { p: diskPoint(L), stage: 'hidden', alpha: 0 },
    reading: Math.max(0, Math.min(1, (phase - 0.36) / 0.04, (0.56 - phase) / 0.04)),
    statusAlpha: Math.min(1, Math.max(0, Math.min((phase - 0.5) / 0.08, (0.98 - phase) / 0.08))),
  };
}
