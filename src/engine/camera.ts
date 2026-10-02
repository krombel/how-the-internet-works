// Camera maths (renderer- and content-independent): screen = world · k + (x, y), in root-scene coordinates.
import { interpolateZoom } from 'd3-interpolate';
import type { Pt, Rect } from './geometry';

export interface Cam { x: number; y: number; k: number }
/** Viewport in CSS px, with insets reserved for UI chrome. */
export interface Viewport { w: number; h: number; top: number; bottom: number }

/** A short landscape screen (a phone on its side): the chrome slims down to leave the scene the height. The same test
 *  as the `(orientation: landscape) and (max-height: 499px)` media queries. */
export const isShort = (w: number, h: number) => w > h && h < 500;

/** Viewport for the stage; the insets come from the measured chrome (top bar, caption) when it is on screen. */
export function viewportFor(el: HTMLElement, chrome?: { top?: number; bottom?: number }): Viewport {
  const w = el.clientWidth, h = el.clientHeight;
  const small = w < 700, short = isShort(w, h);
  return {
    w, h,
    top: Math.max(short ? 50 : small ? 64 : 72, chrome?.top ?? 0),
    bottom: Math.max(short ? 60 : small ? 136 : 132, chrome?.bottom ?? 0),
  };
}

export function areaCentre(vp: Viewport): Pt {
  return { x: vp.w / 2, y: vp.top + (vp.h - vp.top - vp.bottom) / 2 };
}

export function fit(r: Rect, vp: Viewport, pad = 0.94): Cam {
  const aw = vp.w, ah = Math.max(100, vp.h - vp.top - vp.bottom);
  const k = Math.min(aw / r.w, ah / r.h) * pad;
  const c = areaCentre(vp);
  return { k, x: c.x - (r.x + r.w / 2) * k, y: c.y - (r.y + r.h / 2) * k };
}

