// The fibre dive's maths (style-agnostic). Coordinates are in a landscape 1600×900 "track space"; portrait layouts
// rotate the track (see trackMatrix). Two modes: DWDM (four colours, all one way) and GPON (one colour up the street,
// another coming home).
import type { Orient, Pt } from '$core/api';

/** SVG transform that maps track space into the scene: identity in landscape, a 90° turn in portrait
 *  (track x → up the screen), so the physical flow runs bottom → top like the portrait overview. */
export const trackMatrix = (o: Orient) => (o === 'portrait' ? 'matrix(0 -1 1 0 0 1600)' : '');

export const FIBRE = {
  x0: 330, x1: 1270, y: 450,
  coreH: 90, cladH: 210,
  muxX: 250, demuxX: 1350,
  laserX: 70, detectorX: 1530,
  speed: 380,
};

/** A light channel: its lane at the lasers, and whether it runs right → left (GPON's "coming home" colour). */
export interface Channel { y: number; reverse: boolean }
export const DWDM: Channel[] = [270, 390, 510, 630].map((y) => ({ y, reverse: false }));
export const GPON: Channel[] = [{ y: 330, reverse: false }, { y: 570, reverse: true }];

/** Zig-zag polyline inside the core for channel i (different bounce angles per colour). */
function fibrePath(i: number): Pt[] {
  const { x0, x1, y, coreH } = FIBRE;
  const period = [210, 260, 170, 300][i % 4];
  const phase = [0, 0.35, 0.6, 0.15][i % 4] * period;
  const h = coreH / 2 - 6;
  const pts: Pt[] = [{ x: FIBRE.muxX + 18, y }];
  for (let x = x0 - phase; x <= x1 + period; x += period / 2) {
    const k = Math.round((x - (x0 - phase)) / (period / 2));
    const xx = Math.min(Math.max(x, x0), x1);
    if (x >= x0 && x <= x1) pts.push({ x: xx, y: y + (k % 2 ? h : -h) });
  }
  pts.push({ x: FIBRE.demuxX - 18, y });
  return pts;
}

/** Full light route for channel i: laser → mux → zig-zag → demux → detector (reversed for right → left). */
export function channelRoute(i: number, ch: Channel): Pt[] {
  const r = [{ x: FIBRE.laserX + 40, y: ch.y }, ...fibrePath(i), { x: FIBRE.detectorX - 34, y: ch.y }];
  return ch.reverse ? r.reverse() : r;
}

function polyLength(pts: Pt[]) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return L;
}
function pointAt(pts: Pt[], s: number): Pt {
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (s <= d) {
      const f = d ? s / d : 0;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f };
    }
    s -= d;
  }
  return pts[pts.length - 1];
}

/** Light pulses for all channels at time t: each pulse = head position + short trail. */
export function fibrePulses(t: number, routes: Pt[][], perChannel = 3, trail = 70, trailSamples = 6) {
  const out: { channel: number; head: Pt; trail: Pt[] }[] = [];
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const L = polyLength(route);
    for (let p = 0; p < perChannel; p++) {
      const s = ((t * FIBRE.speed + (p * L) / perChannel + i * 97) % L + L) % L;
      const tr: Pt[] = [];
      for (let k = 0; k <= trailSamples; k++) tr.push(pointAt(route, Math.max(0, s - (trail * k) / trailSamples)));
      out.push({ channel: i, head: tr[0], trail: tr });
    }
  }
  return out;
}
