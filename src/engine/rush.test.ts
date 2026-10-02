import { describe, expect, it } from 'vitest';
import type { FlowDef } from '../define';
import type { PathScene } from '../model/layout';
import { livePackets, specsFor } from './packets';
import { isRush, untilNextHour } from './rush';

const at = (h: number, m = 0) => new Date(2026, 9, 2, h, m, 30);

describe('rush hour (#44)', () => {
  it('follows the local clock from 19:00 up to 23:00 when auto', () => {
    expect([17, 18, 19, 20, 22, 23, 0, 12].map((h) => isRush('auto', at(h)))).toEqual([false, false, true, true, true, false, false, false]);
    expect(isRush('auto', at(18, 59))).toBe(false);
    expect(isRush('auto', at(22, 59))).toBe(true);
  });
  it('is pinned on or off by the reader', () => {
    for (const h of [3, 12, 20]) {
      expect(isRush('on', at(h))).toBe(true);
      expect(isRush('off', at(h))).toBe(false);
    }
  });
  it('looks again on the next hour', () => {
    expect(untilNextHour(new Date(2026, 9, 2, 18, 59, 59, 500))).toBe(500);
    expect(untilNextHour(new Date(2026, 9, 2, 19, 0, 0, 0))).toBe(3600_000);
  });
});

describe('busier packets in rush hour', () => {
  const flows: FlowDef[] = [{
    id: 'f', stack: ['x'],
    packets: [{ kind: 'ask', dir: 'up', pace: 1, colour: '#000' }, { kind: 'answer', dir: 'down', pace: 1, every: 1.5, rush: 2, colour: '#111' }],
  }];
  const scene = (group: string | null) => ({ group, route: ['a', 'b', 'c', 'd'] }) as unknown as PathScene;
  const links = ['a', 'b', 'c', 'd'].map((id) => ({ id, p0: { x: 0, y: 0 }, c: { x: 1, y: 0 }, p1: { x: 2, y: 0 }, link: { index: 0 } })) as never;

  it('sends the kinds with `rush` that many times as often, and nothing else changes', () => {
    for (const g of [null, 'grp']) {
      const calm = specsFor(scene(g), flows), busy = specsFor(scene(g), flows, true);
      expect(busy.map((s) => s.kind)).toEqual(calm.map((s) => s.kind));
      expect(busy[0]).toEqual(calm[0]);
      expect(busy[1].every).toBeCloseTo(calm[1].every / 2);
      expect({ ...busy[1], every: 0 }).toEqual({ ...calm[1], every: 0 });
    }
  });
  it('keeps a scene\'s calm and busy specs apart', () => {
    const ps = scene(null);
    expect(specsFor(ps, flows, true)).not.toBe(specsFor(ps, flows));
    expect(specsFor(ps, flows, true)).toBe(specsFor(ps, flows, true));
  });
  it('puts about twice as many answers on the way at once', () => {
    const ps = scene(null), count = (busy: boolean) => {
      let n = 0;
      for (let t = 20; t < 80; t += 0.25) n += livePackets(specsFor(ps, flows, busy), links, t, '').filter((p) => p.kind === 'answer').length;
      return n;
    };
    expect(count(true) / count(false)).toBeCloseTo(2, 1);
  });
});
