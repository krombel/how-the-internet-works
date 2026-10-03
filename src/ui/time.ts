// The time machine's words (#59): why a trip in time takes you somewhere else, and what the announcer says on
// arrival. The time machine (TimeMachine.svelte) and the place picker, which stays in the era, use them.
import type { EraStop } from '../model/era';
import { basePlace, nowEra } from '../model/registry';
import { fill, loc, tr, trFirst } from '../state.svelte';

/** An era's words (or, with `key` '.describe', its picture's) for where its stop is: `era.<era>.at.<place>` (the laptop
 *  on a cable at home in 2010, `desk-2010`), else `era.<era>.at.<its base place>` (a phone on 3G on the go in 2010, not
 *  the DSL at home), else the era's own. */
export const eraText = (stop: EraStop, key = '') =>
  trFirst([stop.place, basePlace(stop.place)].map((p) => `era.${stop.era}.at.${p}${key}`).concat(`era.${stop.era}${key}`), loc.level);

/** The line for a stop somewhere else (`instead`): why ("In 1995 you'd have done this at home."), and that you'll
 *  travel there (unless `there` is false: you are there already, or have just arrived); '' if it isn't somewhere
 *  else. */
export function elsewhere(stop: EraStop, there = true) {
  if (!stop.instead) return '';
  const why = fill(tr('time.instead'), { year: stop.year, where: tr(`place.${basePlace(stop.place)}.where`) });
  return there ? `${why} ${tr('time.there')}` : why;
}

/** What the announcer says first on arriving in another era: the era ("It's 1995.", "Back to today."), and why you
 *  are somewhere else. */
export const landing = (stop: EraStop) =>
  [stop.era === nowEra() ? tr('time.back') : fill(tr('time.then'), { year: stop.year }), elsewhere(stop, false)]
    .filter(Boolean).join(' ');
