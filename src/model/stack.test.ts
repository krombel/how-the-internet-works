import { beforeAll, describe, expect, it } from 'vitest';
import { resolveRoute } from './resolve';
import { layerCtx } from './stack';
import { firstOf, loadPack, lookupLevel, packs } from './strings';

const home = resolveRoute({ activity: 'watch-video', places: ['home'] });
const street = resolveRoute({ activity: 'watch-video', places: ['street'] });
const link = (r: typeof home, id: string) => r.links.find((l) => l.id === id)!;

describe('addresses', () => {
  it('rewrites the source at the home NAT', () => {
    const inside = layerCtx(home, link(home, 'ap-router'), 'video', 'request', 'up', 'kid');
    expect([inside.src, inside.dst]).toEqual(['192.168.1.23', '198.51.100.20']);
    expect(inside.nat).toEqual({ inside: '192.168.1.23', outside: '203.0.113.7', insidePort: 51034, outsidePort: 61757 });
    expect([inside.sport, inside.dport]).toEqual([51034, 443]);
    const outside = layerCtx(home, link(home, 'router-cabinet'), 'video', 'request', 'up', 'kid');
    expect(outside.src).toBe('203.0.113.7');
    const back = layerCtx(home, link(home, 'phone-ap'), 'video', 'video', 'down', 'kid');
    expect([back.src, back.dst]).toEqual(['198.51.100.20', '192.168.1.23']);
  });

  it('does carrier-grade NAT in the mobile core', () => {
    const tunnel = layerCtx(street, link(street, 'cell-tower-mobile-core'), 'video', 'request', 'up', 'nerd');
    expect(tunnel.src).toBe('100.64.12.7');
    expect(tunnel.nat).toEqual({ inside: '100.64.12.7', outside: '192.0.2.44', insidePort: 51034, outsidePort: 20517 });
    const out = layerCtx(street, link(street, 'mobile-core-core'), 'video', 'request', 'up', 'nerd');
    expect([out.src, out.sport]).toEqual(['192.0.2.44', 20517]);
    const back = layerCtx(street, link(street, 'mobile-core-core'), 'video', 'video', 'down', 'nerd');
    expect([back.dst, back.dport, back.sport]).toEqual(['192.0.2.44', 20517, 443]);
  });

  it('counts down the TTL at each router', () => {
    expect(layerCtx(home, link(home, 'phone-ap'), 'video', 'request', 'up', 'kid').ttl).toBe(64);
    expect(layerCtx(home, link(home, 'router-cabinet'), 'video', 'request', 'up', 'kid').ttl).toBe(63);
    expect(layerCtx(home, link(home, 'ixp-dc-router'), 'video', 'request', 'up', 'kid').ttl).toBeLessThan(63);
  });
});

describe('link frames (#132)', () => {
  const ids = (c: ReturnType<typeof layerCtx>) => [c.frame.src.id, c.frame.dst.id, c.next?.id ?? null];
  const ctx = (r: typeof home, l: string, dir: 'up' | 'down') => layerCtx(r, link(r, l), 'video', 'request', dir, 'nerd');

  it('passes a frame through bridges with the MACs of the hops at either end', () => {
    expect(ids(ctx(home, 'phone-ap', 'up'))).toEqual(['phone', 'router', 'router']);
    expect(ids(ctx(home, 'border-ixp', 'up'))).toEqual(['border', 'dc-router', 'dc-router']);
    expect(ids(ctx(home, 'cabinet-olt', 'up'))).toEqual(['router', 'bng', 'bng']);
  });

  it('names the next hop on the outgoing link, the way the packet goes (what a router ARPs for)', () => {
    expect(ids(ctx(home, 'ap-router', 'up'))).toEqual(['phone', 'router', 'bng']);
    expect(ids(ctx(home, 'router-cabinet', 'down'))).toEqual(['bng', 'router', 'phone']);
    expect(ctx(home, 'rack-switch-cdn', 'up').next).toBeNull();
  });

  it('ends a frame at a tunnel end, and has no MACs on a phone line', () => {
    expect(ctx(street, 'phone-cell-tower', 'up').frame.dst.id).toBe('cell-tower');
    expect(ctx(home, 'phone-ap', 'up').macs).toBe(true);
    const dialup = resolveRoute({ activity: 'watch-video', places: ['home-dialup'] });
    expect(ctx(dialup, 'pc-exchange', 'up').macs).toBe(false);
  });
});

describe('strings', () => {
  beforeAll(() => loadPack('da'));
  it('loads languages other than English on demand', async () => {
    expect(packs.en.strings['node.phone.name']).toBe('Phone');
    await loadPack('da');
    expect(Object.keys(packs.da.strings).length).toBeGreaterThan(100);
  });
  it('falls back level → level-less → English', () => {
    expect(lookupLevel('da', 'node.phone.name', 'kid')).toBe('Telefon');
    expect(lookupLevel('da', 'layer.tcp.name', 'nerd')).toBeTruthy();
    const untranslated = { ...packs, da: { ...packs.da, strings: {} } };
    expect(lookupLevel('da', 'node.cabinet.kid', 'kid', untranslated)).toBe(lookupLevel('en', 'node.cabinet.kid', 'kid'));
  });
  it('prefers the most specific source', () => {
    expect(firstOf('en', ['place.street.stop.phone', 'activity.watch-video.stop.phone'], 'kid')).toContain('even out here');
    expect(firstOf('en', ['place.home.stop.phone', 'activity.watch-video.stop.phone'], 'kid')).toContain('cat video');
  });
});
