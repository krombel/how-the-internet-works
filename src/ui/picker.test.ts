// The place picker stays in the era you are in (#59): only the time machine changes it.
import { describe, expect, it } from 'vitest';
import { activityIds, content, eraOf } from '../model/registry';
import { resolveRoute } from '../model/resolve';
import { allowedPlaces, placeOptions, waysOnline } from './picker';

const at = (here: string, activity = 'watch-video') => {
  const allowed = allowedPlaces(activity, 0), era = eraOf(here);
  return { options: placeOptions(here, era, allowed), ways: waysOnline(here, era, allowed) };
};
const where = (here: string) => Object.fromEntries(at(here).options.map((o) => [o.id, [o.to, !!o.instead]]));

describe('the place picker in an era', () => {
  it('never offers, or lands on, a place of another era', () => {
    for (const activity of activityIds()) {
      for (const here of allowedPlaces(activity, 0)) {
        const era = eraOf(here), { options, ways } = at(here, activity);
        for (const o of options) {
          expect(eraOf(o.to), `${activity}: ${here} offers ${o.id} → ${o.to}`).toBe(era);
          expect(resolveRoute({ activity, places: [o.to] }).era, `${activity}: ${here} lands on ${o.to}`).toBe(era);
        }
        for (const v of ways) expect(eraOf(v), `${activity}: ${here}'s way online ${v}`).toBe(era);
      }
    }
  });

  it('offers each place’s member of the era, and stays where you are in your own family', () => {
    expect(where('home-dsl')).toEqual({ home: ['home-dsl', false], street: ['street-2010', false], desk: ['desk-2010', false] });
    expect(where('desk-2010')).toEqual({ home: ['home-dsl', false], street: ['street-2010', false], desk: ['desk-2010', false] });
    expect(where('home-fttb')).toEqual({ home: ['home-fttb', false], street: ['street', false], desk: ['desk', false] });
    expect(at('street-2010').options.filter((o) => o.on).map((o) => o.id)).toEqual(['street']);
  });

  it('takes a place with no member in the era to the era’s own trip, as the time machine does', () => {
    expect(where('home-dialup')).toEqual({ home: ['home-dialup', false], street: ['home-dialup', true], desk: ['home-dialup', true] });
    const street = at('home-dialup').options.find((o) => o.id === 'street')!;
    expect(street.instead).toMatchObject({ era: '1995', place: 'home-dialup', instead: true });
  });

  it('lists only the era’s ways online, so a way online is never a trip in time', () => {
    expect(at('home').ways).toEqual(['home', 'home-fttb']);
    expect(at('home-dsl').ways).toEqual(['home-dsl']);
    expect(at('home-dialup').ways).toEqual(['home-dialup']);
    expect(at('street').ways).toEqual(['street']);
    expect(Object.keys(content.places).every((p) => at(p).ways.includes(p))).toBe(true);
  });
});
