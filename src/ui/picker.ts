// The place picker's choices (PlacePicker.svelte): its places and ways online in the era you are in, and one picture
// per place, loaded before the picker opens (#91).
import { eraStops, type EraStop } from '../model/era';
import { basePlace, content as defaultContent, eraOf, placeFamily, placeIds, type Content } from '../model/registry';

/** A place's picture: the first device after the start (Wi-Fi box, cell tower, …). */
export const iconOf = (id: string) => {
  const hops = defaultContent.places[id].hops.filter((h) => 'at' in h) as { at: string; node?: string }[];
  const h = hops[1] ?? hops[0];
  return h.node ?? h.at;
};
/** Every picture the picker may show (one per place). */
export const pictures = () => [...new Set(Object.keys(defaultContent.places).map(iconOf))];

/** The places an activity's slot may be (all, unless the slot says `only`), in order. */
export function allowedPlaces(activity: string, slot: number, c: Content = defaultContent) {
  const s = c.activities[activity]?.route.filter((x) => 'place' in x)[slot];
  const only = s && 'only' in s ? s.only : undefined;
  return placeIds(c).filter((p) => !only || only.includes(p));
}

/** "Where are you?" in an era (#59: the picker stays in it; only the time machine changes it): one option per place
 *  family (`id`, its first allowed member), going `to` its member of the era, or, where it has none, to the era's own
 *  trip, as the time machine would (`eraStops`; `instead` is that stop, for its line). Your own family stays where you
 *  are (`on`). */
export function placeOptions(here: string, era: string, allowed: string[], c: Content = defaultContent) {
  return allowed.filter((id) => placeFamily(id, allowed, c)[0] === id).map((id) => {
    if (basePlace(id, c) === basePlace(here, c)) return { id, to: here, on: true, instead: null };
    const s: EraStop = eraStops(id, allowed, c).find((s) => s.era === era)!;
    return { id, to: s.place, on: false, instead: s.instead ? s : null };
  });
}

/** "How do you get online?": the ways online from where you are, of its era only (the other years are the time
 *  machine's). */
export const waysOnline = (here: string, era: string, allowed: string[], c: Content = defaultContent) =>
  placeFamily(here, allowed, c).filter((p) => eraOf(p, c) === era);
