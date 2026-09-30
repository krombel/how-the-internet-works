import { describe, expect, it } from 'vitest';
import { normaliseChoice, resolveRoute } from './resolve';
import { morphScene, pathScene } from './layout';
import { chainAt, chainItemAt, chainNear, chainOf, chainWarp, childrenOf, diveRuns, downFrom, frameOf, layerPath, linkDivePath, linkOut, sceneRef, sideways, travelOf, upFrom, validPrefix } from './tree';
import { DETAIL_SCALE, WORLD_SIZE, bezier } from '../engine/geometry';
import { formatHash, normaliseLoc, parseHash } from './location';
import { content, type Content } from './registry';
import { packetOn } from './packet';

const home = resolveRoute({ activity: 'watch-video', places: ['home'] });
const street = resolveRoute({ activity: 'watch-video', places: ['street'] });
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe('resolveRoute', () => {
  it('chains the place and the shared segment', () => {
    expect(ids(home.chain)).toEqual(['phone', 'ap', 'router', 'cabinet', 'backhaul', 'bng', 'core', 'ixp', 'cdn']);
    expect(ids(street.chain)).toEqual(['phone', 'cell-tower', 'mobile-core', 'core', 'ixp', 'cdn']);
    expect(home.links.map((l) => l.tech.id)).toEqual(['wifi', 'ethernet', 'gpon', 'metro-fibre', 'metro-fibre', 'backbone', 'backbone', 'backbone']);
  });

  it('defaults unknown places and activities', () => {
    expect(normaliseChoice({ activity: 'nope', places: ['moon'] })).toEqual({ activity: 'watch-video', places: ['home'] });
    expect(resolveRoute({ activity: 'watch-video', places: [] })).toBe(home);
  });

  it('picks the entry stand-in for a group', () => {
    expect(home.entry.internet.id).toBe('home');
    expect(street.entry.internet.id).toBe('cell-tower');
  });

  // generic: holds for whatever places and activities exist, so a new content folder is exercised too
  it('makes a working route for every place × activity', () => {
    for (const activity of Object.keys(content.activities)) for (const place of Object.keys(content.places)) {
      const r = resolveRoute({ activity, places: [place] });
      const what = `${place} × ${activity}`;
      expect(r.chain[0].role, what).toBe('endpoint');
      expect(r.chain.at(-1)!.role, what).toBe('endpoint');
      expect(r.links.length, what).toBe(r.chain.length - 1);
      // every header field resolves to a value on every link, both ways
      for (const l of r.links) for (const f of r.activity.flows) for (const dir of ['up', 'down'] as const) {
        const layers = packetOn(r, f, l.index, dir);
        expect(layers.length, what).toBeGreaterThan(f.stack.length);
        for (const x of layers) for (const v of x.fields) expect(v.value.text || v.value.key, `${what} ${l.id} ${dir} ${x.id}.${v.id}`).toMatch(/^[^{}]+$/);
      }
      for (const o of ['landscape', 'portrait'] as const) {
        const walk = (path: string[]): void => {
          const ref = sceneRef(r, path, o);
          expect(ref, `${what} ${o} /${path.join('/')}`).not.toBeNull();
          for (const c of childrenOf(r, ref!, o)) walk([...path, c.step]);
        };
        walk([]);
      }
    }
  });
});

