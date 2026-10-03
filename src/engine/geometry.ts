// Geometry shared by the engine and scenes: world sizes, nesting scale and quadratic Bézier helpers.
import type { Orient } from '../define';

export type { Orient };
/** Every scene is authored in a world of this size (landscape: the path runs left → right; portrait: bottom → top). */
export const WORLD_SIZE: Record<Orient, { w: number; h: number }> = {
  landscape: { w: 1600, h: 900 },
  portrait: { w: 900, h: 1600 },
};
/** A child scene is nested at this scale inside the thing it explains (semantic zoom). */
export const DETAIL_SCALE = 0.1;

export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface Curve { p0: Pt; c: Pt; p1: Pt }

export function bezier(l: Curve, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * l.p0.x + 2 * u * t * l.c.x + t * t * l.p1.x,
    y: u * u * l.p0.y + 2 * u * t * l.c.y + t * t * l.p1.y,
  };
}
export function bezierAngle(l: Curve, t: number): number {
  const dx = 2 * (1 - t) * (l.c.x - l.p0.x) + 2 * t * (l.p1.x - l.c.x);
  const dy = 2 * (1 - t) * (l.c.y - l.p0.y) + 2 * t * (l.p1.y - l.c.y);
  return Math.atan2(dy, dx);
}
export const curvePath = (l: Curve) => `M${l.p0.x.toFixed(1)} ${l.p0.y.toFixed(1)} Q${l.c.x.toFixed(1)} ${l.c.y.toFixed(1)} ${l.p1.x.toFixed(1)} ${l.p1.y.toFixed(1)}`;

/** A gently curved link between the edges of two round-ish nodes. `bend` is a fraction of the length (+ = left of travel). */
export function curveBetween(a: Pt & { size: number }, b: Pt & { size: number }, bend: number): Curve {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const p0 = { x: a.x + ux * a.size * 0.45, y: a.y + uy * a.size * 0.45 };
  const p1 = { x: b.x - ux * b.size * 0.45, y: b.y - uy * b.size * 0.45 };
  const m = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  return { p0, c: { x: m.x - uy * L * bend, y: m.y + ux * L * bend }, p1 };
}

export function curveBounds(l: Curve, pad = 0): Rect {
  const xs = [l.p0.x, l.c.x, l.p1.x], ys = [l.p0.y, l.c.y, l.p1.y];
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

/** The smallest rect holding both. */
export const union = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** How far along a polyline each of its points is: 0 at the first, its whole length at the last. */
export const lengths = (pts: Pt[]) => pts.reduce<number[]>((c, q, i) => [...c, i ? c[i - 1] + Math.hypot(q.x - pts[i - 1].x, q.y - pts[i - 1].y) : 0], []);

/** The point at fraction f (0–1) of a polyline's length, and which segment it is on. */
export function along(pts: Pt[], f: number): { p: Pt; seg: number } {
  const cum = lengths(pts), d = Math.min(1, Math.max(0, f)) * cum[cum.length - 1];
  let i = 0;
  while (i < pts.length - 2 && cum[i + 1] < d) i++;
  const u = (d - cum[i]) / (cum[i + 1] - cum[i] || 1);
  return { p: { x: lerp(pts[i].x, pts[i + 1].x, u), y: lerp(pts[i].y, pts[i + 1].y, u) }, seg: i };
}
