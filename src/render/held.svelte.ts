import { untrack } from 'svelte';

/** `get()` while `shown()`, else its value when `shown()` turned false: a hidden scene's clock and camera hold still
 *  (#181), so nothing that reads them redraws a scene nobody sees, and it catches up the frame it shows again. */
export function held<T>(shown: () => boolean, get: () => T): { readonly current: T } {
  const value = $derived(shown() ? get() : untrack(get));
  return { get current() { return value; } };
}
