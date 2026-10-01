import { describe, expect, it } from 'vitest';
import { caughtSpot } from '../engine/packets';
import { pathScene } from './layout';
import { entryHop, hopAhead, hopStepFor, hopView, nextHop, packetOn, stepHop, type HopView } from './packet';
import { resolveRoute, type Route } from './resolve';
import { content } from './registry';
import { bezier } from '../engine/geometry';
import { chainOf, childrenOf, hopScenePath, sceneRef } from './tree';

const home = resolveRoute({ activity: 'watch-video', places: ['home'] });
const street = resolveRoute({ activity: 'watch-video', places: ['street'] });
const flow = home.activity.flows[0];
const at = (r: Route, hop: string) => r.chain.findIndex((h) => h.id === hop);
const onLink = (r: Route, id: string, dir: 'up' | 'down' = 'up') => packetOn(r, flow, r.links.find((l) => l.id === id)!.index, dir);
/** "ip.ttl" → its value on a link. */
const val = (r: Route, link: string, path: string, dir: 'up' | 'down' = 'up') => {
  const [layer, field] = path.split('.');
  return onLink(r, link, dir).find((l) => l.id === layer)?.fields.find((f) => f.id === field)?.value.text;
};
const view = (r: Route, hop: string, dir: 'up' | 'down' = 'up') => hopView(r, 'video', dir, at(r, hop));
const layer = (v: HopView, id: string) => v.layers.find((l) => l.id === id)!;
const field = (v: HopView, path: string) => {
  const [l, f] = path.split('.');
  return layer(v, l).fields.find((x) => x.id === f)!;
};
/** The layers at a hop: "-wifi +ethernet ip (tcp) [tls] [http]": taken off, put on, closed (), sealed []. */
const shape = (v: HopView) => v.layers.map((l) => {
  const id = l.change === 'removed' ? `-${l.id}` : l.change === 'added' ? `+${l.id}` : l.id;
  return l.state === 'closed' ? `(${id})` : l.state === 'sealed' ? `[${id}]` : id;
}).join(' ');
const changed = (v: HopView) => v.layers.flatMap((l) => l.fields.filter((f) => f.before).map((f) => `${l.id}.${f.id}`));
const used = (v: HopView) => v.layers.flatMap((l) => l.fields.filter((f) => f.used).map((f) => `${l.id}.${f.id}`));

