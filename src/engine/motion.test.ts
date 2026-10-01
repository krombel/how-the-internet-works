import { describe, expect, it } from 'vitest';
import { clockRate, moveFor } from './motion';

describe('moveFor (how onNav moves the camera)', () => {
  const kinds = [
    { switched: false, travel: false, natural: 'fly' },
    { switched: false, travel: true, natural: 'travel' },
    { switched: true, travel: false, natural: 'morph' },
  ] as const;

  it('flies, travels sideways or morphs to another place', () => {
    for (const { switched, travel, natural } of kinds) expect(moveFor({ switched, travel, still: false })).toBe(natural);
  });

  it('fades every one of them with prefers-reduced-motion', () => {
    for (const { switched, travel } of kinds) expect(moveFor({ switched, travel, still: true })).toBe('fade');
  });
});

describe('clockRate (pause)', () => {
  const run = (rate: number, frozen: boolean, seconds: number) => {
    for (let t = 0; t < seconds; t += 1 / 60) rate = clockRate(rate, frozen, 1 / 60);
    return rate;
  };

  it('slows to a stop, exactly 0, within a second and a half', () => {
    expect(run(1, true, 0.1)).toBeGreaterThan(0);
    expect(run(1, true, 1.5)).toBe(0);
    expect(clockRate(0, true, 1 / 60)).toBe(0);
  });

  it('runs again when let go, up to full speed', () => {
    expect(clockRate(0, false, 1 / 60)).toBeGreaterThan(0);
    expect(run(0, false, 2)).toBeCloseTo(1, 3);
  });

  it('jumps no further than the target on a long frame', () => {
    expect(clockRate(1, true, 1)).toBe(0);
    expect(clockRate(0, false, 1)).toBe(1);
  });
});
