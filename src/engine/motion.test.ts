import { describe, expect, it } from 'vitest';
import { moveFor } from './motion';

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

