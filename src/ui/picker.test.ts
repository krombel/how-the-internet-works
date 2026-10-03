// The place picker stays in the era you are in (#59): only the time machine changes it.
import { describe, expect, it } from 'vitest';
import { activityIds, content, eraOf } from '../model/registry';
import { resolveRoute } from '../model/resolve';
import { allowedPlaces, iconOf, pictures, placeOptions, waysOnline } from './picker';

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
    expect(where('home-dsl')).toEqual({ home: ['home-dsl', false], street: ['street-2010', false] });
    expect(where('home-fttb')).toEqual({ home: ['home-fttb', false], street: ['street', false] });
    // the desk is a way online from home (#151): two places, at home and on the go
    expect(where('desk')).toEqual({ home: ['desk', false], street: ['street', false] });
    expect(where('desk-2010')).toEqual({ home: ['desk-2010', false], street: ['street-2010', false] });
    expect(where('street')).toEqual({ home: ['home', false], street: ['street', false] });
    expect(where('street-2010')).toEqual({ home: ['home-dsl', false], street: ['street-2010', false] });
    expect(at('street-2010').options.filter((o) => o.on).map((o) => o.id)).toEqual(['street']);
  });

  it('shows each place by its own picture, the same for all its ways online and eras: a house, a phone on the move', () => {
    for (const here of ['home', 'desk', 'home-dsl', 'home-dialup', 'street', 'street-2010', 'street-1995'])
      expect(at(here).options.map((o) => iconOf(o.id)), here).toEqual(['home', 'on-the-go']);
    expect(Object.keys(content.places).map(iconOf).every((i) => content.nodes[i]?.kind === 'place')).toBe(true);
    expect(pictures()).toEqual(['home', 'on-the-go']);
  });

  it('offers on the go in 1995 as a place of its own: a laptop on a GSM call (#147)', () => {
    expect(where('home-dialup')).toEqual({ home: ['home-dialup', false], street: ['street-1995', false] });
    expect(where('street-1995')).toEqual({ home: ['home-dialup', false], street: ['street-1995', false] });
    expect(at('home-dialup').options.find((o) => o.id === 'street')!.instead).toBeNull();
  });

  it('takes a place with no member in the era to the era’s own trip, as the time machine does', () => {
    // with the GSM call left out of what the activity allows, on the go has no 1995
    const allowed = allowedPlaces('watch-video', 0).filter((p) => p !== 'street-1995');
    const street = placeOptions('home-dialup', '1995', allowed).find((o) => o.id === 'street')!;
    expect(street.to).toBe('home-dialup');
    expect(street.instead).toMatchObject({ era: '1995', place: 'home-dialup', instead: true });
  });

  it('lists only the era’s ways online, so a way online is never a trip in time', () => {
    expect(at('home').ways).toEqual(['home', 'desk', 'home-fttb']);
    expect(at('desk').ways).toEqual(at('home').ways);
    expect(at('home-dsl').ways).toEqual(['home-dsl', 'desk-2010']);
    expect(at('desk-2010').ways).toEqual(at('home-dsl').ways);
    expect(at('home-dialup').ways).toEqual(['home-dialup']);
    expect(at('street').ways).toEqual(['street']);
    expect(at('street-1995').ways).toEqual(['street-1995']);
    expect(Object.keys(content.places).every((p) => at(p).ways.includes(p))).toBe(true);
  });
});
