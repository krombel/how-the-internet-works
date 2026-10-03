// The doors each path scene drew last, by its key (#137): their badges are laid out with the scene's text as placed
// (lit labels keep off it), so what a tap, a hover or a coach card aims at is read from here, exactly as drawn.
import type { Badge, Door } from '../model/doors';

export interface Drawn { doors: Door[]; badges: Badge[]; size: number }

// A plain map, kept current, and a signal that it changed: an effect's teardown reads state as it was before the
// flush, so a copy of the map made there would put back what was just taken out and drop what was just drawn (#158).
const by = new Map<string, Drawn>();
let changed = $state.raw({});

export const drawnDoors = (key: string): Drawn | undefined => (void changed, by.get(key));
/** `key`'s doors as drawn now; `null` when its scene is gone. */
export function drawDoors(key: string, d: Drawn | null) {
  if (d) by.set(key, d); else if (!by.delete(key)) return;
  changed = {};
}
/** A scene's doors, published while it is mounted (call it as a component initialises). They are taken back when its
 *  key changes or it goes, not when its scene does: a place morph draws a new scene under the same key every frame. */
export function publishDoors(key: () => string, drawn: () => Drawn) {
  const k = $derived(key());
  $effect(() => drawDoors(k, drawn()));
  $effect(() => { const mine = k; return () => drawDoors(mine, null); });
}
