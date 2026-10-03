// The time machine's words (#59): why a trip in time takes you somewhere else, and what the announcer says on
// arrival. The time machine (TimeMachine.svelte) and the place picker, which stays in the era, use them.
import type { EraStop } from '../model/era';
import { basePlace, nowEra } from '../model/registry';
import { fill, loc, tr, trFirst } from '../state.svelte';

/** Why a stop is somewhere else (`instead`): "In 1995 you'd have done this at home."; and, for nerds, what there was
 *  where you are then (`era.<era>.away.<place>`, if there is one: GSM data on the go in 1995). Null if it isn't
 *  somewhere else. */
function insteadOf(stop: EraStop, from: string): { why: string; away: string } | null {
  if (!stop.instead) return null;
  return {
    why: fill(tr('time.instead'), { year: stop.year, where: tr(`place.${basePlace(stop.place)}.where`) }),
    away: trFirst([`era.${stop.era}.away.${basePlace(from)}`], loc.level),
  };
}

/** An era's words (or, with `key` '.describe', its picture's) for where its stop is: `era.<era>.at.<place>` (the laptop
 *  on a cable at home in 2010, `desk-2010`), else `era.<era>.at.<its base place>` (a phone on 3G on the go in 2010, not
 *  the DSL at home), else the era's own. */
export const eraText = (stop: EraStop, key = '') =>
  trFirst([stop.place, basePlace(stop.place)].map((p) => `era.${stop.era}.at.${p}${key}`).concat(`era.${stop.era}${key}`), loc.level);

/** The line for a stop somewhere else: why, that you'll travel there (unless `there` is false: you are there
 *  already, or have just arrived), and the nerds' note (unless `away` is false: the picker's short line); '' if it
 *  isn't somewhere else. */
export function elsewhere(stop: EraStop, from: string, there = true, away = true) {
  const i = insteadOf(stop, from);
  return i ? [i.why, there ? tr('time.there') : '', away ? i.away : ''].filter(Boolean).join(' ') : '';
}

/** What the announcer says first on arriving in another era: the era ("It's 1995.", "Back to today."), and why you
 *  are somewhere else. */
export const landing = (stop: EraStop, from: string) =>
  [stop.era === nowEra() ? tr('time.back') : fill(tr('time.then'), { year: stop.year }), elsewhere(stop, from, false)]
    .filter(Boolean).join(' ');
