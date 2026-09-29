import { describe, expect, it } from 'vitest';
import { normaliseChoice, resolveRoute } from './resolve';
import { morphScene, pathScene } from './layout';
import { childrenOf, frameOf, layerPath, sceneRef, sideways, validPrefix } from './tree';
import { formatHash, normaliseLoc, parseHash } from './location';
import { content, type Content } from './registry';
import { stackOf } from './stack';

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
      for (const l of r.links) for (const f of r.activity.flows) expect(stackOf(r, l, f.stack, 'endpoint').length, what).toBeGreaterThan(f.stack.length);
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
    expect(ps.stops).toEqual(['home-cabinet', 'cabinet', 'backhaul', 'bng', 'core', 'transit', 'ixp', 'cdn']);
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
/** The real content, with a dive for two more layers (so these tests don't depend on which layer dives exist). */
const twoDives = () => {
  const c: Content = structuredClone(content);
  c.layers.ip.dive = c.layers.tcp.dive = c.layers.gtp.dive = Object.values(c.scenes).find((s) => s.explains === 'layer')!.id;
  return { home: resolveRoute({ activity: 'watch-video', places: ['home'] }, c), street: resolveRoute({ activity: 'watch-video', places: ['street'] }, c) };
};

describe('scene tree', () => {
  it('lists children in route order', () => {
    expect(notLayers(home, [])).toEqual([
      { step: 'phone-ap', kind: 'dive' }, { step: 'router-internet', kind: 'dive' }, { step: 'internet', kind: 'expand' },
    ]);
    expect(notLayers(street, []).map((c) => c.step)).toEqual(['phone-cell-tower', 'cell-tower-internet', 'internet']);
    expect(notLayers(street, ['internet'])).toEqual([{ step: 'cell-tower-mobile-core', kind: 'dive' }]);
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
    const { home: h, street: s } = twoDives();
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
    const { home: h, street: s } = twoDives();
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
    const { street: s } = twoDives();
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
    const { home: h } = twoDives();
    expect(sideways(h, [], 'ap', 'landscape')).toMatchObject({ kind: 'stop', i: 2, min: -1 });
    expect(sideways(h, [], null, 'landscape').steps).toEqual(pathScene(h, null, 'landscape').stops);
    expect(sideways(h, ['router-internet'], null, 'landscape')).toEqual({ kind: 'dive', steps: ['phone-ap', 'router-internet'], i: 1, min: 0 });
    expect(sideways(h, ['router~ip'], null, 'portrait')).toEqual({ kind: 'layer', steps: ['router~ip', 'router~tcp'], i: 0, min: 0 });
    expect(sideways(h, ['internet', 'core~tcp'], null, 'landscape')).toEqual({ kind: 'layer', steps: ['core~ip', 'core~tcp'], i: 1, min: 0 });
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
    expect(normaliseLoc(parseHash('#/en/home/watch-video/phone~wifi')).path).toEqual([]);
  });

  it('repairs stale and partial links', () => {
    expect(normaliseLoc(parseHash('#/xx'))).toEqual({ lang: 'en', places: ['home'], activity: 'watch-video', path: [], stop: null });
    expect(normaliseLoc(parseHash('#/en/street/watch-video/internet/home-cabinet'))).toMatchObject({ path: ['internet'], stop: null });
    expect(normaliseLoc(parseHash('#/en/home/watch-video/@nope')).stop).toBeNull();
    expect(parseHash('', 'da-DK').lang).toBe('da');
  });
});
