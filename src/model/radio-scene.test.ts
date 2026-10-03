import { describe, expect, it } from 'vitest';
import { COLS, columns } from '../../content/scenes/nr-radio/radio';

describe('5G seat grid (#101)', () => {
  it('lists the columns of the slots up to the one sliding in, the one before it being sent now', () => {
    const cols = columns(40);
    expect(cols).toHaveLength(COLS + 1);
    expect(cols.map((c) => c.slot)).toEqual(Array.from({ length: COLS + 1 }, (_, c) => 40 - COLS + c));
    expect(cols.map((c) => c.col)).toEqual(Array.from({ length: COLS + 1 }, (_, c) => c));
    expect(cols.filter((c) => c.now).map((c) => c.slot)).toEqual([39]);
  });
});
