import { beforeAll, describe, expect, it } from 'vitest';
import { resolveRoute } from './resolve';
import { layerCtx, stackOf } from './stack';
import { firstOf, loadPack, lookupLevel, packs } from './strings';

const home = resolveRoute({ activity: 'watch-video', places: ['home'] });
const street = resolveRoute({ activity: 'watch-video', places: ['street'] });
const flow = ['ip', 'tcp', 'tls', 'http'];
const link = (r: typeof home, id: string) => r.links.find((l) => l.id === id)!;
const frames = (r: typeof home, id: string, dir: 'up' | 'down' = 'up') => {
  const ctx = layerCtx(r, link(r, id), 'video', 'request', dir, 'kid');
  return stackOf(r, ctx.link, flow, ctx.role).map((e) => (e.open ? e.id : `(${e.id})`)).join(' ');
};

describe('layer stacks per hop', () => {
  it('uses the link technology and seals end-to-end layers in transit', () => {
    expect(frames(home, 'phone-ap')).toBe('wifi ip (tcp) (tls) (http)');
    expect(frames(home, 'ap-router')).toBe('ethernet ip (tcp) (tls) (http)');
    expect(frames(home, 'router-cabinet')).toBe('gpon ip (tcp) (tls) (http)');
    expect(frames(home, 'cabinet-backhaul')).toBe('ethernet vlan ip (tcp) (tls) (http)');
    expect(frames(home, 'bng-core')).toBe('ethernet mpls ip (tcp) (tls) (http)');
    expect(frames(home, 'ixp-cdn')).toBe('ethernet ip tcp tls http');
    expect(frames(home, 'phone-ap', 'down')).toBe('wifi ip tcp tls http');
  });

  it('tunnels 5G user traffic in GTP-U', () => {
    expect(frames(street, 'phone-cell-tower')).toBe('nr ip (tcp) (tls) (http)');
    expect(frames(street, 'cell-tower-mobile-core')).toBe('ethernet gtp ip (tcp) (tls) (http)');
  });
});

describe('addresses', () => {
  it('rewrites the source at the home NAT', () => {
    const inside = layerCtx(home, link(home, 'ap-router'), 'video', 'request', 'up', 'kid');
    expect([inside.src, inside.dst]).toEqual(['192.168.1.23', '198.51.100.20']);
    expect(inside.nat).toEqual({ inside: '192.168.1.23', outside: '203.0.113.7' });
    const outside = layerCtx(home, link(home, 'router-cabinet'), 'video', 'request', 'up', 'kid');
    expect(outside.src).toBe('203.0.113.7');
    const back = layerCtx(home, link(home, 'phone-ap'), 'video', 'video', 'down', 'kid');
    expect([back.src, back.dst]).toEqual(['198.51.100.20', '192.168.1.23']);
  });

  it('does carrier-grade NAT in the mobile core', () => {
    const tunnel = layerCtx(street, link(street, 'cell-tower-mobile-core'), 'video', 'request', 'up', 'nerd');
    expect(tunnel.src).toBe('100.64.12.7');
    expect(tunnel.nat).toEqual({ inside: '100.64.12.7', outside: '192.0.2.44' });
    expect(layerCtx(street, link(street, 'mobile-core-core'), 'video', 'request', 'up', 'nerd').src).toBe('192.0.2.44');
  });

  it('counts down the TTL at each router', () => {
    expect(layerCtx(home, link(home, 'phone-ap'), 'video', 'request', 'up', 'kid').ttl).toBe(64);
    expect(layerCtx(home, link(home, 'router-cabinet'), 'video', 'request', 'up', 'kid').ttl).toBe(63);
    expect(layerCtx(home, link(home, 'ixp-cdn'), 'video', 'request', 'up', 'kid').ttl).toBeLessThan(63);
  });
});

describe('strings', () => {
  beforeAll(() => Promise.all([loadPack('da'), loadPack('ar')]));
  it('loads languages other than English on demand', async () => {
    expect(packs.en.strings['node.phone.name']).toBe('Phone');
    await loadPack('da');
    expect(Object.keys(packs.da.strings).length).toBeGreaterThan(100);
  });
  it('falls back level → level-less → English', () => {
    expect(lookupLevel('da', 'node.phone.name', 'kid')).toBe('Telefon');
    expect(lookupLevel('ar', 'node.cabinet.kid', 'kid')).toBe(lookupLevel('en', 'node.cabinet.kid', 'kid'));
    expect(lookupLevel('da', 'layer.tcp.name', 'nerd')).toBeTruthy();
  });
  it('prefers the most specific source', () => {
    expect(firstOf('en', ['place.street.stop.phone', 'activity.watch-video.stop.phone'], 'kid')).toContain('even out here');
    expect(firstOf('en', ['place.home.stop.phone', 'activity.watch-video.stop.phone'], 'kid')).toContain('cat video');
  });
});
