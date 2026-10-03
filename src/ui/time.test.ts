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

  it('lets an era say its own line for where you are, in place of “you’d have done this at home”', () => {
    state.setLang('en'); state.setLevel('kid');
    // the desk in 1995 lands on the PC at home, which already sits at a desk (#113)
    expect(time.elsewhere(stop('desk', '1995'), 'desk')).toBe('In 1995 the computer on the desk was a big beige PC, and it went online through the phone line at home. You’ll travel there.');
    state.setLevel('nerd');
    expect(time.elsewhere(stop('desk', '1995'), 'desk')).toMatch(/^In 1995 a desk meant a beige PC .* You’ll travel there\.$/);
    expect(time.landing(stop('desk', '1995'), 'desk')).toMatch(/^It’s 1995\. In 1995 a desk meant a beige PC/);
    state.setLang('da'); state.setLevel('kid');
    expect(time.elsewhere(stop('desk', '1995'), 'desk')).toMatch(/^I 1995 var computeren på skrivebordet en stor beige pc.* Du rejser derhen\.$/);
    state.setLang('en');
  });

  it('leaves out “You’ll travel there” where you are there already (the picker in 1995, at home)', () => {
    state.setLang('en'); state.setLevel('kid');
    expect(time.elsewhere(stop('street', '1995'), 'street', false)).toBe('In 1995 you’d have done this at home.');
    expect(time.elsewhere(stop('desk', '1995'), 'desk', false)).toBe('In 1995 the computer on the desk was a big beige PC, and it went online through the phone line at home.');
    state.setLevel('nerd');
    expect(time.elsewhere(stop('street', '1995'), 'street', false)).toMatch(/^In 1995 you’d have done this at home\. Out and about .*GSM/);
    expect(time.elsewhere(stop('street', '1995'), 'street', false, false)).toBe('In 1995 you’d have done this at home.');
    state.setLevel('kid');
  });

  it('goes to the street’s and the desk’s own 2010, with nothing to explain (#113)', () => {
    state.setLang('en'); state.setLevel('kid');
    expect(time.elsewhere(stop('street', '2010'), 'street')).toBe('');
    expect(time.elsewhere(stop('desk', '2010'), 'desk')).toBe('');
    expect(time.landing(stop('street', '2010'), 'street')).toBe('It’s 2010.');
    expect(time.landing(stop('street-2010', 'today'), 'street-2010')).toBe('Back to today.');
  });

  it('tells each era as it was where its stop is: the street’s 3G, the desk’s cable, else the era’s home', () => {
    state.setLang('en'); state.setLevel('kid');
    expect(time.eraText(stop('street', '2010'))).toMatch(/over 3G/);
    expect(time.eraText(stop('street', '2010'), '.describe')).toMatch(/^A phone with one round button/);
    expect(time.eraText(stop('desk', '2010'))).toMatch(/a cable ran from the laptop/);
    expect(time.eraText(stop('home', '2010'))).toMatch(/sent Wi‑Fi to every room/);
    expect(time.eraText(stop('street', '1995'))).toBe(time.eraText(stop('home', '1995')));
    expect(time.eraText(stop('street', 'today'))).toMatch(/5G/);
    // only the picture differs at the desk today
    expect(time.eraText(stop('desk', 'today'))).toBe(time.eraText(stop('home', 'today')));
    expect(time.eraText(stop('desk', 'today'), '.describe')).toMatch(/^A laptop on the desk/);
    state.setLang('da'); state.setLevel('nerd');
    expect(time.eraText(stop('street', '2010'))).toMatch(/^3G med HSPA/);
    state.setLang('en'); state.setLevel('kid');
  });

  it('says the era first on landing, and why you are somewhere else', () => {
    state.setLang('en');
    expect(time.landing(stop('home', '1995'), 'home')).toBe('It’s 1995.');
    expect(time.landing(stop('home-dialup', 'today'), 'home-dialup')).toBe('Back to today.');
    expect(time.landing(stop('street', '1995'), 'street')).toBe('It’s 1995. In 1995 you’d have done this at home.');
    state.setLang('da');
    expect(time.landing(stop('street', '1995'), 'street')).toBe('Nu er det 1995. I 1995 havde du gjort det derhjemme.');
    state.setLang('en');
  });
});