describe('path scenes', () => {
  it('collapses the group at the root', () => {
    const ps = pathScene(home, null, 'landscape');
    expect(ids(ps.nodes)).toEqual(['phone', 'ap', 'router', 'internet']);
    expect(ps.route).toEqual(['phone-ap', 'ap-router', 'router-internet']);
    expect(ps.stops).toEqual(['phone', 'phone-ap', 'ap', 'ap-router', 'router', 'router-internet', 'internet']);
    expect(ps.links[2].link.id).toBe('router-cabinet');
    expect(ids(pathScene(street, null, 'portrait').nodes)).toEqual(['phone', 'cell-tower', 'internet']);
  });

  it('unfolds the group with its entry and side branch', () => {
    const ps = pathScene(home, 'internet', 'landscape');
    expect(ids(ps.nodes)).toEqual(['home', 'cabinet', 'backhaul', 'bng', 'core', 'ixp', 'cdn', 'transit']);
    expect(ps.stops).toEqual(['home-cabinet', 'cabinet', 'cabinet-backhaul', 'backhaul', 'backhaul-bng', 'bng', 'bng-core', 'core', 'transit', 'core-ixp', 'ixp', 'ixp-cdn', 'cdn']);
    expect(ps.links.find((l) => l.id === 'core-transit')?.dashed).toBe(true);
    const s = pathScene(street, 'internet', 'landscape');
    expect(ids(s.nodes).slice(0, 3)).toEqual(['cell-tower', 'mobile-core', 'core']);
    expect(s.nodes[0].kind).toBe('entry');
  });

  it('auto-places every node inside the world', () => {
    for (const r of [home, street]) for (const o of ['landscape', 'portrait'] as const) for (const g of [null, 'internet'])
      for (const n of pathScene(r, g, o).nodes) expect(Number.isFinite(n.x) && Number.isFinite(n.y) && n.size > 0).toBe(true);
  });

  it('morphs: shared nodes glide, others fade', () => {
    const a = pathScene(home, null, 'landscape'), b = pathScene(street, null, 'landscape');
    const mid = morphScene(a, b, 0.5);
    const phone = mid.nodes.find((n) => n.id === 'phone')!;
    expect(phone.x).toBeGreaterThan(Math.min(a.nodes[0].x, b.nodes[0].x) - 1);
    expect(mid.nodes.find((n) => n.id === 'ap')!.alpha).toBe(0);
    expect(morphScene(a, b, 1).nodes.filter((n) => n.alpha === 1).map((n) => n.id).sort()).toEqual(['cell-tower', 'internet', 'phone']);
  });
});

const notLayers = (r: typeof home, path: string[]) => childrenOf(r, sceneRef(r, path)!).filter((c) => c.kind !== 'layer');
const layerSteps = (r: typeof home, path: string[]) => childrenOf(r, sceneRef(r, path)!).filter((c) => c.kind === 'layer').map((c) => c.step);
/** The real content with dives for exactly IP, TCP and GTP (so these tests don't depend on which layer dives exist). */
const layerDives = () => {
  const c: Content = structuredClone(content);
  for (const l of Object.values(c.layers)) delete l.dive;
  c.layers.ip.dive = c.layers.tcp.dive = c.layers.gtp.dive = Object.values(c.scenes).find((s) => s.explains === 'layer')!.id;
  return { home: resolveRoute({ activity: 'watch-video', places: ['home'] }, c), street: resolveRoute({ activity: 'watch-video', places: ['street'] }, c) };
};

/** The real content with a dive for every layer (so these tests don't depend on which layer dives exist). */
const allLayerDives = () => {
  const c: Content = structuredClone(content);
  for (const l of Object.values(c.layers)) l.dive = Object.values(c.scenes).find((s) => s.explains === 'layer')!.id;
  return { home: resolveRoute({ activity: 'watch-video', places: ['home'] }, c), street: resolveRoute({ activity: 'watch-video', places: ['street'] }, c) };
};

