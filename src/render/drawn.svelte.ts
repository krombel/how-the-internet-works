// The doors each path scene drew last, by its key (#137): their badges are laid out with the scene's text as placed
// (lit labels keep off it), so what a tap, a hover or a coach card aims at is read from here, exactly as drawn.
import { untrack } from 'svelte';
import type { Badge, Door } from '../model/doors';

export interface Drawn { doors: Door[]; badges: Badge[]; size: number }

const at = $state<{ by: ReadonlyMap<string, Drawn> }>({ by: new Map() });

export const drawnDoors = (key: string): Drawn | undefined => at.by.get(key);
/** `key`'s doors as drawn now; `null` when its scene is gone. */
export function drawDoors(key: string, d: Drawn | null) {
  const by = new Map(untrack(() => at.by));
  if (d) by.set(key, d); else by.delete(key);
  at.by = by;
}