/** Keep the zoom within [kMin, kMax], scaling about the view centre. */
export function clampCam(cam: Cam, vp: Viewport, kMin: number, kMax: number): Cam {
  const k = Math.min(Math.max(cam.k, kMin), kMax);
  if (k === cam.k) return cam;
  const c = areaCentre(vp);
  const wx = (c.x - cam.x) / cam.k, wy = (c.y - cam.y) / cam.k;
  return { k, x: c.x - wx * k, y: c.y - wy * k };
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** How far we are zoomed from a parent (k0 = its fit) into a child (its fit rect): u = 0 at the parent, 1 at the
 *  child; prox = how centred the child is (1 when the view centre is inside it). */
export function progress(cam: Cam, vp: Viewport, k0: number, child: Rect, near: Rect = child) {
  const kd = fit(child, vp).k;
  const u = Math.log(cam.k / k0) / Math.log(kd / k0);
  // distance from the view centre to the child's rect (or the wider `near` one; 0 when inside it), so a zoomed-in look
  // at one corner of a child scene still counts as being "in" it
  const c = areaCentre(vp);
  const x0 = near.x * cam.k + cam.x, y0 = near.y * cam.k + cam.y, x1 = x0 + near.w * cam.k, y1 = y0 + near.h * cam.k;
  const dx = Math.max(x0 - c.x, 0, c.x - x1), dy = Math.max(y0 - c.y, 0, c.y - y1);
  const dist = Math.hypot(dx, dy) / (Math.min(vp.w, vp.h) / 2);
  return { u, prox: 1 - smoothstep(0.35, 1.1, dist) };
}

/** van Wijk & Nuij "smooth zoom" – zooms out a little, pans, then zooms in, like Google Maps. */
export function flyInterpolator(a: Cam, b: Cam, vp: Viewport) {
  const c = areaCentre(vp);
  const view = (m: Cam): [number, number, number] => [(c.x - m.x) / m.k, (c.y - m.y) / m.k, vp.w / m.k];
  const i = (interpolateZoom as typeof interpolateZoom & { rho(r: number): typeof interpolateZoom }).rho(1.2)(view(a), view(b));
  const fn = (t: number): Cam => {
    const [cx, cy, w] = i(t);
    const k = vp.w / w;
    return { k, x: c.x - cx * k, y: c.y - cy * k };
  };
  return Object.assign(fn, { duration: Math.min(1600, Math.max(650, i.duration * 0.8)) });
}

/** Timings of a sideways travel (natural ms, before the theme's motion speed). `overlap` is the share of each leg that
 *  runs under the next one, so the move reads as out, glide, in without ever stopping at a join. The glide is slow on
 *  purpose (the reader should see where they go from and to, and what's in between): at least `minGlideMs`, longer
 *  for each more device it passes and with distance on screen. A glide that carries on from another (a quick double
 *  step) runs at `chained` of that. Passing a device it slows to `slow` of its speed, within `slowR` screens of it
 *  (`chainWarp`). `u` is the travel altitude (see `travelK`). Tuned by eye with the user (PR #37). */
export const TRAVEL = {
  outMs: 650, inMs: 700, minGlideMs: 2000, perDeviceMs: 600, perScreenMs: 800, maxGlideMs: 4000, chained: 0.75,
  overlap: 0.15, slow: 0.35, slowR: 0.25, u: 0.4,
} as const;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Sine ease-in-out for the log-zoom legs: the gentlest start (no sharp push off the dive). */
const easeInOut = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
/** A cubic from 0 to 1 that leaves with slope m (0–3 keeps it monotonic) and arrives at rest. */
const leaveAt = (t: number, m: number) => (t * t * t - 2 * t * t + t) * m + (3 - 2 * t) * t * t;

/** A sideways travel along a path: zoom out to `kT` where we are, glide the view centre along the path, then zoom in to
 *  `b`, as three overlapping legs of one continuous move. `along(u)` is the path in root coordinates (u = 0 → 1),
 *  `length` its length, `devices` how many it passes. `v0` (root units per ms) is how fast we're already gliding that
 *  way, and `chained` says we are (a step during a travel carries on without a stop, a little quicker). The returned
 *  fn takes linear time t ∈ [0, 1] (the legs ease themselves); `pos(t)` is how far along the path the view centre is. */
export function travelInterpolator(a: Cam, b: Cam, along: (u: number) => Pt, length: number, kT: number, vp: Viewport,
  { devices = 1, v0 = 0, chained = false }: { devices?: number; v0?: number; chained?: boolean } = {}) {
  const c = areaCentre(vp), T = TRAVEL;
  const centre = (m: Cam): Pt => ({ x: (c.x - m.x) / m.k, y: (c.y - m.y) / m.k });
  const ca = centre(a), cb = centre(b), p0 = along(0), p1 = along(1);
  const dA = { x: ca.x - p0.x, y: ca.y - p0.y }, dB = { x: cb.x - p1.x, y: cb.y - p1.y };
  /** A distance in root units, as screen widths at the travel zoom. */
  const screens = (d: number) => (d * kT) / vp.w;
  const leg = (k: number, off: Pt, ms: number) =>
    Math.max(ms * Math.min(1.3, Math.abs(Math.log(k / kT)) / Math.log(4)), Math.min(ms, screens(Math.hypot(off.x, off.y)) * T.perScreenMs));
  const out = leg(a.k, dA, T.outMs), inn = leg(b.k, dB, T.inMs);
  const glide = Math.min(T.maxGlideMs, Math.max(T.minGlideMs + T.perDeviceMs * Math.max(0, devices - 1), screens(length) * T.perScreenMs)) *
    (chained ? T.chained : 1);
  const t1 = out * (1 - T.overlap), t2 = t1 + glide * (1 - T.overlap), duration = Math.max(t2 + inn, t1 + glide);
  const m0 = length > 0 ? Math.min(3, Math.max(0, (v0 * glide) / length)) : 0;
  const w = (ms: number, from: number, dur: number) => (dur > 0 ? clamp01((ms - from) / dur) : ms >= from ? 1 : 0);
  const legs = (t: number) => {
    const ms = t * duration;
    return { wo: easeInOut(w(ms, 0, out)), wg: leaveAt(w(ms, t1, glide), m0), wi: easeInOut(w(ms, t2, inn)) };
  };
  const la = Math.log(a.k), lt = Math.log(kT), lb = Math.log(b.k);
  const fn = (t: number): Cam => {
    const { wo, wg, wi } = legs(t);
    const k = Math.exp(la + (lt - la) * wo + (lb - lt) * wi), p = along(wg);
    const x = p.x + dA.x * (1 - wo) + dB.x * wi, y = p.y + dA.y * (1 - wo) + dB.y * wi;
    return { k, x: c.x - x * k, y: c.y - y * k };
  };
  return Object.assign(fn, { duration, pos: (t: number) => legs(t).wg });
}

/** A scene's frame in root coordinates: local point p → (x + p.x·s, y + p.y·s). */
interface Placed { x: number; y: number; s: number }
/** A slide between two rungs of a stack (#62): one panel on screen, eased from where scene `fa`'s panel is under `a` to
 *  where scene `fb`'s is under `b` (its fit), so it lands on the new fit without zooming out. For e ∈ [0, 1] it returns
 *  the camera that puts each scene's panel there (they slide inside it, see `SceneView`). */
export function slideCams(a: Cam, b: Cam, fa: Placed, fb: Placed) {
  const at = (c: Cam, f: Placed) => ({ x: c.x + f.x * c.k, y: c.y + f.y * c.k, s: c.k * f.s });
  const camOf = (p: Placed, f: Placed): Cam => ({ k: p.s / f.s, x: p.x - (f.x * p.s) / f.s, y: p.y - (f.y * p.s) / f.s });
  const p0 = at(a, fa), p1 = at(b, fb);
  return (e: number) => {
    const p = { x: p0.x + (p1.x - p0.x) * e, y: p0.y + (p1.y - p0.y) * e, s: p0.s + (p1.s - p0.s) * e };
    return { a: camOf(p, fa), b: camOf(p, fb) };
  };
}

/** Scale a camera about a screen point. */
export function zoomAbout(cam: Cam, f: number, sx: number, sy: number): Cam {
  const k = cam.k * f;
  const wx = (sx - cam.x) / cam.k, wy = (sy - cam.y) / cam.k;
  return { k, x: sx - wx * k, y: sy - wy * k };
}
/** One frame of following a world point `w` (a caught packet): it eases towards screen point `c` at zoom `k`, a share
 *  `1 - e^(-4·dt)` of the way. Within a twentieth of a pixel it lands exactly on the target, so where it comes to rest
 *  doesn't depend on the frame timing that got it there (pixel diffs of a caught packet, #40). */
export function followStep(cam: Cam, w: Pt, k: number, c: Pt, dt: number): Cam {
  const end = { k, x: c.x - w.x * k, y: c.y - w.y * k };
  const s = toScreen(cam, w);
  if (Math.hypot(s.x - c.x, s.y - c.y) < 0.05 && Math.abs(cam.k / k - 1) < 1e-4) return end;
  const a = 1 - Math.exp(-dt * 4);
  const tk = cam.k * Math.pow(k / cam.k, a);
  const cur = toWorldPt(cam, c.x, c.y);
  const wc = { x: cur.x + (w.x - cur.x) * a, y: cur.y + (w.y - cur.y) * a };
  return { k: tk, x: c.x - wc.x * tk, y: c.y - wc.y * tk };
}
export const toScreen = (cam: Cam, p: Pt): Pt => ({ x: p.x * cam.k + cam.x, y: p.y * cam.k + cam.y });
export const toWorldPt = (cam: Cam, sx: number, sy: number): Pt => ({ x: (sx - cam.x) / cam.k, y: (sy - cam.y) / cam.k });