describe('scene tree', () => {
  it('lists children in route order', () => {
    expect(notLayers(home, [])).toEqual([
      { step: 'phone-ap', kind: 'dive' }, { step: 'ap-router', kind: 'dive' }, { step: 'router-internet', kind: 'dive' }, { step: 'internet', kind: 'expand' },
    ]);
    expect(notLayers(street, []).map((c) => c.step)).toEqual(['phone-cell-tower', 'cell-tower-internet', 'internet']);
    // the backbone links are one stretch, one dive
    expect(notLayers(street, ['internet']).map((c) => c.step)).toEqual(['cell-tower-mobile-core', 'mobile-core-core']);
  });

  it('resolves dives with their subject link', () => {
    const ref = sceneRef(home, ['internet', 'home-cabinet'])!;
    expect(ref.kind).toBe('dive');
    expect(ref.dive).toBe('fibre-light');
    expect(ref.link?.link.tech.id).toBe('gpon');
    expect(sceneRef(street, ['phone-cell-tower'])?.dive).toBe('nr-radio');
  });

  it('nests frames at any depth', () => {
    const f1 = frameOf(home, ['internet'], 'landscape'), f2 = frameOf(home, ['internet', 'home-cabinet'], 'landscape');
    expect(f2.s).toBeCloseTo(f1.s * f1.s);
    expect(f2.x).toBeGreaterThan(0);
  });

  it('has layer dives at the hops drawn in each scene, following their hop', () => {
    const { home: h, street: s } = layerDives();
    expect(layerSteps(h, [])).toEqual(['phone~ip', 'phone~tcp', 'ap~ip', 'ap~tcp', 'router~ip', 'router~tcp']);
    // inside a group: its own hops, not the entry stand-in ("home") or a side branch nobody travels ("transit")
    expect(layerSteps(h, ['internet']).filter((x) => x.endsWith('~ip'))).toEqual(['cabinet~ip', 'backhaul~ip', 'bng~ip', 'core~ip', 'ixp~ip', 'cdn~ip']);
    // lower layers first: GTP (under IP on the tunnel link) at the tower and the core; the phone never sees it
    expect(layerSteps(s, [])).toEqual(['phone~ip', 'phone~tcp', 'cell-tower~gtp', 'cell-tower~ip', 'cell-tower~tcp']);
    expect(layerSteps(s, ['internet']).slice(0, 3)).toEqual(['mobile-core~gtp', 'mobile-core~ip', 'mobile-core~tcp']);
    // follows the order of the route: the phone's layers come right after the phone
    expect(childrenOf(h, sceneRef(h, [])!).slice(0, 3).map((c) => c.step)).toEqual(['phone~ip', 'phone~tcp', 'phone-ap']);
  });

  it('resolves layer dives with the hop that reads them', () => {
    const { home: h, street: s } = layerDives();
    const at = (r: typeof home, path: string[]) => { const ref = sceneRef(r, path)!; return { kind: ref.kind, hop: ref.at!.hop, link: ref.at!.link.id, dir: ref.at!.dir, packet: ref.at!.kind }; };
    // arriving upwards when it does (the request at the home router), else downwards (the video at the phone)
    expect(at(h, ['router~ip'])).toEqual({ kind: 'layer', hop: 'router', link: 'ap-router', dir: 'up', packet: 'request' });
    expect(at(h, ['phone~tcp'])).toEqual({ kind: 'layer', hop: 'phone', link: 'phone-ap', dir: 'down', packet: 'video' });
    expect(at(s, ['cell-tower~gtp'])).toMatchObject({ link: 'cell-tower-mobile-core', dir: 'down' });
    expect(at(s, ['internet', 'mobile-core~gtp'])).toMatchObject({ link: 'cell-tower-mobile-core', dir: 'up' });
    expect(sceneRef(h, ['router~ip'])!.dive).toBe(h.content.layers.ip.dive);
    expect(sceneRef(h, ['router~http'])).toBeNull();
    expect(sceneRef(h, ['internet~ip'])).toBeNull();
  });

  it('stacks a hop\'s layer dives on it: upper layers above', () => {
    const { street: s } = layerDives();
    for (const o of ['landscape', 'portrait'] as const) {
      const [gtp, ip, tcp] = ['cell-tower~gtp', 'cell-tower~ip', 'cell-tower~tcp'].map((x) => frameOf(s, [x], o));
      expect(gtp.x).toBeCloseTo(ip.x);
      expect(tcp.x).toBeCloseTo(ip.x);
      expect(ip.y).toBeLessThan(gtp.y);
      expect(tcp.y).toBeLessThan(ip.y);
      expect(gtp.y - ip.y).toBeCloseTo(ip.y - tcp.y);
    }
  });

  it('finds where a layer dive lives', () => {
    expect(layerPath(home, 'router', 'ip')).toEqual(['router~ip']);
    expect(layerPath(home, 'cabinet', 'ip')).toEqual(['internet', 'cabinet~ip']);
    expect(layerPath(street, 'mobile-core', 'ip')).toEqual(['internet', 'mobile-core~ip']);
    expect(layerPath(home, 'transit', 'ip')).toBeNull();
    expect(layerPath(home, 'router', 'wifi')).toBeNull();
  });

  it('steps sideways along stops, between link dives, and up and down a hop\'s layers', () => {
    const { home: h } = layerDives();
    expect(sideways(h, [], 'ap', 'landscape')).toMatchObject({ kind: 'stop', i: 2, min: -1 });
    expect(sideways(h, [], null, 'landscape').steps).toEqual(pathScene(h, null, 'landscape').stops);
    expect(sideways(h, ['router-internet'], null, 'landscape')).toEqual({ kind: 'dive', steps: ['phone-ap', 'ap-router', 'router-internet'], i: 2, min: 0 });
    expect(sideways(h, ['router~ip'], null, 'portrait')).toEqual({ kind: 'layer', steps: ['router~ip', 'router~tcp'], i: 0, min: 0 });
    expect(sideways(h, ['internet', 'core~tcp'], null, 'landscape')).toEqual({ kind: 'layer', steps: ['core~ip', 'core~tcp'], i: 1, min: 0 });
  });

  it('makes a stretch of consecutive links into the same scene with the same technology one dive', () => {
    const desk = resolveRoute({ activity: 'watch-video', places: ['desk'] });
    const runs = (r: typeof home, group: string | null) => diveRuns(r, group, 'landscape').runs.map((x) => x.links.map((l) => l.id));
    // access, metro, backbone: not six identical fibre dives
    expect(runs(home, 'internet')).toEqual([['home-cabinet'], ['cabinet-backhaul', 'backhaul-bng'], ['bng-core', 'core-ixp', 'ixp-cdn']]);
    expect(runs(street, 'internet')).toEqual([['cell-tower-mobile-core'], ['mobile-core-core', 'core-ixp', 'ixp-cdn']]);
    // different scenes (or technologies) stay apart
    expect(runs(street, null)).toEqual([['phone-cell-tower'], ['cell-tower-internet']]);
    expect(runs(desk, null)).toEqual([['laptop-router'], ['router-internet']]);
    // one child, one sideways stop, one step each way: its first link is its step, the rest are not steps of their own
    expect(sideways(home, ['internet', 'cabinet-backhaul'], null, 'portrait')).toMatchObject({ steps: ['home-cabinet', 'cabinet-backhaul', 'bng-core'], i: 1 });
    expect(sceneRef(home, ['internet', 'backhaul-bng'])).toBeNull();
    expect(validPrefix(home, ['internet', 'backhaul-bng'])).toEqual(['internet']);
    // the dive sits in the middle of the stretch (a single link's at its midpoint), and a travel lands there
    for (const o of ['landscape', 'portrait'] as const) {
      const ch = chainOf(home, 'internet', o), s = (id: string) => ch.items.find((x) => x.id === id)!.s;
      const metro = diveRuns(home, 'internet', o).byLink.get('backhaul-bng')!;
      expect(metro.s).toBeCloseTo((s('cabinet-backhaul') + s('backhaul-bng')) / 2);
      expect(travelOf(home, ['internet', 'home-cabinet'], ['internet', 'cabinet-backhaul'], o)).toEqual({ parent: ['internet'], b: metro.s });
      expect(travelOf(home, ['internet', 'bng-core'], ['internet', 'home-cabinet'], o)!.b).toBe(s('home-cabinet'));
      const pf = frameOf(home, ['internet'], o), f = frameOf(home, ['internet', 'cabinet-backhaul'], o), W = WORLD_SIZE[o];
      expect(f.x).toBeCloseTo(pf.x + (metro.at.x - (W.w * DETAIL_SCALE) / 2) * pf.s, 6);
      expect(f.y).toBeCloseTo(pf.y + (metro.at.y - (W.h * DETAIL_SCALE) / 2) * pf.s, 6);
    }
    // a layer dive's way down to its signal finds the stretch
    const backhaul = pathScene(home, 'internet', 'landscape').links.find((l) => l.id === 'backhaul-bng')!.link;
    expect(linkDivePath(home, backhaul)).toEqual(['internet', 'cabinet-backhaul']);
  });

  it('draws a path scene\'s chain as one curve through its links and devices', () => {
    for (const o of ['landscape', 'portrait'] as const) {
      const ps = pathScene(home, 'internet', o), ch = chainOf(home, 'internet', o);
      // device, link, device, …, in route order, along an increasing arc
      expect(ch.items.map((x) => x.id)).toEqual(['home', ...ps.route.flatMap((id) => [id, ps.links.find((l) => l.id === id)!.to])]);
      for (let i = 1; i < ch.items.length; i++) expect(ch.items[i].s).toBeGreaterThan(ch.items[i - 1].s);
      // a link sits at its midpoint (where a single link's dive is anchored)
      for (const id of ps.route) {
        const l = ps.links.find((x) => x.id === id)!, p = chainAt(ch, ch.items.find((x) => x.id === id)!.s), m = bezier(l, 0.5);
        expect(Math.hypot(p.x - m.x, p.y - m.y)).toBeLessThan(1e-6);
      }
      expect(chainItemAt(ch, ch.items[3].s + 1)).toBe(ch.items[3].id);
      // links know their technology, devices have none
      for (const it of ch.items) expect(it.tech).toBe(ps.links.find((l) => l.id === it.id)?.link.tech.id ?? null);
    }
  });

  it('slows a glide down past each device, and moves on along the links', () => {
    const ch = chainOf(home, null, 'landscape'), s = (id: string) => ch.items.find((x) => x.id === id)!.s;
    const a = s('phone-ap'), b = s('ap-router'), ap = s('ap'), r = (b - a) / 6;
    for (const [from, to] of [[a, b], [b, a]]) {
      const w = chainWarp(ch, from, to, 0.4, r), N = 400, u = (i: number) => i / N;
      expect([w.at(0), w.at(1)].map((x) => +x.toFixed(6))).toEqual([from, to].map((x) => +x.toFixed(6)));
      // monotonic, and the time spent near the access point is longer than plain arc length would give it
      for (let i = 1; i <= N; i++) expect((w.at(u(i)) - w.at(u(i - 1))) * Math.sign(to - from)).toBeGreaterThanOrEqual(0);
      const near = Array.from({ length: N + 1 }, (_, i) => w.at(u(i))).filter((x) => Math.abs(x - ap) < r / 2).length / (N + 1);
      expect(near).toBeGreaterThan((r / Math.abs(to - from)) * 1.5);
      // setting off on a plain stretch of link: quicker than the average
      expect(w.rate0).toBeGreaterThan(1);
    }
    // no slow-down: plain arc length
    expect(chainWarp(ch, a, b, 1, r).at(0.3)).toBeCloseTo(a + (b - a) * 0.3);
  });

  it('travels between sibling dives on the chain, and only those', () => {
    const tv = travelOf(home, ['phone-ap'], ['ap-router'], 'landscape')!;
    const ch = chainOf(home, null, 'landscape'), s = (id: string) => ch.items.find((x) => x.id === id)!.s;
    expect(tv).toEqual({ parent: [], b: s('ap-router') });
    // setting off from where the camera is: on a link's dive, that link's midpoint; stopped part-way, the nearest point
    expect(chainNear(ch, chainAt(ch, s('phone-ap')))).toBeCloseTo(s('phone-ap'), 6);
    expect(Math.abs(chainNear(ch, { x: chainAt(ch, s('ap')).x, y: chainAt(ch, s('ap')).y + 3 }) - s('ap'))).toBeLessThan(5);
    // passing the access point on the way
    expect(chainItemAt(ch, (s('phone-ap') + tv.b) / 2)).toBe('ap');
    expect(travelOf(home, ['internet', 'bng-core'], ['internet', 'cabinet-backhaul'], 'portrait')).toMatchObject({ parent: ['internet'] });
    const { home: h } = layerDives();
    expect(travelOf(h, ['router~ip'], ['router~tcp'], 'landscape')).toBeNull();
    expect(travelOf(home, ['router-internet'], ['internet', 'home-cabinet'], 'landscape')).toBeNull();
    expect(travelOf(home, [], ['phone-ap'], 'landscape')).toBeNull();
    expect(travelOf(home, ['phone-ap'], ['phone-ap'], 'landscape')).toBeNull();
    expect(travelOf(home, ['router-internet'], ['internet'], 'landscape')).toBeNull();
  });

  it('goes down from a link envelope to its signal, next to it if it can', () => {
    const { home: h, street: s } = allLayerDives();
    const down = (r: typeof h, path: string[]) => downFrom(r, sceneRef(r, path)!);
    expect(down(h, ['ap~wifi'])).toEqual(['phone-ap']);
    expect(down(h, ['phone~wifi'])).toEqual(['phone-ap']);
    expect(down(h, ['router~ethernet'])).toEqual(['ap-router']);
    expect(down(h, ['router~gpon'])).toEqual(['router-internet']);
    expect(down(h, ['internet', 'cabinet~gpon'])).toEqual(['internet', 'home-cabinet']);
    expect(down(h, ['internet', 'backhaul~vlan'])).toEqual(['internet', 'cabinet-backhaul']);
    expect(down(s, ['cell-tower~gtp'])).toEqual(['cell-tower-internet']);
    expect(down(h, ['router~ip'])).toBeNull();
    expect(downFrom(h, sceneRef(h, ['phone-ap'])!)).toBeNull();
  });

  it('goes up from a signal to the envelopes it carries, beside it if it can', () => {
    const { home: h, street: s } = allLayerDives();
    const up = (r: typeof h, path: string[]) => upFrom(r, sceneRef(r, path)!);
    expect(up(h, ['phone-ap'])).toEqual([{ layer: 'wifi', path: ['ap~wifi'] }]);
    expect(up(h, ['router-internet'])).toEqual([{ layer: 'gpon', path: ['router~gpon'] }]);
    expect(up(h, ['internet', 'home-cabinet'])).toEqual([{ layer: 'gpon', path: ['internet', 'cabinet~gpon'] }]);
    expect(up(h, ['internet', 'bng-core']).map((u) => u.path)).toEqual([['internet', 'core~ethernet'], ['internet', 'core~mpls']]);
    expect(up(s, ['cell-tower-internet']).map((u) => u.path)).toEqual([['cell-tower~ethernet'], ['cell-tower~gtp']]);
    expect(up(h, ['router~ip'])).toEqual([]);
  });

  it('finds the link a caught packet leaves on, or arrived on at the end', () => {
    const last = home.chain.length - 1;
    expect(linkOut(home, 0, 'up')?.id).toBe('phone-ap');
    expect(linkOut(home, 1, 'down')?.id).toBe('phone-ap');
    expect(linkOut(home, last, 'up')?.id).toBe(home.links[last - 1].id);
    expect(linkOut(home, 0, 'down')?.id).toBe('phone-ap');
  });

  it('falls back to the deepest valid prefix', () => {
    expect(validPrefix(street, ['internet', 'home-cabinet'])).toEqual(['internet']);
    expect(validPrefix(street, ['phone-ap'])).toEqual([]);
    expect(validPrefix(street, ['router~ip'])).toEqual([]);
    expect(validPrefix(street, ['internet', 'cabinet~ip'])).toEqual(['internet']);
  });
});

