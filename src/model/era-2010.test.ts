// The 2010 data centre (#59, step 8): a rented cage at a colocation centre, built as a three-tier tree (the dive's
// maths), the way through it, and that nothing it says belongs to a later data centre (#135 F15: leaf–spine, k8s,
// NVMe, 100–400G and four-colour optics reached from 2010).
import { beforeAll, describe, expect, it } from 'vitest';
import type { Level } from '../define';
import { WORLD_SIZE, type Pt } from '../engine/geometry';
import { stubBrowser } from '../test/stub-browser';
import { metroTag, oneColour } from '../../content/scenes/fibre-light/light';
import type * as Tier from '../../content/scenes/three-tier/tier';
import type { TierLayout } from '../../content/scenes/three-tier/types';
import { sceneKeys } from './describe';
import { activityIds } from './registry';
import { firstOf, loadAllPacks, packs, withEra } from './strings';
import { resolveRoute, stringSources, type Route } from './resolve';
import { childrenOf, diveSubject, sceneRef, type SceneRef } from './tree';

type Box = { x: number; y: number; w: number; h: number };
const inside = (a: Box, b: Box) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const apart = (a: Box, b: Box) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
const ptInside = (p: Pt, b: Box) => p.x >= b.x && p.y >= b.y && p.x <= b.x + b.w && p.y <= b.y + b.h;
const same = (a: Pt, b: Pt) => Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;
const ORIENTS = [['landscape', false], ['portrait', false], ['landscape', true]] as const;

function scenes(r: Route): SceneRef[] {
  const out = new Map<string, SceneRef>();
  for (const o of ['landscape', 'portrait'] as const) {
    const walk = (ref: SceneRef): void => {
      out.set(ref.path.join('/'), ref);
      for (const c of childrenOf(r, ref, o)) walk(sceneRef(r, [...ref.path, c.step], o)!);
    };
    walk(sceneRef(r, [], o)!);
  }
  return [...out.values()];
}

