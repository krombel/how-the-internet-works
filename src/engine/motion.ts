// Motion: the easing used by every camera transition, a theme's motion preset, and how a navigation moves the camera.
export interface MotionPreset {
  /** Duration multiplier (1 = the camera's natural flight time). */
  speed: number;
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** How the camera gets to a new location (issue #41): a sideways `travel` between sibling dives, the `morph` to another
 *  place, a `slide` in place between two rungs of one stack (`rung`: layer ▲/▼, a ladder rung, down to the signal and
 *  back, issue #62), a `fly` (van Wijk) for everything else (up, down, doors, chips, Back), or, when the reader prefers
 *  reduced motion, a `fade` for all of them: the camera cuts there under a short cross-fade of the old picture, with no
 *  zoom, pan or morph. The URL, history and focus are the same whichever it is. */
export type Move = 'travel' | 'morph' | 'slide' | 'fly' | 'fade';
export function moveFor({ switched, travel, rung, still }: { switched: boolean; travel: boolean; rung: boolean; still: boolean }): Move {
  if (still) return 'fade';
  return switched ? 'morph' : rung ? 'slide' : travel ? 'travel' : 'fly';
}

/** The scene clock's rate (1 = running) eased towards `frozen ? 0 : 1` over `dt` seconds: everything that moves
 *  (traffic, dives, the night sky, the doors) runs on the scene clock, so pausing slows it all to a stop within a
 *  second, and then exactly 0 (WCAG 2.2.2). */
export function clockRate(rate: number, frozen: boolean, dt: number) {
  const next = rate + ((frozen ? 0 : 1) - rate) * Math.min(1, dt * 5);
  return frozen && next < 0.002 ? 0 : next;
}

/** How long a `slide` takes (ms, before the theme's motion speed). */
export const SLIDE_MS = 480;
/** How long a `fade` takes (ms). */
export const FADE_MS = 220;
/** A `fade`: a still copy of `pic` (the stage's SVG, as it is before the cut) laid over it, fading out on the compositor
 *  while the new picture shows through. A fade still running is dropped for the new one. */
export function fadeOver(pic: Element) {
  pic.parentElement?.querySelectorAll(':scope > .fading').forEach((e) => e.remove());
  const copy = pic.cloneNode(true) as SVGElement;
  copy.classList.add('fading');
  copy.style.animationDuration = `${FADE_MS}ms`;
  copy.addEventListener('animationend', () => copy.remove());
  pic.after(copy);
}
