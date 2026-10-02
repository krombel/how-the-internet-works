import { beforeAll, describe, expect, it } from 'vitest';
import type { Orient } from '../engine/geometry';
import { trafficOn, type LivePacket } from '../engine/packets';
import { pathScene } from '../model/layout';
import { activityIds, placeIds } from '../model/registry';
import { resolveRoute, type Route } from '../model/resolve';
import { childrenOf, sceneRef } from '../model/tree';
import { stubBrowser } from '../test/stub-browser';
import { pictures } from '../ui/picker';
import { artLoading, deviceArt, eraArt, groupBackdrop, loadDevices, loadEra, loadRouteArt, placeBackdrop, routeArt } from './lazy.svelte';

beforeAll(stubBrowser); // the art imports the engine's state, which reads the browser's storage

describe('the era flavour (#59)', () => {
  it('loads an era’s art on demand, once, and has none for an era without art', async () => {
    expect(eraArt('1995')).toBeNull(); // asking starts the load
    expect(artLoading()).toBe(true);
    const first = loadEra('1995');
    expect(loadEra('1995')).toBe(first);
    await Promise.all([first, loadEra('2010'), loadEra('today')]);
    expect(artLoading()).toBe(false);
    expect(eraArt('1995')).toEqual({ Props: expect.any(Function), Packet: expect.any(Function) });
    expect(eraArt('2010')).toEqual({ Props: expect.any(Function), Packet: expect.any(Function) });
    expect(eraArt('today')).toEqual({ Props: expect.any(Function) }); // the parcel as it is
    await loadEra('no-such-era');
    expect(eraArt('no-such-era')).toBeNull();
    expect(artLoading()).toBe(false);
  });

  it('tells which ways packets are going on a link', () => {
    const on = (link: string, dir: 'up' | 'down') => ({ dir, pose: { link: { id: link } } }) as unknown as LivePacket;
    expect(trafficOn([], 'a')).toEqual({ up: false, down: false });
    expect(trafficOn([on('a', 'up'), on('b', 'down')], 'a')).toEqual({ up: true, down: false });
    expect(trafficOn([on('a', 'up'), on('a', 'down')], 'a')).toEqual({ up: true, down: true });
    expect(trafficOn([on('a', 'up')], undefined)).toEqual({ up: false, down: false });
  });
});

describe('device art and backdrops (#91)', () => {
  const folders = (files: Record<string, unknown>) => new Set(Object.keys(files).map((p) => p.split('/')[3]));
  const deviceFiles = folders(import.meta.glob('/content/nodes/*/art/Device.svelte'));
  const placeFiles = folders(import.meta.glob('/content/places/*/art/Backdrop.svelte'));
  const groupFiles = folders(import.meta.glob('/content/nodes/*/art/Backdrop.svelte'));
  const routes = activityIds().flatMap((activity) => placeIds().map((place) => resolveRoute({ activity, places: [place] })));
  /** Every path scene of a route (the root and each group's, unfolded), as drawn. */
  const scenes = (r: Route, o: Orient) => {
    const out = [];
    for (const todo = [[] as string[]]; todo.length;) {
      const path = todo.pop()!, ref = sceneRef(r, path, o)!;
      if (ref.kind !== 'path') continue;
      out.push(pathScene(r, ref.group, o));
      for (const c of childrenOf(r, ref, o)) if (c.kind === 'expand') todo.push([...path, c.step]);
    }
    return out;
  };

  it('lists all the art a route draws, in every scene, for every place and activity', () => {
    for (const r of routes) for (const o of ['landscape', 'portrait'] as const) {
      const a = routeArt(r), name = `${r.slots.map((s) => s.place).join('+')}/${r.activity.id} (${o})`;
      for (const ps of scenes(r, o)) {
        for (const n of ps.nodes) if (deviceFiles.has(n.node.id)) expect(a.devices, name).toContain(n.node.id);
        const group = ps.group && r.hops[ps.group].node.id;
        if (group && groupFiles.has(group)) expect(a.groups, name).toContain(group);
      }
      expect(a.places, name).toEqual(r.slots.map((s) => s.place).filter((p) => placeFiles.has(p)));
      expect(new Set(a.devices).size, name).toBe(a.devices.length);
    }
  });

  it('loads a device’s art on demand, with its face, and a route’s all at once', async () => {
    const [id] = routeArt(routes[0]).devices;
    expect(deviceArt(id)).toEqual({ Art: null, face: null, pending: true }); // asking starts the load
    expect(artLoading()).toBe(true);
    await loadDevices([id]);
    expect(deviceArt(id)).toEqual({ Art: expect.any(Function), face: expect.any(Array), pending: false });
    // a node without art isn't waiting for any: the theme draws its fallback body
    expect(deviceArt('no-such-node')).toEqual({ Art: null, face: null, pending: false });
    for (const r of routes) await loadRouteArt(r);
    expect(artLoading()).toBe(false);
    for (const d of deviceFiles) expect(deviceArt(d).Art, d).toEqual(expect.any(Function));
    for (const p of placeFiles) expect(placeBackdrop(p), p).toEqual(expect.any(Function));
    for (const g of groupFiles) expect(groupBackdrop(g), g).toEqual(expect.any(Function));
    expect(placeBackdrop('no-such-place')).toBeNull();
  });

  it('has art for every picture the place picker shows', () => {
    expect(pictures().filter((id) => !deviceFiles.has(id))).toEqual([]);
  });
});
