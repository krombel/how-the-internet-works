import { beforeAll, describe, expect, it } from 'vitest';
import { WORLD_SIZE, type Pt } from '../engine/geometry';
import { stubBrowser } from '../test/stub-browser';
import type * as Exchange from '../../content/scenes/ixp-inside/exchange';
import type { Box } from '../../content/scenes/ixp-inside/types';

let exchange: typeof Exchange;
beforeAll(async () => {
  stubBrowser();
  exchange = await import('../../content/scenes/ixp-inside/exchange');
});

const inside = (a: Box, b: Box) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const apart = (a: Box, b: Box) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
const ptInside = (p: Pt, b: Box) => p.x >= b.x && p.y >= b.y && p.x <= b.x + b.w && p.y <= b.y + b.h;

function layoutBoxes(L: ReturnType<typeof exchange.exchangeLayout>) {
  return [L.fabric, L.routeServer, ...Object.values(L.memberBoxes)];
}

describe('internet exchange scene maths', () => {
  it('lays the fabric, route server and member routers inside the world without overlap', () => {
    for (const o of ['landscape', 'portrait'] as const) {
      const L = exchange.exchangeLayout(o), W = { x: 0, y: 0, ...WORLD_SIZE[o] };
      for (const b of layoutBoxes(L)) expect(inside(b, W)).toBe(true);
      for (const [i, b] of layoutBoxes(L).entries()) for (const q of layoutBoxes(L).slice(i + 1)) expect(apart(b, q)).toBe(true);
      for (const p of [L.inPort, L.outPort, ...Object.values(L.members), ...Object.values(L.ports)]) expect(ptInside(p, W)).toBe(true);
    }
  });

  it('puts every member on a port on the shared fabric', () => {
    for (const o of ['landscape', 'portrait'] as const) {
      const L = exchange.exchangeLayout(o);
      for (const m of exchange.MEMBERS) {
        const p = L.ports[m];
        const onHorizontal = p.x >= L.fabric.x && p.x <= L.fabric.x + L.fabric.w && (p.y === L.fabric.y || p.y === L.fabric.y + L.fabric.h);
        const onVertical = p.y >= L.fabric.y && p.y <= L.fabric.y + L.fabric.h && (p.x === L.fabric.x || p.x === L.fabric.x + L.fabric.w);
        expect(onHorizontal || onVertical, m).toBe(true);
      }
    }
  });

  it('carries your parcel in, straight across the fabric, and out once per period', () => {
    const L = exchange.exchangeLayout('landscape'), routeServer = exchange.serverPoint(L);
    const path = exchange.parcelPath(L);
    expect(path).toContainEqual(L.ports.before);
    expect(path).toContainEqual(L.ports.after);
    expect(path).not.toContainEqual(routeServer);
    const at = (t: number) => exchange.parcelAt(t, false, L);
    expect(at(exchange.PERIOD * 0.49)).toMatchObject({ alpha: 0 });
    expect(at(exchange.PERIOD * 0.51)).toMatchObject({ stage: 'in' });
    expect(at(exchange.PERIOD * 0.72)).toMatchObject({ stage: 'fabric' });
    expect(at(exchange.PERIOD * 0.94)).toMatchObject({ stage: 'out' });
    expect(at(exchange.PERIOD * 1.72).p.x).toBeCloseTo(at(exchange.PERIOD * 0.72).p.x);
    expect(at(exchange.PERIOD * 1.72).p.y).toBeCloseTo(at(exchange.PERIOD * 0.72).p.y);
  });

  it('plugs the route server into the fabric too, but keeps the parcel off its cable', () => {
    for (const o of ['landscape', 'portrait'] as const) {
      const L = exchange.exchangeLayout(o), [top, port] = L.serverCable;
      expect(port.x === L.fabric.x || port.y === L.fabric.y, o).toBe(true);
      const path = exchange.parcelPath(L);
      expect(path).not.toContainEqual(port);
      expect(path).not.toContainEqual(top);
      for (const m of exchange.MEMBERS) expect(exchange.notePath(L, m, 'up')).toEqual([L.members[m], L.ports[m], port, top, exchange.serverPoint(L)]);
    }
  });

  it('sends route notes to the route server and back to every member', () => {
    const L = exchange.exchangeLayout('portrait'), seen = new Set<string>();
    for (let i = 0; i < 80; i++) {
      for (const n of exchange.notesAt((i / 80) * exchange.PERIOD, false, L)) {
        if (n.alpha > 0.05) seen.add(`${n.member}:${n.stage}`);
      }
    }
    for (const m of exchange.MEMBERS) {
      expect(seen.has(`${m}:to-server`)).toBe(true);
      expect(seen.has(`${m}:from-server`)).toBe(true);
      expect(exchange.notePath(L, m, 'up').at(-1)).toEqual(exchange.serverPoint(L));
      expect(exchange.notePath(L, m, 'down')[0]).toEqual(exchange.serverPoint(L));
    }
  });

  it('keeps moving parcels and notes inside the authored world', () => {
    for (const o of ['landscape', 'portrait'] as const) {
      const L = exchange.exchangeLayout(o), W = { x: 0, y: 0, ...WORLD_SIZE[o] };
      for (let i = 0; i < 120; i++) {
        const t = (i / 120) * exchange.PERIOD;
        for (const m of [exchange.parcelAt(t, false, L), ...exchange.notesAt(t, false, L), ...exchange.OTHER_FLOWS.map((f) => exchange.otherFlowAt(t, false, L, f))]) {
          if (m.alpha > 0.02) expect(ptInside(m.p, W)).toBe(true);
        }
      }
    }
  });

  it('has a stable still pose with the parcel on the fabric', () => {
    for (const o of ['landscape', 'portrait'] as const) {
      const L = exchange.exchangeLayout(o), W = { x: 0, y: 0, ...WORLD_SIZE[o] };
      const a = exchange.parcelAt(0, true, L), b = exchange.parcelAt(123, true, L);
      expect(a).toMatchObject({ stage: 'fabric', alpha: 1 });
      expect(a.p.x).toBeCloseTo(b.p.x);
      expect(a.p.y).toBeCloseTo(b.p.y);
      expect(ptInside(a.p, W)).toBe(true);
      for (const spec of exchange.OTHER_FLOWS) {
        const f0 = exchange.otherFlowAt(0, true, L, spec), f1 = exchange.otherFlowAt(123, true, L, spec);
        expect(f0.p.x).toBeCloseTo(f1.p.x);
        expect(f0.p.y).toBeCloseTo(f1.p.y);
        expect(ptInside(f0.p, W)).toBe(true);
      }
    }
  });
});
