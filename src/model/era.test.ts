import { describe, expect, it } from 'vitest';
import { eraStops, eraYear, startDevice } from './era';
import { eraTrip } from './era-trip';
import { eraOf, nowEra } from './registry';
import { resolveRoute } from './resolve';
import { sceneRef } from './tree';

const now = new Date().getFullYear();
const trip = (place: string, path: string[], to: string) => eraTrip({ activity: 'watch-video', places: [place], path }, to);

describe('the time machine (#59)', () => {
  it('knows each place’s era: a place without one is today’s', () => {
    expect(nowEra()).toBe('today');
    const places = ['home', 'home-dsl', 'home-dialup', 'street', 'street-2010', 'desk', 'desk-2010'];
    expect(places.map((p) => eraOf(p))).toEqual(['today', '2010', '1995', 'today', '2010', 'today', '2010']);
    const year = (place: string) => eraYear(resolveRoute({ activity: 'watch-video', places: [place] }));
    expect(places.map(year)).toEqual([null, 2010, 1995, null, 2010, null, 2010]);
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
    // the street and the desk have their own 2010 (#113); in 1995 there was only the PC at home
    const away = (place: string) => [{ ...home[0], instead: true }, { ...home[1], place: `${place}-2010` }, { ...home[2], place }];
    expect(eraStops('street')).toEqual(away('street'));
    expect(eraStops('street-2010')).toEqual(away('street'));
    expect(eraStops('desk')).toEqual(away('desk'));
    expect(eraStops('desk-2010')).toEqual(away('desk'));
    // each stop's picture: the device you start on then
    expect(eraStops('home').map((s) => startDevice(s.place))).toEqual(['pc', 'laptop', 'phone']);
    expect(eraStops('street').map((s) => startDevice(s.place))).toEqual(['pc', 'phone-3g', 'phone']);
    expect(eraStops('desk').map((s) => startDevice(s.place))).toEqual(['pc', 'laptop', 'laptop']);
    // only where the activity allows
    expect(eraStops('home', ['street', 'home-dsl', 'home'])).toEqual(home.slice(1));
    expect(eraStops('street', ['street', 'desk'])).toEqual([{ era: 'today', year: now, place: 'street', instead: false }]);
    expect(eraStops('street', ['street', 'street-2010'])).toEqual(away('street').slice(1));
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
    // the street and the desk in 2010 (#113): the same phone and laptop, the same steps, as far as they exist then
    expect(trip('street', ['phone~tcp'], 'street-2010')).toEqual({ activity: 'watch-video', places: ['street-2010'], path: ['phone~tcp'] });
    expect(trip('street', ['phone-cell-tower'], 'street-2010').path).toEqual(['phone-cell-tower']);
    expect(trip('street-2010', ['phone~http'], 'street').path).toEqual(['phone~http']);
    // no NR in 2010, no HSPA today
    expect(trip('street', ['phone~nr'], 'street-2010').path).toEqual([]);
    expect(trip('street-2010', ['phone~hspa'], 'street').path).toEqual([]);
    expect(trip('desk', ['laptop~ethernet'], 'desk-2010').path).toEqual(['laptop~ethernet']);
    expect(trip('desk', ['laptop-router'], 'desk-2010').path).toEqual(['laptop-router']);
    expect(trip('desk-2010', ['laptop~tcp'], 'desk').path).toEqual(['laptop~tcp']);
    // from the desk to the PC at home in 1995: its own steps, as from anywhere
    expect(trip('desk', ['laptop~tcp'], 'home-dialup').path).toEqual(['pc~tcp']);
  });

  it('keeps a deep path inside the internet', () => {
    const deep = (place: string) => resolveRoute({ activity: 'watch-video', places: [place] });
    const path = ['internet', 'datacentre'];
    expect(sceneRef(deep('home'), path)).not.toBe(null);
    expect(trip('home', path, 'home-dialup').path).toEqual(path);
    expect(trip('home-dsl', path, 'home').path).toEqual(path);
    // the mobile core is there in both, the RNC only in 2010
    expect(trip('street', ['internet', 'mobile-core~ip'], 'street-2010').path).toEqual(['internet', 'mobile-core~ip']);
    expect(trip('street-2010', ['internet', 'rnc~gtp'], 'street').path).toEqual(['internet']);
  });
});