describe('the packet on each link', () => {
  it('stacks the link technology under the flow', () => {
    expect(onLink(home, 'phone-ap').map((l) => l.id)).toEqual(['wifi', 'ip', 'tcp', 'tls', 'http']);
    expect(onLink(home, 'cabinet-backhaul').map((l) => l.id)).toEqual(['ethernet', 'vlan', 'ip', 'tcp', 'tls', 'http']);
    expect(onLink(street, 'cell-tower-mobile-core').map((l) => l.id)).toEqual(['ethernet', 'gtp', 'ip', 'tcp', 'tls', 'http']);
  });

  it('rewrites the source address and port at the home NAT', () => {
    expect([val(home, 'ap-router', 'ip.src'), val(home, 'ap-router', 'tcp.sport')]).toEqual(['192.168.1.23', '51034']);
    expect([val(home, 'router-cabinet', 'ip.src'), val(home, 'router-cabinet', 'tcp.sport')]).toEqual(['203.0.113.7', '61757']);
    expect(val(home, 'ixp-dc-router', 'ip.dst')).toBe('198.51.100.20');
    // and back again on the way down
    expect(val(home, 'router-cabinet', 'ip.dst', 'down')).toBe('203.0.113.7');
    expect(val(home, 'ap-router', 'ip.dst', 'down')).toBe('192.168.1.23');
  });

  it('rewrites address and port at the carrier-grade NAT', () => {
    expect([val(street, 'cell-tower-mobile-core', 'ip.src'), val(street, 'cell-tower-mobile-core', 'tcp.sport')]).toEqual(['100.64.12.7', '51034']);
    expect([val(street, 'mobile-core-core', 'ip.src'), val(street, 'mobile-core-core', 'tcp.sport')]).toEqual(['192.0.2.44', '20517']);
    expect(val(street, 'mobile-core-core', 'tcp.dport', 'down')).toBe('20517');
    expect(val(street, 'cell-tower-mobile-core', 'tcp.dport', 'down')).toBe('51034');
  });

  it('counts the TTL down at every router, not at bridges', () => {
    const ttls = home.links.map((l) => val(home, l.id, 'ip.ttl'));
    expect(ttls).toEqual(['64', '64', '63', '63', '63', '62', '61', '60', '60', '59', '58', '57', '56']);
    expect(val(home, 'bng-core', 'mpls.ttl')).toBe('62');
    expect(val(home, 'phone-ap', 'ip.ttl', 'down')).toBe('56');
  });

  it('keeps MAC addresses across bridges and writes new ones at routers', () => {
    const ra = onLink(home, 'phone-ap')[0].fields, eth = onLink(home, 'ap-router')[0].fields;
    const f = (fs: typeof ra, id: string) => fs.find((x) => x.id === id)!.value;
    expect(f(ra, 'addr1').who?.id).toBe('ap');
    expect(f(ra, 'addr2').who?.id).toBe('phone');
    expect(f(ra, 'addr3').who?.id).toBe('router');
    // the AP bridges: the Ethernet frame keeps the phone → router addresses
    expect([f(eth, 'src').who?.id, f(eth, 'dst').who?.id]).toEqual(['phone', 'router']);
    expect(f(eth, 'src').text).toBe(f(ra, 'addr2').text);
    // through the cabinet and the backhaul switch the frame runs from the home router to the BNG
    const vlan = onLink(home, 'backhaul-bng')[0].fields;
    expect([f(vlan, 'src').who?.id, f(vlan, 'dst').who?.id]).toEqual(['router', 'bng']);
    const core = onLink(home, 'bng-core')[0].fields;
    expect([f(core, 'src').who?.id, f(core, 'dst').who?.id]).toEqual(['bng', 'core']);
  });

  it('wraps the phone’s packet in a GTP-U tunnel from the tower to the mobile core', () => {
    const up = onLink(street, 'cell-tower-mobile-core');
    const gtp = up.find((l) => l.id === 'gtp')!.fields;
    const g = (id: string) => gtp.find((x) => x.id === id)!.value.text;
    expect([g('osrc'), g('odst'), g('udport')]).toEqual(['10.20.0.5', '10.20.0.1', '2152 (GTP-U)']);
    expect(val(street, 'cell-tower-mobile-core', 'gtp.osrc', 'down')).toBe('10.20.0.1');
    // the tower is where the link frame ends: it's a host on the operator's network
    const eth = up[0].fields;
    expect(eth.map((x) => x.value.who?.id).filter(Boolean)).toEqual(['mobile-core', 'cell-tower']);
    expect(val(street, 'cell-tower-mobile-core', 'ethernet.type')).toBe('0x0800 (IPv4)');
  });

  it('derives lengths and next-protocol codes from the layers inside', () => {
    expect(val(home, 'ap-router', 'ethernet.type')).toBe('0x0800 (IPv4)');
    expect(val(home, 'cabinet-backhaul', 'ethernet.type')).toBe('0x88A8 (802.1ad)');
    expect(val(home, 'bng-core', 'ethernet.type')).toBe('0x8847 (MPLS)');
    expect(val(home, 'ap-router', 'ip.proto')).toBe('6 (TCP)');
    // IP 20 + TCP 20 + TLS 5+16 + HTTP 360 going up
    expect(val(home, 'ap-router', 'ip.length')).toBe('421');
    expect(Number(val(street, 'cell-tower-mobile-core', 'gtp.olen'))).toBe(421 + 44);
    expect(Number(val(street, 'cell-tower-mobile-core', 'gtp.length'))).toBe(421 + 8);
  });
});

