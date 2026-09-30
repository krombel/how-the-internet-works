import { beforeAll, describe, expect, it, vi } from 'vitest';
import type * as Router from './router';
import type * as State from './state.svelte';

let router: typeof Router, state: typeof State;

beforeAll(async () => {
  const url = new URL('http://localhost/');
  const setHash = (u: string | URL | null | undefined) => { if (u) url.hash = new URL(u, url).hash; };
  vi.stubGlobal('location', url);
  vi.stubGlobal('history', { state: null, pushState: (_: unknown, __: string, u: string) => setHash(u), replaceState: (_: unknown, __: string, u: string) => setHash(u) });
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {} }));
  vi.stubGlobal('window', { addEventListener: () => {} });
  vi.stubGlobal('document', { documentElement: {} });
  vi.stubGlobal('navigator', { language: 'en' });
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