describe('location', () => {
  it('round-trips', () => {
    const h = '#/da/street/watch-video/internet/@mobile-core';
    const l = parseHash(h);
    expect(l).toEqual({ lang: 'da', places: ['street'], activity: 'watch-video', path: ['internet'], stop: 'mobile-core' });
    expect(formatHash(l)).toBe(h);
    expect(normaliseLoc(l)).toEqual(l);
  });

  it('round-trips layer dives', () => {
    for (const h of ['#/en/home/watch-video/router~ip', '#/da/street/watch-video/internet/mobile-core~ip']) {
      const l = parseHash(h);
      expect(formatHash(l)).toBe(h);
      expect(normaliseLoc(l)).toEqual(l);
    }
    expect(parseHash('#/en/home/watch-video/internet/cabinet~ip').path).toEqual(['internet', 'cabinet~ip']);
  });

  it('keeps a layer dive across a place switch only where its hop still is', () => {
    expect(normaliseLoc(parseHash('#/en/street/watch-video/phone~ip')).path).toEqual(['phone~ip']);
    expect(normaliseLoc(parseHash('#/en/street/watch-video/router~ip')).path).toEqual([]);
    expect(normaliseLoc(parseHash('#/en/street/watch-video/internet/cabinet~ip')).path).toEqual(['internet']);
    expect(normaliseLoc(parseHash('#/en/street/watch-video/phone~wifi')).path).toEqual([]);
  });

  it('repairs stale and partial links', () => {
    expect(normaliseLoc(parseHash('#/xx'))).toEqual({ lang: 'en', places: ['home'], activity: 'watch-video', path: [], stop: null });
    expect(normaliseLoc(parseHash('#/en/street/watch-video/internet/home-cabinet'))).toMatchObject({ path: ['internet'], stop: null });
    expect(normaliseLoc(parseHash('#/en/home/watch-video/@nope')).stop).toBeNull();
    expect(parseHash('', 'da-DK').lang).toBe('da');
  });
});
