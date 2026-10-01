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

  it('tells a stretch of several links how long it is; a single link, like the cross-connect into the exchange, has no count', () => {
    state.setLang('en'); state.setLevel('kid');
    const dive = (step: string) => caption.captionFor(home, ['internet', step], null, 'landscape');
    expect(dive('bng-core')).toMatchObject({ title: 'Light across the country', tag: '2 stretches · via ISP core · 205 km' });
    expect(dive('border-ixp')).toMatchObject({ title: 'Across the hall', tag: undefined });
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

describe('caption hints', () => {
  it('name the keys after a key and the gestures after a tap, in every kind of scene and stop (#53)', () => {
    state.setLang('en'); state.setLevel('kid');
    const at: [string[], string | null][] = [[[], null], [[], 'phone-ap'], [[], 'ap'], [[], 'internet'], [['internet'], null], [['phone-ap'], null], [['router~ip'], null]];
    const hints = (keys: boolean) => { state.view.keys = keys; return at.map(([p, s]) => caption.captionFor(home, p, s, 'landscape').hint!); };
    const taps = hints(false), keys = hints(true);
    state.view.keys = false;
    expect(new Set(taps).size).toBe(at.length);
    keys.forEach((k, i) => {
      expect(k).not.toMatch(/^hint\.|Tap|Swipe|Pinch/);
      expect(k).not.toBe(taps[i]);
    });
  });
});
