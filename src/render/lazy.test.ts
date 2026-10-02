import { beforeAll, describe, expect, it } from 'vitest';
import { trafficOn, type LivePacket } from '../engine/packets';
import { stubBrowser } from '../test/stub-browser';
import { artLoading, eraArt, loadEra } from './lazy.svelte';

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
