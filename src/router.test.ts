import { beforeAll, describe, expect, it } from 'vitest';
import type * as Router from './router';
import type * as State from './state.svelte';
import { stubBrowser } from './test/stub-browser';

let router: typeof Router, state: typeof State;

beforeAll(async () => {
  stubBrowser();
  [router, state] = await Promise.all([import('./router'), import('./state.svelte')]);
  router.startRouter();
});

describe('nav.route (issue #27)', () => {
  it('keeps its identity while navigating inside a route, and changes when the route does', () => {
    const { nav } = state, { go, current } = router;
    const [place] = current().places;
    const first = nav.route;
    const stop = Object.keys(first.hops)[0];
    go({ stop }, true);
    expect(current().stop).toBe(stop);
    expect(nav.route).toBe(first);
    const other = first.slots[0].options.find((p) => p !== place)!;
    go({ places: [other] });
    expect(nav.route).not.toBe(first);
    expect(nav.route.slots[0].place).toBe(other);
  });
});
