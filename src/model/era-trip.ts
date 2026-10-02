// The trip in another era (#59): only the time machine (TimeMachine.svelte) loads it.
import type { Loc } from './location';
import { normaliseChoice, resolveRoute } from './resolve';
import { content as defaultContent, type Content } from './registry';
import { validPrefix } from './tree';

/** A place's start device: its first hop (the phone, the laptop, the PC). */
const startOf = (place: string, c: Content) => (c.places[place].hops.find((h) => 'at' in h) as { at: string }).at;

/** The trip in another era: slot 0 goes to `to`, the rest stays. The steps that name the old start device (`phone`,
 *  `phone~tcp`, its link `phone-ap`) now name the new one (`pc`, `pc~tcp`, `pc-…`); then the path is kept as far as
 *  it still exists there. */
export function eraTrip(l: Pick<Loc, 'places' | 'activity' | 'path'>, to: string, c: Content = defaultContent) {
  const from = resolveRoute(l, c), choice = normaliseChoice({ activity: l.activity, places: [to, ...l.places.slice(1)] }, c);
  const a = startOf(from.slots[0].place, c), b = startOf(to, c);
  const swap = (s: string) =>
    s === a ? b : s.startsWith(`${a}~`) || (s.startsWith(`${a}-`) && !from.hops[s]) ? b + s.slice(a.length) : s;
  return { ...choice, path: validPrefix(resolveRoute(choice, c), l.path.map(swap)) };
}
