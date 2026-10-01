// The fibre dive's maths (style-agnostic). Coordinates are in a landscape 1600×900 "track space"; portrait layouts
// rotate the track (see trackMatrix). One glass thread, told three ways by where it runs (the link's technology):
// access (a street shares it through a splitter: light home reaches every house, light up takes turns), metro (a few
// colours share it, each its own channel) and long haul (many colours, far: boosters make the fading light bright).
import type { Orient, Pt } from '$core/api';

type Mode = 'access' | 'metro' | 'long-haul';
const MODES: Record<string, Mode> = { gpon: 'access', backbone: 'long-haul' };
/** How this stretch of fibre is told, from its technology (any other fibre is metro). */
export const modeOf = (tech: string): Mode => MODES[tech] ?? 'metro';
/** The nerd tag of a metro-told thread: a cross-connect's optic puts its few colours close together (LAN-WDM), a
 *  data centre's spreads them a little wider (CWDM, 400GBASE-FR4). */
const METRO_TAGS: Record<string, string> = { 'cross-connect': 'tag.lan-wdm', 'dc-fibre': 'tag.cwdm4' };
export const metroTag = (tech: string) => METRO_TAGS[tech] ?? 'tag.dwdm';

/** SVG transform that maps track space into the scene: identity in landscape, a 90° turn in portrait
 *  (track x → up the screen), so the physical flow runs bottom → top like the portrait overview. */
export const trackMatrix = (o: Orient) => (o === 'portrait' ? 'matrix(0 -1 1 0 0 1600)' : '');
/** A track point in the scene (for things drawn upright, outside the turned track). */
export const toScene = (p: Pt, o: Orient): Pt => (o === 'portrait' ? { x: p.y, y: 1600 - p.x } : p);

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

const PERIODS = [210, 260, 170, 300, 230, 190, 280, 250];
const PHASES = [0, 0.35, 0.6, 0.15, 0.8, 0.45, 0.25, 0.7];
/** Zig-zag polyline inside the core for channel i between x = a and b (different bounce angles per colour). */
function zigzag(i: number, a: number, b: number, x0 = FIBRE.x0, x1 = FIBRE.x1): Pt[] {
  const { y, coreH } = FIBRE;
  const period = PERIODS[i % PERIODS.length], phase = PHASES[i % PHASES.length] * period;
  const h = coreH / 2 - 6;
  const pts: Pt[] = [{ x: a, y }];
  for (let x = x0 - phase; x <= x1 + period; x += period / 2) {
    const k = Math.round((x - (x0 - phase)) / (period / 2));
    if (x >= x0 && x <= x1) pts.push({ x, y: y + (k % 2 ? h : -h) });
  }
  pts.push({ x: b, y });
  return pts;
}

