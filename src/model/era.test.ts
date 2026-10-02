import { describe, expect, it } from 'vitest';
import { eraStops, eraYear } from './era';
import { eraTrip } from './era-trip';
import { eraOf, nowEra } from './registry';
import { resolveRoute } from './resolve';
import { sceneRef } from './tree';

const now = new Date().getFullYear();
const trip = (place: string, path: string[], to: string) => eraTrip({ activity: 'watch-video', places: [place], path }, to);

describe('the time machine (#59)', () => {
  it('knows each place’s era: a place without one is today’s', () => {
    expect(nowEra()).toBe('today');
    expect(['home', 'home-dsl', 'home-dialup', 'street', 'desk'].map((p) => eraOf(p))).toEqual(['today', '2010', '1995', 'today', 'today']);
    const year = (place: string) => eraYear(resolveRoute({ activity: 'watch-video', places: [place] }));
    expect(['home', 'home-dsl', 'home-dialup', 'street'].map(year)).toEqual([null, 2010, 1995, null]);
  });

  it('stops in every era, oldest first: the family’s place of that era, else the era’s own trip (instead)', () => {
    const home = [
      { era: '1995', year: 1995, place: 'home-dialup', instead: false },
      { era: '2010', year: 2010, place: 'home-dsl', instead: false },
      { era: 'today', year: now, place: 'home', instead: false },
    ];
    expect(eraStops('home')).toEqual(home);
    expect(eraStops('home-dialup')).toEqual(home);
    expect(eraStops('home-fttb')).toEqual([...home.slice(0, 2), { ...home[2], place: 'home-fttb' }]);
    const away = [{ ...home[0], instead: true }, { ...home[1], instead: true }];
    expect(eraStops('street')).toEqual([...away, { era: 'today', year: now, place: 'street', instead: false }]);
    expect(eraStops('desk')).toEqual([...away, { era: 'today', year: now, place: 'desk', instead: false }]);
    // only where the activity allows
    expect(eraStops('home', ['street', 'home-dsl', 'home'])).toEqual(home.slice(1));
    expect(eraStops('street', ['street', 'desk'])).toEqual([{ era: 'today', year: now, place: 'street', instead: false }]);
  });

  it('travels with the start device: its steps become the new one’s, and the path is kept as far as it exists', () => {
    expect(trip('home', ['phone~tcp'], 'home-dialup')).toEqual({ activity: 'watch-video', places: ['home-dialup'], path: ['pc~tcp'] });
    expect(trip('home', ['phone~wifi'], 'home-dsl').path).toEqual(['laptop~wifi']);
    expect(trip('home', ['phone-ap'], 'home-dsl').path).toEqual(['laptop-ap']);
    expect(trip('home-dsl', ['laptop~http'], 'home').path).toEqual(['phone~http']);
    // no Wi-Fi in 1995: back to the overview
    expect(trip('home', ['phone~wifi'], 'home-dialup').path).toEqual([]);
    expect(trip('home', ['phone-ap'], 'home-dialup').path).toEqual([]);
    // other steps keep their ids
    expect(trip('home-dialup', ['internet'], 'home').path).toEqual(['internet']);
    expect(trip('home', ['router'], 'home-dsl').path).toEqual(['router']);
    expect(trip('home', ['router'], 'home-dialup').path).toEqual([]);
    // from the street to the era’s own trip, at home; a step through the cell tower doesn’t exist there
    expect(trip('street', ['phone~tcp'], 'home-dialup')).toEqual({ activity: 'watch-video', places: ['home-dialup'], path: ['pc~tcp'] });
    expect(trip('street', ['phone-cell-tower'], 'home-dsl').path).toEqual([]);
  });

  it('keeps a deep path inside the internet', () => {
    const deep = (place: string) => resolveRoute({ activity: 'watch-video', places: [place] });
    const path = ['internet', 'datacentre'];
    expect(sceneRef(deep('home'), path)).not.toBe(null);
    expect(trip('home', path, 'home-dialup').path).toEqual(path);
    expect(trip('home-dsl', path, 'home').path).toEqual(path);
  });
});
