// Camera maths (renderer- and content-independent): screen = world · k + (x, y), in root-scene coordinates.
import { interpolateZoom } from 'd3-interpolate';
import type { Pt, Rect } from './geometry';

export interface Cam { x: number; y: number; k: number }
/** Viewport in CSS px, with insets reserved for UI chrome. */
export interface Viewport { w: number; h: number; top: number; bottom: number }

/** Viewport for the stage; the insets come from the measured chrome (top bar, caption) when it is on screen. */
export function viewportFor(el: HTMLElement, chrome?: { top?: number; bottom?: number }): Viewport {
  const w = el.clientWidth, h = el.clientHeight;
  const small = w < 700;
  return { w, h, top: Math.max(small ? 64 : 72, chrome?.top ?? 0), bottom: Math.max(small ? 136 : 132, chrome?.bottom ?? 0) };
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
export function progress(cam: Cam, vp: Viewport, k0: number, child: Rect) {
  const kd = fit(child, vp).k;
  const u = Math.log(cam.k / k0) / Math.log(kd / k0);
  // distance from the view centre to the child's rect (0 when inside it), so a zoomed-in look at one corner of a
  // child scene still counts as being "in" it
  const c = areaCentre(vp);
  const x0 = child.x * cam.k + cam.x, y0 = child.y * cam.k + cam.y, x1 = x0 + child.w * cam.k, y1 = y0 + child.h * cam.k;
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

/** Scale a camera about a screen point. */
export function zoomAbout(cam: Cam, f: number, sx: number, sy: number): Cam {
  const k = cam.k * f;
  const wx = (sx - cam.x) / cam.k, wy = (sy - cam.y) / cam.k;
  return { k, x: sx - wx * k, y: sy - wy * k };
}
export const toScreen = (cam: Cam, p: Pt): Pt => ({ x: p.x * cam.k + cam.x, y: p.y * cam.k + cam.y });
export const toWorldPt = (cam: Cam, sx: number, sy: number): Pt => ({ x: (sx - cam.x) / cam.k, y: (sy - cam.y) / cam.k });
