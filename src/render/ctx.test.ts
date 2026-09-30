import { beforeAll, describe, expect, it, vi } from 'vitest';
import type * as Ctx from './ctx';
import type * as State from '../state.svelte';
import { stubBrowser } from '../test/stub-browser';

// a dive drawn at scene scale 0.4 under a camera at 0.5: one world unit is 0.2 px on screen
const world = vi.hoisted(() => ({ cam: { k: 0.5 } }));
vi.mock('svelte', async (orig) => ({
  ...(await orig<typeof import('svelte')>()),
  getContext: (key: string) => (key === 'world' ? world : { frame: { s: 0.4 } }),
}));

let ctx: typeof Ctx, state: typeof State;
beforeAll(async () => {
  stubBrowser();
  [ctx, state] = await Promise.all([import('./ctx'), import('../state.svelte')]);
});

describe('legibleSize (issue #33)', () => {
  it("keeps a scene's own text at the theme's label minimum on screen, and leaves bigger text alone", () => {
    const legible = ctx.legibleSize(), min = state.themeState.current.labelMinPx;
    expect(legible(10) * 0.2).toBeCloseTo(min);
    expect(legible(min * 10)).toBe(min * 10);
  });

  it('follows the camera as it zooms', () => {
    const legible = ctx.legibleSize(), a = legible(1);
    world.cam.k = 1;
    expect(legible(1)).toBeCloseTo(a / 2);
  });
});
