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
    const places = ['home', 'home-dsl', 'home-dialup', 'on-the-go', 'on-the-go-2010', 'on-the-go-1995', 'desk', 'desk-2010'];
    expect(places.map((p) => eraOf(p))).toEqual(['today', '2010', '1995', 'today', '2010', '1995', 'today', '2010']);
    const year = (place: string) => eraYear(resolveRoute({ activity: 'watch-video', places: [place] }));
    expect(places.map(year)).toEqual([null, 2010, 1995, null, 2010, 1995, null, 2010]);
  });

  it('stops in every era, oldest first: the family’s place of that era that starts the same way, else its first, else the era’s own trip (instead)', () => {
    const home = [
      { era: '1995', year: 1995, place: 'home-dialup', instead: false },
      { era: '2010', year: 2010, place: 'home-dsl', instead: false },
      { era: 'today', year: now, place: 'home', instead: false },
    ];
    expect(eraStops('home')).toEqual(home);
    // from dial-up, which no other era starts on: each era's first way online
    expect(eraStops('home-dialup')).toEqual(home);
    expect(eraStops('home-fttb')).toEqual([...home.slice(0, 2), { ...home[2], place: 'home-fttb' }]);
    // on the go has its own 2010 (#113) and 1995 (#147): a laptop on a GSM call
    const away = [{ ...home[0], place: 'on-the-go-1995' }, { ...home[1], place: 'on-the-go-2010' }, { ...home[2], place: 'on-the-go' }];
    expect(eraStops('on-the-go')).toEqual(away);
    expect(eraStops('on-the-go-2010')).toEqual(away);
    expect(eraStops('on-the-go-1995')).toEqual(away);
    // the desk is a way online from home (#151): its laptop stays on a cable in 2010 (Fast Ethernet then, gigabit
    // today), and its 1995 is the PC at home
    const desk = [home[0], { ...home[1], place: 'desk-2010' }, { ...home[2], place: 'desk' }];
    expect(eraStops('desk')).toEqual(desk);
    expect(eraStops('desk-2010')).toEqual(desk);
    // each stop's picture: the device you start on then
    expect(eraStops('home').map((s) => startDevice(s.place))).toEqual(['pc', 'laptop', 'phone']);
    expect(eraStops('on-the-go').map((s) => startDevice(s.place))).toEqual(['laptop-gsm', 'phone-3g', 'phone']);
    expect(eraStops('desk').map((s) => startDevice(s.place))).toEqual(['pc', 'laptop', 'laptop']);
    // only where the activity allows
    expect(eraStops('home', ['on-the-go', 'home-dsl', 'home'])).toEqual(home.slice(1));
    expect(eraStops('on-the-go', ['on-the-go', 'desk'])).toEqual([{ era: 'today', year: now, place: 'on-the-go', instead: false }]);
    expect(eraStops('on-the-go', ['on-the-go', 'on-the-go-2010'])).toEqual(away.slice(1));
    // a family with no member in an era (here, with the GSM call left out): the era's own trip, instead
    expect(eraStops('on-the-go', ['on-the-go', 'on-the-go-2010', 'home-dialup'])).toEqual([{ ...home[0], instead: true }, ...away.slice(1)]);
    expect(eraStops('desk', ['desk', 'home-dsl', 'home-dialup']).map((s) => s.place)).toEqual(['home-dialup', 'home-dsl', 'desk']);
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
    // from the street to another family's trip, at home; a step through the cell tower doesn’t exist there
    expect(trip('on-the-go', ['phone~tcp'], 'home-dialup')).toEqual({ activity: 'watch-video', places: ['home-dialup'], path: ['pc~tcp'] });
    expect(trip('on-the-go', ['phone-cell-tower'], 'home-dsl').path).toEqual([]);
    // the street in 1995 (#147): the laptop's GSM call keeps the job's id, so its radio dive and its steps travel
    expect(trip('on-the-go', ['phone-cell-tower'], 'on-the-go-1995')).toEqual({ activity: 'watch-video', places: ['on-the-go-1995'], path: ['phone-cell-tower'] });
    expect(trip('on-the-go-2010', ['phone~tcp'], 'on-the-go-1995').path).toEqual(['phone~tcp']);
    // the laptop's PPP is the PC's at home
    expect(trip('on-the-go-1995', ['phone~ppp'], 'home-dialup').path).toEqual(['pc~ppp']);
    // no NR, HSPA or IP in the air in 1995
    expect(trip('on-the-go', ['phone~nr'], 'on-the-go-1995').path).toEqual([]);
    expect(trip('on-the-go-2010', ['phone~hspa'], 'on-the-go-1995').path).toEqual([]);
    // the street and the desk in 2010 (#113): the same phone and laptop, the same steps, as far as they exist then
    expect(trip('on-the-go', ['phone~tcp'], 'on-the-go-2010')).toEqual({ activity: 'watch-video', places: ['on-the-go-2010'], path: ['phone~tcp'] });
    expect(trip('on-the-go', ['phone-cell-tower'], 'on-the-go-2010').path).toEqual(['phone-cell-tower']);
    expect(trip('on-the-go-2010', ['phone~http'], 'on-the-go').path).toEqual(['phone~http']);
    // no NR in 2010, no HSPA today
    expect(trip('on-the-go', ['phone~nr'], 'on-the-go-2010').path).toEqual([]);
    expect(trip('on-the-go-2010', ['phone~hspa'], 'on-the-go').path).toEqual([]);
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
    expect(trip('on-the-go', ['internet', 'mobile-core~ip'], 'on-the-go-2010').path).toEqual(['internet', 'mobile-core~ip']);
    expect(trip('on-the-go-2010', ['internet', 'rnc~gtp'], 'on-the-go').path).toEqual(['internet']);
    // and in 1995 the mobile switch (#147): no GTP tunnel, but the call still carries your IP packets inside PPP
    expect(trip('on-the-go', ['internet', 'mobile-core~gtp'], 'on-the-go-1995').path).toEqual(['internet']);
    expect(trip('on-the-go', ['internet', 'mobile-core~ip'], 'on-the-go-1995').path).toEqual(['internet', 'mobile-core~ip']);
    expect(trip('on-the-go-1995', ['internet', 'datacentre'], 'home-dialup').path).toEqual(['internet', 'datacentre']);
  });
});
