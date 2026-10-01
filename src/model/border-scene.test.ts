import { beforeAll, describe, expect, it } from 'vitest';
import { WORLD_SIZE, type Pt } from '../engine/geometry';
import { stubBrowser } from '../test/stub-browser';
import type * as Border from '../../content/scenes/border-inside/border';
import type { Box } from '../../content/scenes/border-inside/types';

let border: typeof Border;
beforeAll(async () => {
  stubBrowser();
  border = await import('../../content/scenes/border-inside/border');
});

const inside = (a: Box, b: Box) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const apart = (a: Box, b: Box) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
const ptInside = (p: Pt, b: Box) => p.x >= b.x && p.y >= b.y && p.x <= b.x + b.w && p.y <= b.y + b.h;
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

describe('inside the border router scene maths', () => {
  it('lays out the router, route table and neighbours inside the world without collisions', () => {
    for (const [o, compact] of [['landscape', false], ['portrait', false], ['landscape', true]] as const) {
      const L = border.borderLayout(o, compact), W = { x: 0, y: 0, ...WORLD_SIZE[o] };
      expect(inside(L.case, W)).toBe(true);
      expect(inside(L.table, L.case)).toBe(true);
      expect(inside(L.lineCard, L.case)).toBe(true);
      for (const r of Object.values(L.rows)) expect(inside(r, L.table)).toBe(true);
      const rows = Object.values(L.rows);
      for (const [i, r] of rows.entries()) for (const q of rows.slice(i + 1)) expect(apart(r, q)).toBe(true);

      const nodes = [
        border.nodeBox(L.inNode, L.nodeSize),
        border.nodeBox(L.exchangeNode, L.nodeSize),
        border.nodeBox(L.transitNode, L.transitSize),
      ];
      for (const n of nodes) {
        expect(inside(n, W)).toBe(true);
        expect(apart(n, L.case)).toBe(true);
      }
      for (const [i, n] of nodes.entries()) for (const q of nodes.slice(i + 1)) expect(apart(n, q)).toBe(true);
    }
  });

  it('runs the tracks around the route book, never across its rows, and forks beside it', () => {
    for (const [o, compact] of [['landscape', false], ['portrait', false], ['landscape', true]] as const) {
      const L = border.borderLayout(o, compact);
      for (const track of [border.inTrack(L), border.exitTrack(L, 'exchange'), border.exitTrack(L, 'transit')]) {
        for (const [i, a] of track.slice(0, -1).entries()) for (let k = 0; k <= 20; k++) {
          const b = track[i + 1], p = { x: a.x + (b.x - a.x) * k / 20, y: a.y + (b.y - a.y) * k / 20 };
          expect(ptInside(p, L.table), `${o} ${compact}`).toBe(false);
        }
      }
      expect(border.exitTrack(L, 'exchange')[0]).toEqual(L.tablePoint);
      expect(border.exitTrack(L, 'transit')[0]).toEqual(L.tablePoint);
      for (const source of ['exchange', 'transit'] as const) expect(ptInside(border.notePath(L, source).at(-1)!, L.rows[source])).toBe(true);
    }
  });

  it('moves the parcel through pop, table, choice and exchange exit once per period', () => {
    const L = border.borderLayout('landscape');
    const at = (t: number) => border.parcelAt(t, false, L);
    const stages = Array.from({ length: 100 }, (_, i) => at((i / 100) * border.PERIOD));
    expect([...new Set(stages.map((s) => s.stage))]).toEqual(['in', 'pop', 'table', 'choose', 'out']);
    expect(stages.find((s) => s.stage === 'table')?.popped).toBe(true);
    expect(stages.find((s) => s.stage === 'table')?.stickerAlpha).toBe(0);
    expect(stages.find((s) => s.stage === 'choose')?.chosenAlpha).toBeGreaterThan(0);
    expect(at(border.PERIOD * 0.75)).toMatchObject({ stage: 'out', exit: 'exchange', popped: true });
    expect(at(border.PERIOD * 1.3).p.x).toBeCloseTo(at(border.PERIOD * 0.3).p.x);
    expect(at(border.PERIOD * 1.3).p.y).toBeCloseTo(at(border.PERIOD * 0.3).p.y);
  });

  it('chooses the exchange row over transit', () => {
    const L = border.borderLayout('portrait');
    expect(border.CHOSEN_EXIT).toBe('exchange');
    const p = border.parcelAt(border.PERIOD * 0.91, false, L);
    expect(p.exit).toBe('exchange');
    expect(dist(p.p, L.exchangeNode)).toBeLessThan(dist(p.p, L.transitNode));
  });

  it('keeps all moving carriers inside the authored world in all layouts', () => {
    for (const [o, compact] of [['landscape', false], ['portrait', false], ['landscape', true]] as const) {
      const L = border.borderLayout(o, compact), W = { x: 0, y: 0, ...WORLD_SIZE[o] };
      for (let i = 0; i < 140; i++) {
        const t = (i / 140) * border.PERIOD;
        const parcel = border.parcelAt(t, false, L);
        expect(ptInside(parcel.p, W)).toBe(true);
        const sticker = border.stickerAt(parcel);
        if (sticker.alpha > 0.02) expect(ptInside(sticker.p, W)).toBe(true);
        for (const note of border.routeNotesAt(t, false, L, true)) {
          if (note.alpha > 0.02) expect(ptInside(note.p, W)).toBe(true);
        }
      }
    }
  });

  it('has a stable still pose at the lit route table', () => {
    const L = border.borderLayout('landscape');
    const a = border.parcelAt(0, true, L), b = border.parcelAt(123, true, L);
    expect(a).toMatchObject({ stage: 'choose', alpha: 1, popped: true, chosenAlpha: 1, exit: 'exchange' });
    expect(a.p.x).toBeCloseTo(L.tablePoint.x);
    expect(a.p.y).toBeCloseTo(L.tablePoint.y);
    expect(a.p.x).toBeCloseTo(b.p.x);
    expect(a.p.y).toBeCloseTo(b.p.y);
    expect(border.routeNotesAt(0, true, L, true).filter((n) => n.alpha > 0.02)).toHaveLength(2);
  });
});