describe('the three-tier tree (three-tier)', () => {
  let tier: typeof Tier;
  beforeAll(async () => {
    stubBrowser();
    tier = await import('../../content/scenes/three-tier/tier');
  });
  const boxes = (L: TierLayout) => [
    ...tier.CORES.map((i) => tier.coreBox(L, i)), ...tier.AGGS.map((i) => tier.aggBox(L, i)), L.beforeBox,
    ...tier.RACKS.map((r) => L.rackBoxes[r]), L.sticker,
  ];

  it('lays the tree out inside the world without overlapping in landscape, portrait and compact', () => {
    for (const [o, compact] of ORIENTS) {
      const L = tier.tierLayout(o, compact), W = { x: 0, y: 0, ...WORLD_SIZE[o] }, all = boxes(L);
      for (const b of all) expect(inside(b, W)).toBe(true);
      for (const [i, b] of all.entries()) for (const q of all.slice(i + 1)) expect(apart(b, q)).toBe(true);
      for (const p of [L.inPort, L.outPort, L.tag]) expect(ptInside(p, W)).toBe(true);
      // core above aggregation above access
      expect(Math.max(...L.cores.map((p) => p.y))).toBeLessThan(Math.min(...L.aggs.map((p) => p.y)));
      expect(Math.max(...L.aggs.map((p) => p.y))).toBeLessThan(Math.min(...tier.RACKS.map((r) => L.racks[r].y)));
    }
  });

  it('gives every rack an uplink to both of the pair, and spanning tree blocks the ones to the standby', () => {
    const L = tier.tierLayout('landscape'), ups = tier.uplinks(L);
    expect(ups).toHaveLength(tier.RACKS.length * tier.AGGS.length);
    for (const rack of tier.RACKS) expect(ups.filter((u) => u.rack === rack).map((u) => u.agg).sort()).toEqual([...tier.AGGS]);
    expect(ups.filter((u) => u.blocked).every((u) => u.agg !== tier.ACTIVE)).toBe(true);
    expect(ups.filter((u) => !u.blocked).every((u) => u.agg === tier.ACTIVE)).toBe(true);
    expect(ups.filter((u) => u.yours).map((u) => [u.rack, u.agg])).toEqual([['after', tier.ACTIVE]]);
    // the signs sit on the rack's end of the blocked uplinks
    for (const u of ups.filter((x) => x.blocked)) {
      const b = tier.blockAt(u);
      expect(Math.hypot(b.x - u.a.x, b.y - u.a.y)).toBeLessThan(Math.hypot(b.x - u.b.x, b.y - u.b.y));
    }
    expect(tier.coreLinks(L)).toHaveLength(tier.CORES.length * tier.AGGS.length);
  });

  it('sends your parcel and every other rack’s traffic through this switch, never the standby', () => {
    for (const [o, compact] of ORIENTS) {
      const L = tier.tierLayout(o, compact), W = { x: 0, y: 0, ...WORLD_SIZE[o] };
      const standby = [tier.aggBox(L, 1)], mine = tier.aggBox(L, tier.ACTIVE);
      const trip = tier.tripPath(L);
      expect(trip).toContainEqual(L.aggs[tier.ACTIVE]);
      expect(trip.some((p) => standby.some((b) => ptInside(p, b)))).toBe(false);
      for (const f of tier.OTHER_FLOWS) {
        const path = tier.flowPath(L, f);
        expect(path.slice(1, -1).every((p) => ptInside(p, mine))).toBe(true);
        expect(path.some((p) => standby.some((b) => ptInside(p, b)))).toBe(false);
      }
      for (let i = 0; i < 60; i++) {
        const t = (i / 60) * tier.PERIOD;
        for (const c of [tier.parcelAt(t, false, L), ...tier.OTHER_FLOWS.map((f) => tier.otherFlowAt(t, false, L, f))]) if (c.alpha > 0.02) expect(ptInside(c.p, W)).toBe(true);
      }
    }
    // up to the core, down from it and across between racks
    const ends = tier.OTHER_FLOWS.map((f) => [typeof f.from, typeof f.to].join('>'));
    expect(new Set(ends)).toEqual(new Set(['string>number', 'number>string', 'string>string']));
  });

  it('has a stable still pose: your parcel on its way down to the rack', () => {
    const L = tier.tierLayout('landscape'), a = tier.parcelAt(0, true, L), b = tier.parcelAt(123, true, L);
    expect(same(a.p, b.p)).toBe(true);
    expect(a.alpha).toBe(1);
    const agg = L.aggs[tier.ACTIVE], rack = L.racks.after;
    expect(a.p.y).toBeGreaterThan(agg.y);
    expect(a.p.y).toBeLessThan(rack.y);
    for (const f of tier.OTHER_FLOWS) expect(same(tier.otherFlowAt(0, true, L, f).p, tier.otherFlowAt(99, true, L, f).p)).toBe(true);
  });
});

