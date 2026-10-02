import { describe, expect, it } from 'vitest';
import { layoutFor, paintRows } from '../../content/scenes/tls-lock/tls';
import en from '../../content/scenes/tls-lock/locales/en.json';
import da from '../../content/scenes/tls-lock/locales/da.json';

const views = [
  ['landscape', { h: 900, top: 0, bottom: 0 }],
  ['landscape', { h: 390, top: 0, bottom: 0 }],
  ['portrait', { h: 1600, top: 0, bottom: 0 }],
] as const;

describe('the TLS dive (tls-lock)', () => {
  it('lays the paint rows with three pots of one size, signs in clear gaps, inside the card (#90)', () => {
    for (const [o, vp] of views)
      for (const { label } of [en, da]) {
        const L = layoutFor(o, vp), card = L.cards[1];
        const P = paintRows(L, o, Math.max(label.phone.length, label.server.length));
        const sign = 0.3 * L.size.big;
        expect(P.label + Math.max(label.phone.length, label.server.length) * 0.6 * P.words).toBeLessThan(P.pots[0] - P.half);
        P.signs.forEach((s, i) => {
          expect(s - sign).toBeGreaterThan(P.pots[i] + P.half + 4);
          expect(s + sign).toBeLessThan(P.pots[i + 1] - P.half - 4);
        });
        expect(P.pots[2] + P.half).toBeLessThanOrEqual(card.x + card.w - 24);
        for (const y of P.rows) expect(y > card.y && y + 48 * P.scale < card.y + card.h).toBe(true);
      }
  });
});
