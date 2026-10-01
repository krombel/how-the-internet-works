// The caption's scale line (issue #20): how far, and through whose networks.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type * as Caption from './caption';
import type * as State from '../state.svelte';
import { stubBrowser } from '../test/stub-browser';
import { resolveRoute } from '../model/resolve';

let caption: typeof Caption, state: typeof State;
const home = resolveRoute({ activity: 'watch-video', places: ['home'] });

beforeAll(async () => {
  stubBrowser();
  // the caption's doors measure their names: no canvas here, so the rough width
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '' }));
  vi.stubGlobal('document', { documentElement: {}, createElement: () => ({ getContext: () => null }) });
  await (await import('../model/strings')).loadAllPacks();
  [caption, state] = await Promise.all([import('./caption'), import('../state.svelte')]);
});

describe('caption scale tag', () => {
  const tag = (path: string[], stop: string | null = null) => caption.captionFor(home, path, stop, 'landscape').tag;

  it('says how far the whole trip goes, and how many companies carry it inside the internet', () => {
    state.setLang('en'); state.setLevel('kid');
    expect(tag([])).toBe('Your parcels travel about 231 km each way');
    expect(tag(['internet'])).toMatch(/^3 companies pass your parcels along · about 231 km$/);
  });

  it('names who runs a stop and how far from you it is; a link says how long it is', () => {
    state.setLang('en'); state.setLevel('kid');
    expect(tag(['internet'], 'border')).toBe('Your internet company · 230 km from you');
    expect(tag(['internet'], 'border-ixp')).toBe('About 200 m long');
    expect(tag(['internet'], 'transit')).toBe('A big carrier');
  });

  it('gives nerds the light time and the AS, in their language', () => {
    state.setLang('da'); state.setLevel('nerd');
    expect(tag(['internet'], 'border')).toBe('Din udbyder · AS64500 · 230 km henne ad vejen · lys: 1,2 ms');
    state.setLang('en'); state.setLevel('kid');
  });

  it('tells a stretch how long it is: the long haul across the country, the cross-connects at the exchange across the hall', () => {
    state.setLang('en'); state.setLevel('kid');
    const dive = (step: string) => caption.captionFor(home, ['internet', step], null, 'landscape');
    expect(dive('bng-core')).toMatchObject({ title: 'Light across the country', tag: '2 stretches · via ISP core · 205 km' });
    expect(dive('border-ixp')).toMatchObject({ title: 'Across the hall', tag: '2 stretches · via Internet exchange · 500 m' });
  });

  it('links to what the owner is, at a stop it runs', () => {
    state.setLang('en'); state.setLevel('nerd');
    const urls = caption.captionFor(home, ['internet'], 'core', 'landscape').links.map((l) => l.url);
    expect(urls).toContain('https://en.wikipedia.org/wiki/Autonomous_system_(Internet)');
    state.setLevel('kid');
  });
});

describe('caption fold', () => {
  it('folds to a pill on a short landscape screen, to a card on a portrait phone, not at all on a big screen', () => {
    expect(caption.captionFold(844, 390)).toBe('pill');
    expect(caption.captionFold(390, 844)).toBe('card');
    expect(caption.captionFold(360, 740)).toBe('card');
    expect(caption.captionFold(1440, 900)).toBe(null);
    expect(caption.captionFold(820, 1180)).toBe(null);
  });
});

describe('counts in words', () => {
  it('picks the plural form of the language', () => {
    state.setLang('en');
    expect(state.trCount('ladder.ways', 1)).toBe('1 way down');
    expect(state.trCount('ladder.ways', 4)).toBe('4 ways down');
    state.setLang('da');
    expect(state.trCount('ladder.ways', 1)).toBe('1 vej ned');
    expect(state.trCount('ladder.ways', 4)).toBe('4 veje ned');
    state.setLang('en');
  });
});