describe('the 2010 data centre', () => {
  beforeAll(loadAllPacks);
  const trips = () => ['home-dsl', 'desk-2010', 'street-2010'].flatMap((place) => activityIds().map((activity) => resolveRoute({ activity, places: [place] })));

  it('is a rented cage at a colocation centre: core router, load balancer, aggregation, access and the cache', () => {
    for (const r of trips()) {
      expect(r.era).toBe('2010');
      expect(r.groups.find((g) => g.id === 'datacentre')?.node.id).toBe('colocation');
      const hall = r.chain.filter((h) => h.group === 'datacentre');
      expect(hall.map((h) => `${h.id}:${h.node.id}`)).toEqual(['dc-router:dc-router', 'load-balancer:load-balancer', 'spine:aggregation', 'rack-switch:rack-switch', 'cdn:cdn']);
      // layer 2 ends at the aggregation switch
      expect(r.hops['rack-switch'].role).toBe('bridge');
      const inHall = r.links.filter((l) => r.hops[l.from].group === 'datacentre');
      expect(inHall.map((l) => `${l.tech.id}@${l.rate.down / 1e9}G`)).toEqual(['dc-fibre@10G', 'dc-fibre@10G', 'dc-fibre@10G', 'ethernet@1G']);
      // a cache: a miss still goes back to the origin
      expect(r.asides.filter((a) => a.hop.group === 'datacentre').map((a) => a.hop.id)).toEqual(['origin']);
      const dives = new Set(scenes(r).filter((s) => s.path[1] === 'datacentre').map((s) => s.dive));
      for (const d of ['three-tier', 'fibre-light', 'copper-pulses', 'server-inside']) expect(dives).toContain(d);
      expect(dives).not.toContain('leaf-spine');
    }
  });

  it('draws its fibre as one colour, 10GBASE-SR, and today’s with four', () => {
    expect([oneColour('dc-fibre', '2010'), oneColour('dc-fibre', 'today'), oneColour('dc-fibre'), oneColour('backbone', '2010')]).toEqual([true, false, false, false]);
    expect([metroTag('dc-fibre', true), metroTag('dc-fibre')]).toEqual(['tag.dc-fibre', 'tag.cwdm4']);
    for (const lang of Object.keys(packs)) expect(firstOf(lang, withEra(['scene.fibre-light.tag.dc-fibre'], '2010'))).toMatch(/10GBASE-SR/);
  });

  it('says nothing of a later data centre, unless it says when (#135 F15)', () => {
    const LATER = /\bleaf|\bspine|ECMP|[1-8]00\s?G|25\s?G\b|400GBASE|FR4|CWDM|k8s|Kubernetes|container|NVMe|Maglev|consistent hash|konsistent hash/i;
    const CLOS = /\bClos\b/;
    // the exchange's cross-connect into the hall is the internet's (#135's fibre-light cross-connect item, a later lane)
    const EXCHANGE = /^scene\.fibre-light\.cross-connect/;
    const SAYS_WHEN = /today|i dag|nutid|\b20(1[1-9]|2\d)\b|2010s|2010’erne/i;
    const bad = new Set<string>();
    for (const r of trips()) {
      const src = stringSources(r);
      const lists: string[][] = [];
      for (const ref of scenes(r).filter((s) => s.path[1] === 'datacentre')) {
        for (const keys of sceneKeys(r, ref)) for (const s of ['', '.describe', '.extra', '.title']) lists.push(keys.map((k) => k + s));
        if (ref.kind === 'dive') lists.push(...['kid', 'nerd', 'title'].map((k) => [`scene.${ref.dive}.${diveSubject(ref)}.${k}`]));
      }
      // the server's rooms: today's say NIC 2×100G, k8s pods and NVMe
      for (const room of ['nic', 'compute', 'memory', 'ssd']) for (const part of ['title', 'line']) lists.push([`scene.server-inside.${room}.${part}`]);
      for (const h of Object.values(r.hops).filter((x) => x.group === 'datacentre')) {
        lists.push([...src.map((s) => `${s}.stop.${h.id}`), `node.${h.node.id}`], [`node.${h.node.id}.name`]);
        lists.push([...src.map((s) => `${s}.tag.${h.id}`), `node.${h.node.id}.tag`]);
      }
      for (const l of r.links.filter((x) => r.hops[x.from].group === 'datacentre')) {
        lists.push([...src.map((s) => `${s}.stop.${l.id}`), `tech.${l.tech.id}`], [`tech.${l.tech.id}.name`]);
        lists.push([...src.map((s) => `${s}.tag.${l.id}`), `tech.${l.tech.id}.tag`]);
      }
      const group = r.groups.find((g) => g.id === 'datacentre')!.node.id;
      lists.push([`node.${group}`], [`node.${group}.tag`], [`node.${group}.inside`], [`node.${group}.inside.describe`]);
      for (const keys of lists) for (const lang of Object.keys(packs)) for (const level of ['kid', 'nerd'] as Level[]) {
        const s = EXCHANGE.test(keys[0]) ? undefined : firstOf(lang, withEra(keys, r.era), level);
        if (s && (LATER.test(s) || CLOS.test(s)) && !SAYS_WHEN.test(s)) bad.add(`${lang} ${level} ${keys[0]}: ${s}`);
      }
    }
    expect([...bad]).toEqual([]);
  });

  it('keeps a dive’s 2010 words for a device to the devices a 2010 route reaches', () => {
    const reached = new Set(trips().flatMap((r) => Object.values(r.hops).map((h) => h.node.id)));
    const at = Object.keys(packs.en.strings).flatMap((k) => k.match(/^scene\.[^.]+\.2010\.(?:[^.]+\.)?at\.([^.]+)\./)?.[1] ?? []);
    expect(at.length).toBeGreaterThan(0);
    expect([...new Set(at)].filter((n) => !reached.has(n))).toEqual([]);
  });
});
