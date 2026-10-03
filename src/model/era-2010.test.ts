// The 2010 trips (#59, #135): nothing they say belongs to a later internet, from the home (and its other ways online)
// and on the go to the inside of the internet and the data centre, unless it says when it came. Modelled on the 1995
// trip's test (era-1995.test.ts), but it reads everything on the way: the captions, and every label, tag and field a
// dive, a layer or the era shows.
import { beforeAll, describe, expect, it } from 'vitest';
import { carrierNat } from '../../content/scenes/ip-post/post';
import { routeWords } from '../test/era-walk';
import { activityIds, basePlace, content } from './registry';
import { resolveRoute } from './resolve';
import { loadAllPacks } from './strings';

/** Later than 2010: Wi‑Fi 5 and up, 4G and 5G, XGS-PON, G.fast and vectoring, 200G and up, 2.5G/5G copper and
 *  802.3bt, leaf–spine, containers and Kubernetes, NVMe, today's AS count, TLS 1.3, HTTP/2 and 3, QUIC, ECH, WPA3,
 *  VXLAN/EVPN, segment routing, DASH's MPD and the CGNAT space of 2012. */
const LATER = new RegExp([
  /802\.11(?:ac|ax|be)|Wi.Fi [5-7]\b|\b[45]G\b|\bLTE\b|\bNR\b|\bgNB\b|\bUPF\b|XGS|G\.fast|[Vv]ector(?:ing|isering)/,
  /\b[2-8]00\s?G|400GBASE|802\.3b[tz]|\b(?:2\.5|5)GBASE/,
  /[Ll]eaf|\b(?:in a|i en) container|containers\b|containere|k8s|[Kk]ubernetes|Docker|NVMe|75 000|80 000/,
  /TLS 1\.3|HTTP\/[23]|QUIC|\bECH\b|WPA3|VXLAN|EVPN|SRv6|[Ss]egment [Rr]outing|\bMPD\b|100\.64\.0\.0|RFC 6598/,
].map((r) => r.source).join('|'));
/** New in 2010 (100G Ethernet and its 25G lanes, coherent optics): fine if it says it was new then. */
const NEW = /\b100\s?G|100GBASE|\b25G\b|[Cc]oherent|[Kk]ohærent/;
const SAYS_LATER = /today|i dag|nutid|later|senere|\b(?:201[1-9]|20[2-9]\d)\b/i;
const SAYS_NEW = /today|i dag|nutid|later|senere|\b20[1-9]\d\b/i;

/** Walked, but never shown on a 2010 trip: the router's light box (ONT) only shows on fibre, and 2010's router
 *  goes out on the phone line (its modem room). */
const UNSHOWN = ['scene.router-inside.ont.line'];

/** TEMPORARY, until time machine step 8 (2010: the data centre, three-tier) lands: the 2010 data centre is still
 *  today's leaf–spine PoP, which step 8 replaces. Whichever of #135's PR and step 8's lands second removes this list
 *  (the test fails as soon as an entry no longer leaks). */
const STEP_8 = [
  'node.cdn', 'node.datacentre', 'node.datacentre.tag', 'node.datacentre.inside', 'node.datacentre.inside.describe',
  'node.spine', 'node.spine.tag', 'node.rack-switch', 'node.rack-switch.tag', 'tech.dc-fibre', 'tech.dc-fibre.tag',
  'scene.leaf-spine', 'scene.leaf-spine.describe', 'scene.leaf-spine.heading',
];

describe('the 2010 trips', () => {
  beforeAll(loadAllPacks);
  const places = Object.values(content.places).filter((p) => p.era === '2010').map((p) => p.id);
  const trips = () => places.flatMap((p) => activityIds().map((activity) => resolveRoute({ activity, places: [p] })));

  it('are the home’s ways online and on the go', () => {
    expect(new Set(places.map((p) => basePlace(p)))).toEqual(new Set(['home', 'street']));
    expect(places.length).toBeGreaterThan(2);
    for (const r of trips()) expect(r.era).toBe('2010');
  });

  it('say nothing of a later internet, unless they say when (#135)', () => {
    const leaks = new Map<string, string>();
    for (const r of trips()) for (const [key, s] of routeWords(r)) {
      const later = LATER.test(s) && !SAYS_LATER.test(s), early = NEW.test(s) && !SAYS_NEW.test(s);
      if (later || early) leaks.set(key, s);
    }
    const keyOf = (k: string) => k.split(' ')[2];
    const leaked = new Set([...leaks.keys()].map(keyOf));
    const excused = new Set([...UNSHOWN, ...STEP_8]);
    expect([...leaks].filter(([k]) => !excused.has(keyOf(k))).map(([k, s]) => `${k}: ${s}`)).toEqual([]);
    // each excuse still holds: drop an entry once it no longer leaks (step 8 fixed it, or the words changed)
    expect([...excused].filter((k) => !leaked.has(k)), 'no longer leaks: take it off UNSHOWN or STEP_8').toEqual([]);
  });

  it('draw the GGSN’s NAT as a carrier’s: phones had private 10/8 addresses before the shared space of 2012', () => {
    expect(carrierNat('10.152.33.7')).toBe(true);
    expect(carrierNat('100.64.12.7')).toBe(true);
    expect(carrierNat('192.168.1.23')).toBe(false);
    const r = resolveRoute({ activity: 'watch-video', places: ['street-2010'] });
    expect(carrierNat(r.hops.phone.addr!)).toBe(true);
  });
});