describe('one hop: received → used / changed → sent', () => {
  it('home Wi‑Fi AP: takes off the radio envelope and puts on a cable one', () => {
    const v = view(home, 'ap');
    expect(shape(v)).toBe('-wifi +ethernet ip (tcp) (tls) [http]');
    expect(used(v)).toContain('wifi.addr1');
    expect(changed(v)).toEqual([]);
  });

  it('home router (NAT): new frame, source address + port rewritten, TTL − 1, checksums fixed', () => {
    const v = view(home, 'router');
    expect(shape(v)).toBe('-ethernet +gpon ip (tcp) (tls) [http]');
    expect(changed(v)).toEqual(['ip.ttl', 'ip.checksum', 'ip.src', 'tcp.sport', 'tcp.checksum']);
    expect(field(v, 'ip.src').before?.text).toBe('192.168.1.23');
    expect(field(v, 'ip.src').value.who?.id).toBe('router');
    expect(used(v)).toEqual(expect.arrayContaining(['ip.dst', 'ip.ttl', 'tcp.sport', 'tcp.dport']));
  });

  it('ISP core router: swaps the MPLS label for the one the next router asked for, TTL − 1', () => {
    const v = view(home, 'core');
    expect(shape(v)).toBe('ethernet mpls ip (tcp) (tls) [http]');
    expect(changed(v)).toEqual(expect.arrayContaining(['mpls.label', 'mpls.ttl', 'ip.ttl']));
    expect(field(v, 'mpls.label').before?.text).toBe(val(home, 'bng-core', 'mpls.label'));
    expect(field(v, 'mpls.label').value.text).toBe(val(home, 'core-border', 'mpls.label'));
    // each direction has its own labels
    expect(val(home, 'core-border', 'mpls.label', 'down')).not.toBe(val(home, 'core-border', 'mpls.label'));
  });

  it('ISP border router: pops the last label at the edge, hashes the 5-tuple, plain IP over the exchange', () => {
    const v = view(home, 'border');
    expect(shape(v)).toBe('ethernet -mpls ip (tcp) (tls) [http]');
    expect(changed(v)).toEqual(['ethernet.dst', 'ethernet.src', 'ethernet.type', 'ethernet.fcs', 'ip.ttl', 'ip.checksum']);
    expect(used(v)).toEqual(expect.arrayContaining(['ip.src', 'ip.dst', 'ip.proto', 'tcp.sport', 'tcp.dport']));
    expect(used(v)).not.toContain('tcp.seq');
    expect(onLink(home, 'border-ixp').map((l) => l.id)).toEqual(['ethernet', 'ip', 'tcp', 'tls', 'http']);
  });

  it('5G: the tower wraps into GTP-U, the mobile core unwraps and NATs', () => {
    expect(shape(view(street, 'cell-tower'))).toBe('-nr +ethernet +gtp ip (tcp) (tls) [http]');
    const core = view(street, 'mobile-core');
    expect(shape(core)).toBe('ethernet -gtp +mpls ip (tcp) (tls) [http]');
    expect(used(core)).toEqual(expect.arrayContaining(['gtp.teid', 'gtp.odst']));
    expect(changed(core)).toEqual(expect.arrayContaining(['ip.src', 'tcp.sport']));
    // and the other way round on the way down
    expect(shape(view(street, 'mobile-core', 'down'))).toBe('ethernet -mpls +gtp ip (tcp) (tls) [http]');
    expect(shape(view(street, 'cell-tower', 'down'))).toBe('-ethernet -gtp +nr ip (tcp) (tls) [http]');
  });

  it('starts with every layer put on and ends with every layer opened', () => {
    const start = view(home, 'phone');
    expect(shape(start)).toBe('+wifi +ip +tcp +tls +http');
    expect([start.arrive, start.leave?.id]).toEqual([null, 'phone-ap']);
    const end = view(home, 'cdn');
    expect(shape(end)).toBe('ethernet ip tcp tls http');
    expect(used(end)).toContain('http.start');
    expect(end.leave).toBeNull();
    expect(shape(view(home, 'phone', 'down'))).toBe('wifi ip tcp tls http');
  });

});

