// The time machine's words (#59): why a trip in time goes somewhere else, and what is said on landing.
import { beforeAll, describe, expect, it } from 'vitest';
import type * as State from '../state.svelte';
import type * as Time from './time';
import { eraStops } from '../model/era';
import { stubBrowser } from '../test/stub-browser';

let time: typeof Time, state: typeof State;
beforeAll(async () => {
  stubBrowser();
  await (await import('../model/strings')).loadAllPacks();
  [time, state] = await Promise.all([import('./time'), import('../state.svelte')]);
});
const stop = (from: string, era: string) => eraStops(from).find((s) => s.era === era)!;

describe('the time machine’s words', () => {
  it('says where you would have been instead, and the nerds what there was where you are', () => {
    state.setLang('en'); state.setLevel('kid');
    expect(time.elsewhere(stop('street', '1995'), 'street')).toBe('In 1995 you’d have done this at home. You’ll travel there.');
    expect(time.elsewhere(stop('home', '1995'), 'home')).toBe('');
    state.setLevel('nerd');
    expect(time.elsewhere(stop('street', '1995'), 'street')).toMatch(/^In 1995 you’d have done this at home\. You’ll travel there\. .*GSM/);
    expect(time.elsewhere(stop('desk', '1995'), 'desk')).not.toMatch(/GSM/);
    state.setLevel('kid');
  });

  it('says the era first on landing, and why you are somewhere else', () => {
    state.setLang('en');
    expect(time.landing(stop('home', '1995'), 'home')).toBe('It’s 1995.');
    expect(time.landing(stop('home-dialup', 'today'), 'home-dialup')).toBe('Back to today.');
    expect(time.landing(stop('street', '2010'), 'street')).toBe('It’s 2010. In 2010 you’d have done this at home.');
    state.setLang('da');
    expect(time.landing(stop('street', '1995'), 'street')).toBe('Nu er det 1995. I 1995 havde du gjort det derhjemme.');
    state.setLang('en');
  });
});