/** Full light route for channel i: laser → mux → zig-zag → demux → detector (reversed for right → left). */
export function channelRoute(i: number, ch: Channel): Pt[] {
  const r = [{ x: FIBRE.laserX + 40, y: ch.y }, ...zigzag(i, FIBRE.muxX + 18, FIBRE.demuxX - 18), { x: FIBRE.detectorX - 34, y: ch.y }];
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

export interface LightPulse { channel: number; head: Pt; trail: Pt[] }
function pulseAt(route: Pt[], s: number, channel: number, trail = 70, samples = 6): LightPulse {
  const tr: Pt[] = [];
  for (let k = 0; k <= samples; k++) tr.push(pointAt(route, Math.max(0, s - (trail * k) / samples)));
  return { channel, head: tr[0], trail: tr };
}
const wrap = (x: number, L: number) => ((x % L) + L) % L;

/** Light pulses for all channels at time t: each pulse = head position + short trail. */
export function fibrePulses(t: number, routes: Pt[][], perChannel = 3) {
  const out: LightPulse[] = [];
  routes.forEach((route, i) => {
    const L = polyLength(route);
    for (let p = 0; p < perChannel; p++) out.push(pulseAt(route, wrap(t * FIBRE.speed + (p * L) / perChannel + i * 97, L), i));
  });
  return out;
}

// ---------------------------------------------------------------- access: a street shares one thread
/** Houses (track y) on the left, your home among them, a splitter, the shared thread, and the exchange on the right:
 *  its laser for the light coming home (lane `down`) and its detector for the light going up (lane `up`). */
export const ACCESS = { houseX: 150, houses: [165, 355, 545, 735], you: 0, splitX: 380, x0: 470, down: 330, up: 570 };

/** The thin drop fibre from house i to the splitter (house → splitter). */
function drop(i: number): Pt[] {
  const A = ACCESS, y = A.houses[i], p0 = { x: A.houseX + 55, y }, c = { x: A.splitX - 110, y }, p1 = { x: A.splitX - 26, y: FIBRE.y };
  return Array.from({ length: 9 }, (_, k) => {
    const t = k / 8, u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
  });
}
export const accessDrops = () => ACCESS.houses.map((_, i) => drop(i));
/** Going up from house i: its drop, the splitter, the shared thread, the exchange's detector. */
const upRoute = (i: number): Pt[] => [...drop(i), ...zigzag(0, ACCESS.splitX + 26, FIBRE.demuxX - 18, ACCESS.x0), { x: FIBRE.detectorX - 34, y: ACCESS.up }];
/** Coming home to house i: the exchange's laser, the shared thread, the splitter, house i's drop. */
const downRoute = (i: number): Pt[] => [{ x: FIBRE.detectorX - 40, y: ACCESS.down }, ...zigzag(1, ACCESS.splitX + 26, FIBRE.demuxX - 18, ACCESS.x0).reverse(), ...drop(i).reverse()];
/** The two lanes' routes as drawn (the light home fans out to every house, so it has one route per house). */
export const accessRoutes = () => ({ up: ACCESS.houses.map((_, i) => upRoute(i)), down: ACCESS.houses.map((_, i) => downRoute(i)) });

/** Pulses on a shared access thread: light coming home is one pulse until the splitter, then one per house; light going
 *  up leaves each house in turn, so on the shared thread they never overlap. Channel 0 = up, 1 = down. */
export function accessPulses(t: number, routes: { up: Pt[][]; down: Pt[][] }): LightPulse[] {
  const out: LightPulse[] = [], n = ACCESS.houses.length;
  const shared = polyLength(routes.down[0]) - polyLength(drop(0));
  const Ld = Math.max(...routes.down.map(polyLength)) + 120;
  for (let p = 0; p < 3; p++) {
    const s = wrap(t * FIBRE.speed + (p * Ld) / 3, Ld);
    const houses = s < shared ? [0] : routes.down.map((_, i) => i);
    for (const i of houses) if (s <= polyLength(routes.down[i])) out.push(pulseAt(routes.down[i], s, 1));
  }
  const Lu = Math.max(...routes.up.map(polyLength));
  for (let i = 0; i < n; i++) out.push(pulseAt(routes.up[i], wrap(t * FIBRE.speed + (i * Lu) / n + 40, Lu), 0));
  return out;
}

// ---------------------------------------------------------------- long haul: many colours, far
/** Eight thinner colours, two boosters splitting the thread into three spans (≈ breaks: much longer than drawn). */
export const LONG_HAUL = {
  lanes: Array.from({ length: 8 }, (_, i): Channel => ({ y: 205 + i * 70, reverse: false })),
  amps: [643, 957],
  breaks: [487, 800, 1113],
  spanKm: 80,
  /** How faint the light gets by the end of a span (0 = as bright as it left). */
  fadeMax: 0.7,
};
/** How faint a pulse at x is: fading through each span, bright again after each booster. */
export function fadeAt(x: number): number {
  const { x0, x1 } = FIBRE, stops = [x0, ...LONG_HAUL.amps, x1];
  if (x <= x0) return 0;
  if (x >= x1) return LONG_HAUL.fadeMax;
  const i = stops.findIndex((s) => s > x) - 1;
  return (LONG_HAUL.fadeMax * (x - stops[i])) / (stops[i + 1] - stops[i]);
}
/** The distance markers: km at the start, at each booster and at the end. */
export const milestones = () => [FIBRE.x0, ...LONG_HAUL.amps, FIBRE.x1].map((x, i) => ({ x, km: i * LONG_HAUL.spanKm }));
