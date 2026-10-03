// The time machine's model (#59): the era a route is in and the eras a place can travel to (where a place is in time,
// `eraOf`, is registry.ts's; the trip there, era-trip.ts, loads with the time machine).
import type { Route } from './resolve';
import { content as defaultContent, eraOf, nowEra, placeFamily, placeIds, type Content } from './registry';

/** A stop of the time machine: an era and where you'd be in it. `instead`: the place has no way online in that era,
 *  so it is the era's own trip (its first place), somewhere else ("In 1995 you'd have done this at home"). */
export interface EraStop { era: string; year: number; place: string; instead: boolean }

/** The device you start on at a place (its first hop's node: a PC, a laptop, a phone), the time machine's picture. */
export const startDevice = (place: string, c: Content = defaultContent) => {
  const h = c.places[place].hops.find((h) => 'at' in h) as { at: string; node?: string };
  return h.node ?? h.at;
};
/** A route's year for the time machine's button and chip, or null in the newest era (it says "Today"). */
export const eraYear = (r: Route) => (r.era === nowEra(r.content) ? null : r.content.eras[r.era].year);

/** How a place's start device gets online: its first link's signal, the dive that draws it (Wi‑Fi's radio, copper in
 *  a cable, 100 Mbit/s in 2010 or gigabit today; 5G's or 3G's radio). */
const startSignal = (place: string, c: Content) => {
  const l = c.places[place].hops.find((h) => 'link' in h) as { link: string; dive?: string | false };
  return l.dive ?? c.technologies[l.link].dive;
};

/** The time machine's stops from a place, one per era, oldest first: the place itself for its own era, else its
 *  family's place of that era that starts the same way (the laptop on a cable at home stays on a cable, though 2010's
 *  is Fast Ethernet), else its family's first of that era, else the era's first place. Out of `among` (default: all
 *  places); an era with no place there is left out. */
export function eraStops(place: string, among?: string[], c: Content = defaultContent): EraStop[] {
  const all = among ?? placeIds(c), own = eraOf(place, c), family = placeFamily(place, all, c), how = startSignal(place, c);
  return Object.values(c.eras).sort((a, b) => a.year - b.year).flatMap((e) => {
    if (e.id === own) return [{ era: e.id, year: e.year, place, instead: false }];
    const kin = family.filter((p) => eraOf(p, c) === e.id);
    const p = kin.find((q) => startSignal(q, c) === how) ?? kin[0] ?? all.find((q) => eraOf(q, c) === e.id);
    return p ? [{ era: e.id, year: e.year, place: p, instead: !kin.length }] : [];
  });
}
