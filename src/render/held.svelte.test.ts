import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { held } from './held.svelte';

// Node resolves 'svelte' to its server build, whose untrack and flushSync do nothing: take the browser's, as the app does
vi.mock('svelte', () => import('../../node_modules/svelte/src/index-client.js' as string));

describe('a hidden scene’s clock and camera (#181)', () => {
  it('follows while shown, holds while hidden and catches up when shown again', () => {
    const s = $state({ shown: true, time: 1 });
    let runs = 0, seen = 0;
    const stop = $effect.root(() => {
      const clock = held(() => s.shown, () => s.time);
      $effect(() => { seen = clock.current; runs++; });
    });
    flushSync();
    expect([seen, runs]).toEqual([1, 1]);
    s.time = 2;
    flushSync();
    expect([seen, runs]).toEqual([2, 2]);
    // hiding takes the clock as it is then, and nothing reading it reruns while time goes on
    s.time = 3;
    s.shown = false;
    flushSync();
    expect([seen, runs]).toEqual([3, 3]);
    for (const t of [4, 5, 6]) { s.time = t; flushSync(); }
    expect([seen, runs]).toEqual([3, 3]);
    s.shown = true;
    flushSync();
    expect([seen, runs]).toEqual([6, 4]);
    s.time = 7;
    flushSync();
    expect([seen, runs]).toEqual([7, 5]);
    stop();
  });
});
