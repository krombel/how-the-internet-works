// The chrome's ⋯ menu (Menu.svelte) is a list of entries, so adding a setting is adding an entry in Chrome.svelte.
import type { ICON } from './icons';

export type MenuEntry =
  /** One of a few values, shown as "Label: [a] [b]" (menuitemradio each). */
  | { kind: 'choice'; id: string; label: string; icon?: keyof typeof ICON; value: string;
      options: { id: string; label: string; lang?: string; swatch?: string }[]; pick: (id: string) => void }
  /** On or off, shown as "Label: on" (menuitemcheckbox). */
  | { kind: 'toggle'; id: string; label: string; icon?: keyof typeof ICON; on: boolean; state: string; set: (on: boolean) => void }
  /** Does something, and closes the menu (menuitem). */
  | { kind: 'action'; id: string; label: string; icon?: keyof typeof ICON; run: () => void };

/** Where a key moves the focus in a menu of `n` items from item `i`, or null if the key isn't the menu's. Up and down
 *  wrap; left and right walk the same list (mirrored right to left), so a choice's options are next to each other.
 *  With nothing focused yet (i < 0) forward goes to the first item and back to the last. */
export function menuMove(key: string, i: number, n: number, rtl = false): number | null {
  if (n === 0) return null;
  const back = i < 0 ? n - 1 : (i - 1 + n) % n, on = (i + 1) % n;
  switch (key) {
    case 'ArrowDown': return on;
    case 'ArrowUp': return back;
    case 'ArrowRight': return rtl ? back : on;
    case 'ArrowLeft': return rtl ? on : back;
    case 'Home': case 'PageUp': return 0;
    case 'End': case 'PageDown': return n - 1;
    default: return null;
  }
}
