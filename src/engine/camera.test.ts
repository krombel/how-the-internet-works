import { describe, expect, it } from 'vitest';
import { isShort, viewportFor } from './camera';

const stage = (w: number, h: number) => ({ clientWidth: w, clientHeight: h }) as HTMLElement;

describe('viewport insets', () => {
  it('a phone on its side is short; portrait phones and desktops are not', () => {
    expect(isShort(844, 390)).toBe(true);
    expect(isShort(390, 844)).toBe(false);
    expect(isShort(1440, 900)).toBe(false);
  });

  it('leaves the scene most of the height on a short landscape screen', () => {
    const vp = viewportFor(stage(844, 390));
    expect(vp.h - vp.top - vp.bottom).toBeGreaterThan(390 * 0.7);
    expect(viewportFor(stage(844, 390), { top: 58, bottom: 70 })).toMatchObject({ top: 58, bottom: 70 });
  });

  it('keeps the phone and desktop minimums', () => {
    expect(viewportFor(stage(390, 844))).toMatchObject({ top: 64, bottom: 136 });
    expect(viewportFor(stage(1440, 900))).toMatchObject({ top: 72, bottom: 132 });
  });
});
