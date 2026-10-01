import { describe, expect, it } from 'vitest';
import { along, lengths } from './geometry';

describe('polylines', () => {
  const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 30 }];
  it('measures how far along each point is', () => expect(lengths(pts)).toEqual([0, 10, 40]));
  it('finds the point at a fraction of the length, clamped to the ends', () => {
    expect(along(pts, 0.5)).toEqual({ p: { x: 10, y: 10 }, seg: 1 });
    expect(along(pts, 0.125)).toEqual({ p: { x: 5, y: 0 }, seg: 0 });
    expect(along(pts, 2).p).toEqual({ x: 10, y: 30 });
    expect(along(pts, -1).p).toEqual({ x: 0, y: 0 });
  });
});