describe('catching and stepping a packet', () => {
  it('steps hop by hop in the direction of travel, and stops at the ends', () => {
    expect([nextHop(3, 'up'), nextHop(3, 'down')]).toEqual([4, 2]);
    expect([stepHop(home, 3, 'up', 1), stepHop(home, 3, 'up', -1), stepHop(home, 3, 'down', 1)]).toEqual([4, 2, 2]);
    expect(stepHop(home, 0, 'up', -1)).toBeNull();
    expect(stepHop(home, home.chain.length - 1, 'up', 1)).toBeNull();
    expect(stepHop(home, 0, 'down', 1)).toBeNull();
  });

  it('steps spatially: the button, key or swipe pointing the way the packet moves on screen takes it on', () => {
    // a request moves right (portrait: up) along the chain, a response left (down): ▶ is "on" for one, ◀ for the other
    expect([hopStepFor('up', 1), hopStepFor('up', -1), hopStepFor('down', 1), hopStepFor('down', -1)]).toEqual([1, -1, -1, 1]);
    expect(stepHop(home, 3, 'down', hopStepFor('down', -1))).toBe(2);
    // …which holds because every path scene lays its chain out left → right (portrait: bottom → top)
    for (const activity of Object.keys(content.activities)) for (const place of Object.keys(content.places)) {
      const r = resolveRoute({ activity, places: [place] });
      const walk = (path: string[]): void => {
        const ref = sceneRef(r, path)!;
        for (const o of ['landscape', 'portrait'] as const) {
          const { pts } = chainOf(r, ref.kind === 'path' ? ref.group : null, o), a = pts[0], z = pts[pts.length - 1];
          if (o === 'landscape') expect(z.x, `${place} ${path}`).toBeGreaterThan(a.x);
          else expect(z.y, `${place} ${path}`).toBeLessThan(a.y);
        }
        for (const c of childrenOf(r, ref)) if (c.kind === 'expand') walk([...path, c.step]);
      };
      walk([]);
    }
  });

  it('catches a packet at the hop it is heading to, unless only the one behind it is drawn', () => {
    const all = () => true;
    expect([hopAhead(2, 'up', all), hopAhead(2, 'down', all)]).toEqual([3, 2]);
    // the root scene draws the home router but not the street cabinet inside the internet
    const root = (h: number) => pathScene(home, null, 'landscape').nodes.some((n) => n.kind === 'hop' && n.hop.index === h);
    expect(hopAhead(at(home, 'router'), 'up', root)).toBe(at(home, 'router'));
  });

  it('finds the scene that draws a hop, preferring the current one', () => {
    expect(hopScenePath(home, at(home, 'router'), 'landscape', [])).toEqual([]);
    expect(hopScenePath(home, at(home, 'core'), 'landscape', [])).toEqual(['internet']);
    expect(hopScenePath(home, at(home, 'core'), 'portrait', ['internet'])).toEqual(['internet']);
    expect(hopScenePath(home, at(home, 'phone'), 'landscape', ['internet'])).toEqual([]);
  });

  it('catches by kind where that kind enters the view: a request on the left (bottom), a response on the right (top)', () => {
    const entry = (r: Route, path: string[], dir: 'up' | 'down', o: 'landscape' | 'portrait' = 'landscape') =>
      r.chain[entryHop(r, dir, (h) => hopScenePath(r, h, o, path)?.join('/') === path.join('/'))!].id;
    for (const o of ['landscape', 'portrait'] as const) {
      expect([entry(home, [], 'up', o), entry(home, [], 'down', o)]).toEqual(['phone', 'router']);
      // the video comes out of the data centre, which is folded up in the internet: the exchange is the first drawn hop
      expect([entry(home, ['internet'], 'up', o), entry(home, ['internet'], 'down', o)]).toEqual(['cabinet', 'ixp']);
      expect([entry(home, ['internet', 'datacentre'], 'up', o), entry(home, ['internet', 'datacentre'], 'down', o)]).toEqual(['dc-router', 'cdn']);
      expect([entry(street, [], 'up', o), entry(street, [], 'down', o)]).toEqual(['phone', 'cell-tower']);
      expect([entry(street, ['internet'], 'up', o), entry(street, ['internet'], 'down', o)]).toEqual(['mobile-core', 'ixp']);
    }
    expect(entryHop(home, 'up', () => false)).toBeNull();

    // every place, activity, path scene, orientation and direction: the entry hop is the first drawn one the packet
    // reaches, at the edge it comes in by, with a spot to wait at; it glides in from outside (never back from further
    // on), and stepping on from there passes every hop the scene draws
    for (const activity of Object.keys(content.activities)) for (const place of Object.keys(content.places)) {
      const r = resolveRoute({ activity, places: [place] });
      const walk = (path: string[]): void => {
        const ref = sceneRef(r, path)!;
        for (const o of ['landscape', 'portrait'] as const) {
          const ps = pathScene(r, ref.kind === 'path' ? ref.group : null, o);
          const drawn = (h: number) => hopScenePath(r, h, o, path)?.join('/') === path.join('/');
          // along the chain on screen: x in landscape, up the screen in portrait
          const along = (p: { x: number; y: number }) => (o === 'landscape' ? p.x : -p.y);
          const nodeAt = (h: number) => ps.nodes.find((n) => n.kind === 'hop' && n.hop.index === h)!;
          const shown = r.chain.map((h) => h.index).filter(drawn);
          for (const dir of ['up', 'down'] as const) {
            const what = `${place} ${activity} /${path.join('/')} ${o} ${dir}`;
            const h = entryHop(r, dir, drawn)!;
            expect(h, what).not.toBeNull();
            const ahead: number[] = [];
            for (let k: number | null = h; k !== null; k = stepHop(r, k, dir, 1)) ahead.push(k);
            expect(shown.every((k) => ahead.includes(k)), what).toBe(true);
            const xs = shown.map((k) => along(nodeAt(k)));
            expect(along(nodeAt(h)), what).toBe(dir === 'up' ? Math.min(...xs) : Math.max(...xs));
            const spot = caughtSpot(ps, h, dir)!;
            expect(spot, what).not.toBeNull();
            const from = along(bezier(spot.link, dir === 'up' ? 0 : 1)), at = along(bezier(spot.link, spot.t));
            expect(dir === 'up' ? from <= at : from >= at, what).toBe(true);
          }
        }
        for (const c of childrenOf(r, ref)) if (c.kind === 'expand') walk([...path, c.step]);
      };
      walk([]);
    }
  });

  it('waits just before the hop on the link it arrives on', () => {
    const ps = pathScene(home, null, 'landscape');
    const up = caughtSpot(ps, at(home, 'router'), 'up')!;
    expect([up.link.link.id, up.t]).toEqual(['ap-router', 0.96]);
    const down = caughtSpot(ps, at(home, 'router'), 'down')!;
    expect(down.link.link.id).toBe('router-cabinet');
    expect(down.t).toBeCloseTo(0.04);
    // the sender: on the link it leaves by
    expect(caughtSpot(ps, 0, 'up')!.link.link.id).toBe('phone-ap');
    // inside the internet, the cabinet's arriving link comes from the house
    const inside = caughtSpot(pathScene(home, 'internet', 'landscape'), at(home, 'cabinet'), 'up')!;
    expect(inside.link.link.id).toBe('router-cabinet');
  });
});
