// The time machine's words (#59): why a trip in time takes you somewhere else, and what the announcer says on
// arrival. Only the time machine (TimeMachine.svelte) loads it.
import type { EraStop } from '../model/era';
import { basePlace, nowEra } from '../model/registry';
import { fill, loc, tr, trFirst } from '../state.svelte';

/** Why a stop is somewhere else (`instead`): "In 1995 you'd have done this at home.", and, for nerds, what there was
 *  where you are then (`era.<era>.away.<place>`, if there is one: GSM data on the street in 1995). Null if it isn't. */
function insteadOf(stop: EraStop, from: string): { why: string; away: string } | null {
  if (!stop.instead) return null;
  return {
    why: fill(tr('time.instead'), { year: stop.year, where: tr(`place.${basePlace(stop.place)}.where`) }),
    away: trFirst([`era.${stop.era}.away.${basePlace(from)}`], loc.level),
  };
}

/** The time machine's line for a stop somewhere else: why, that you'll travel there, and the nerds' note; '' if it
 *  isn't somewhere else. */
export function elsewhere(stop: EraStop, from: string) {
  const i = insteadOf(stop, from);
  return i ? [i.why, tr('time.there'), i.away].filter(Boolean).join(' ') : '';
}

/** What the announcer says first on arriving in another era: the era ("It's 1995.", "Back to today."), and why you
 *  are somewhere else. */
export function landing(stop: EraStop, from: string) {
  const i = insteadOf(stop, from);
  return [stop.era === nowEra() ? tr('time.back') : fill(tr('time.then'), { year: stop.year }), i?.why ?? '', i?.away ?? '']
    .filter(Boolean).join(' ');
}
