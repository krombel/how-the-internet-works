// First-run coach marks (issue #21; coach.ts): which marks the sequence shows and where each card goes. Only
// CoachMarks.svelte imports this, so it is in its lazy chunk.
import type { Viewport } from '../engine/camera';
import type { Rect } from '../engine/geometry';
import type { Door } from '../model/doors';

export type CoachMark = { kind: 'expand' | 'dive'; door: Door } | { kind: 'explore'; door: null };

/** The marks, in order: the first door that opens up, the first that looks inside, then "What can I explore?". What
 *  the scene doesn't have is left out. */
export function coachMarks(doors: Door[], canExplore: boolean): CoachMark[] {
  const out: CoachMark[] = [];
  for (const kind of ['expand', 'dive'] as const) {
    const door = doors.find((d) => d.kind === kind);
    if (door) out.push({ kind, door });
  }
  if (canExplore) out.push({ kind: 'explore', door: null });
  return out;
}

/** Which side of its target a card is on. */
export type Side = 'below' | 'above' | 'right' | 'left';
export interface Placed { x: number; y: number; side: Side; tail: number }

/** Where a card of size `box` goes for a target at `t` (screen px), in the room the top bar and the caption leave
 *  (`vp.top`, `vp.bottom`): below it, else above, else beside it, `gap` away and `margin` from the window's edges;
 *  where nothing fits, on the side with the most room. `tail` is where along the card's edge facing the target its
 *  tail points from (kept clear of the card's rounded corners, `corner`). */
export function placeMark(t: Rect, box: { w: number; h: number }, vp: Viewport, gap = 14, margin = 10, corner = 26): Placed {
  const top = Math.max(margin, vp.top), bottom = vp.h - Math.max(margin, vp.bottom);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
  const x = clamp(cx - box.w / 2, margin, vp.w - margin - box.w);
  const y = clamp(cy - box.h / 2, top, bottom - box.h);
  const spots: (Omit<Placed, 'tail'> & { fits: boolean; room: number })[] = [
    { side: 'below', x, y: t.y + t.h + gap, fits: t.y + t.h + gap + box.h <= bottom, room: bottom - t.y - t.h },
    { side: 'above', x, y: t.y - gap - box.h, fits: t.y - gap - box.h >= top, room: t.y - top },
    { side: 'right', x: t.x + t.w + gap, y, fits: t.x + t.w + gap + box.w <= vp.w - margin, room: 0 },
    { side: 'left', x: t.x - gap - box.w, y, fits: t.x - gap - box.w >= margin, room: 0 },
  ];
  let s = spots.find((p) => p.fits);
  if (!s) {
    const [b, a] = spots;
    s = b.room >= a.room ? { ...b, y: clamp(b.y, margin, vp.h - margin - box.h) } : { ...a, y: clamp(a.y, margin, vp.h - margin - box.h) };
  }
  const across = s.side === 'below' || s.side === 'above';
  const len = across ? box.w : box.h;
  const tail = clamp(across ? cx - s.x : cy - s.y, Math.min(corner, len / 2), Math.max(len - corner, len / 2));
  return { x: s.x, y: s.y, side: s.side, tail };
}
