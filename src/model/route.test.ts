import { describe, expect, it } from 'vitest';
import { normaliseChoice, resolveRoute } from './resolve';
import { morphScene, pathScene } from './layout';
import { childrenOf, frameOf, sceneRef, validPrefix } from './tree';
import { formatHash, normaliseLoc, parseHash } from './location';

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

describe('scene tree', () => {
  it('lists children in route order', () => {
    expect(childrenOf(home, sceneRef(home, [])!)).toEqual([
      { step: 'phone-ap', kind: 'dive' }, { step: 'router-internet', kind: 'dive' }, { step: 'internet', kind: 'expand' },
    ]);
    expect(childrenOf(street, sceneRef(street, [])!).map((c) => c.step)).toEqual(['phone-cell-tower', 'cell-tower-internet', 'internet']);
    expect(childrenOf(street, sceneRef(street, ['internet'])!)).toEqual([{ step: 'cell-tower-mobile-core', kind: 'dive' }]);
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

  it('falls back to the deepest valid prefix', () => {
    expect(validPrefix(street, ['internet', 'home-cabinet'])).toEqual(['internet']);
    expect(validPrefix(street, ['phone-ap'])).toEqual([]);
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

  it('repairs stale and partial links', () => {
    expect(normaliseLoc(parseHash('#/xx'))).toEqual({ lang: 'en', places: ['home'], activity: 'watch-video', path: [], stop: null });
    expect(normaliseLoc(parseHash('#/en/street/watch-video/internet/home-cabinet'))).toMatchObject({ path: ['internet'], stop: null });
    expect(normaliseLoc(parseHash('#/en/home/watch-video/@nope')).stop).toBeNull();
    expect(parseHash('', 'da-DK').lang).toBe('da');
  });
});
