import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { drawnDoors, publishDoors, type Drawn } from './drawn.svelte';

// Node resolves 'svelte' to its server build, whose untrack and flushSync do nothing: take the browser's, as the app does
vi.mock('svelte', () => import('../../node_modules/svelte/src/index-client.js' as string));

const drawn = (size: number): Drawn => ({ doors: [], badges: [], size });

describe('the doors as drawn (#137, #158)', () => {
  it('keeps a scene’s doors when its scene is swapped under the same key, and drops them when it goes', () => {
    // the scene as a path scene gets it: a new object on every frame of a place morph, with the same key, and its
    // doors laid out from it
    const s = $state({ ps: { key: 'a' }, size: 1 });
    const stop = $effect.root(() => publishDoors(() => s.ps.key, () => (void s.ps, drawn(s.size))));
    flushSync();
    expect(drawnDoors('a')?.size).toBe(1);
    s.ps = { key: 'a' };
    flushSync();
    expect(drawnDoors('a')?.size).toBe(1);
    s.size = 2;
    s.ps = { key: 'a' };
    flushSync();
    expect(drawnDoors('a')?.size).toBe(2);
    s.ps = { key: 'b' };
    flushSync();
    expect(drawnDoors('a')).toBeUndefined();
    expect(drawnDoors('b')?.size).toBe(2);
    stop();
    expect(drawnDoors('b')).toBeUndefined();
  });
});
