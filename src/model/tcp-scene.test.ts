import { describe, expect, it } from 'vitest';
import { LOOP, ackTicket, cardLabels, dupAcks, helloSpot, layoutFor, shelfFilled, travellingBox, windowStart, type Layout, type Spot } from '../../content/scenes/tcp-pieces/tcp';
import en from '../../content/scenes/tcp-pieces/locales/en.json';
import da from '../../content/scenes/tcp-pieces/locales/da.json';

type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const art = (s: Spot): Box => ({ x: s.x - s.size / 2, y: s.y - s.size / 2, w: s.size, h: s.size });

describe('the TCP dive (tcp-pieces)', () => {
  // #138: "3 hello tickets" sat under the server's window, and "5 is missing" on the server, where 5 isn't missing
  it('labels each card with what happens to its own boxes', () => {
    const at = (t: number) => cardLabels(t);
    expect(at(1.5)).toEqual({ server: null, shelf: null });
    expect(at(5)).toEqual({ server: 'window', shelf: null });
    expect(at(11)).toEqual({ server: 'window', shelf: 'lost' });
    expect(at(13.5)).toEqual({ server: 'resend', shelf: 'gap' });
    expect(at(15)).toEqual({ server: 'resend', shelf: null });
    expect(at(16)).toEqual({ server: 'done', shelf: 'ready' });
  });

  // #134: ACKs name the next byte expected, and fast retransmit needs three duplicates, so 6, 7 and 8 must all arrive
  it('tells a fast retransmit that adds up: ACK=5, three duplicate ACK=5s, then 5 again and ACK=9', () => {
    const steps = Array.from({ length: LOOP * 20 }, (_, i) => i / 20);
    const first = (p: (t: number) => boolean) => steps.find(p)!;
    // every box crosses the road before the shelf shows it, and 7 crosses too
    for (let n = 1; n <= 8; n++) {
      const arrives = first((t) => shelfFilled(t, n));
      const crossing = steps.filter((t) => t < arrives && travellingBox(t).n === n && !travellingBox(t).lost);
      expect(crossing.length, `box ${n}`).toBeGreaterThan(0);
    }
    // ACK=5 ("got 4") comes back for 1–4 and slides the window to 5–8
    const got4 = first((t) => ackTicket(t).text === 'got4' && ackTicket(t).x !== null);
    expect([1, 2, 3, 4].every((n) => shelfFilled(got4, n))).toBe(true);
    expect(windowStart(got4)).toBe(1);
    expect(windowStart(first((t) => t > got4 && travellingBox(t).n === 5))).toBe(5);
    // three duplicates before 5 is sent again, none after
    const resend = first((t) => travellingBox(t).n === 5 && !!travellingBox(t).glow);
    expect(dupAcks(resend)).toBe(3);
    expect(Math.max(...steps.filter((t) => t < resend).map(dupAcks))).toBe(3);
    expect(shelfFilled(resend, 5)).toBe(false);
    // then everything is in, and "got 8" (ACK=9) goes back
    const got8 = first((t) => ackTicket(t).text === 'got8' && ackTicket(t).x !== null);
    expect(got8).toBeGreaterThan(resend);
    expect([1, 2, 3, 4, 5, 6, 7, 8].every((n) => shelfFilled(got8, n))).toBe(true);
  });

  it('puts the hello label on the road, clear of the cards, the devices and the names under the road', () => {
    const views = [
      ['landscape', { h: 900, top: 0, bottom: 0 }, false],
      ['landscape', { h: 390, top: 0, bottom: 0 }, true],
      ['portrait', { h: 1600, top: 0, bottom: 0 }, false],
    ] as const;
    for (const [o, vp, compact] of views) {
      const L: Layout = layoutFor(o, vp), portrait = o === 'portrait';
      // closed (seen from a hop), and open on either end
      const states: [Spot, Spot, Spot | null][] = [[L.ends[0], L.ends[1], L.hop], [L.home[0], L.ends[1], null], [L.ends[0], L.home[1], null]];
      for (const [client, server, hop] of states) {
        const p = helloSpot(L, portrait, client, hop ?? server);
        for (const [lang, s] of [['en', en], ['da', da]] as const) {
          const text = compact ? s.label.hello : s.label.handshake, size = L.text.label, w = text.length * size * 0.6;
          const box = { x: p.x - w / 2, y: p.y - size * 0.8, w, h: size };
          const what = `${o} ${vp.h} ${lang} ${hop ? 'closed' : 'open'}`;
          expect(box.x, what).toBeGreaterThanOrEqual(L.road.x0);
          expect(box.x + w, what).toBeLessThanOrEqual(L.road.x1);
          for (const b of [...L.cards, art(client), art(server), ...(hop ? [art(hop)] : [])]) expect(overlaps(box, b), what).toBe(false);
          if (!portrait) expect(box.y + box.h, what).toBeLessThan(L.names - size);
        }
      }
    }
  });
});
