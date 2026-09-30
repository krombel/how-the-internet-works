import { describe, expect, it } from 'vitest';
import { belowOf, signalUnder, type Below } from './ladder';
import { content } from './registry';
import { resolveRoute, type Route } from './resolve';
import { childrenOf, parentPath, sceneRef, sideways } from './tree';

const home = resolveRoute({ activity: 'watch-video', places: ['home'] });
const street = resolveRoute({ activity: 'watch-video', places: ['street'] });
/** A stack as "step" lines, top first: `*` the one you're on, `!` sealed, `~` the signal. */
const stack = (b: Below | null) => {
  if (b?.kind !== 'stack') return null;
  return b.rungs.map((r, i) => `${i === b.here ? '*' : ''}${r.layer ? '' : '~'}${r.path.join('/')}${r.sealed ? '!' : ''}`);
};

describe('depth ladder (#22)', () => {
  it('counts the doors further down a path scene, in route order', () => {
    const doors = (r: Route, path: string[]) => {
      const b = belowOf(r, path, 'landscape');
      return b?.kind === 'doors' ? b.doors.map((d) => `${d.kind}:${d.path.join('/')}`) : b;
    };
    expect(doors(home, [])).toEqual(['dive:phone-ap', 'dive:ap-router', 'dive:router-internet', 'expand:internet']);
    // a stretch of links is one door
    expect(doors(home, ['internet'])).toEqual(['dive:internet/home-cabinet', 'dive:internet/cabinet-backhaul', 'dive:internet/bng-core']);
    expect(doors(street, [])).toEqual(['dive:phone-cell-tower', 'dive:cell-tower-internet', 'expand:internet']);
    expect(belowOf(home, ['no-such-step'], 'landscape')).toBeNull();
  });
});

describe('layer ladder (#14, #32)', () => {
  it('stacks the layers of a layer dive\'s hop, top first, over the signal under the one you\'re on', () => {
    // the signal under IP is the link it leaves on (fibre); under a link envelope, its own link's
    expect(stack(belowOf(home, ['router~ip'], 'landscape'))).toEqual(['router~tls!', 'router~tcp!', '*router~ip', 'router~gpon', 'router~ethernet', '~router-internet']);
    expect(stack(belowOf(home, ['router~ethernet'], 'landscape'))).toEqual(['router~tls!', 'router~tcp!', 'router~ip', 'router~gpon', '*router~ethernet', '~ap-router']);
    expect(stack(belowOf(home, ['phone~tls'], 'portrait'))).toEqual(['*phone~tls', 'phone~tcp', 'phone~ip', 'phone~wifi', '~phone-ap']);
    expect(stack(belowOf(home, ['internet', 'core~mpls'], 'landscape'))?.slice(-3)).toEqual(['*internet/core~mpls', 'internet/core~ethernet', '~internet/bng-core']);
  });

  it('stacks what a signal carries over it: its link\'s envelopes, then what they carry', () => {
    expect(stack(belowOf(home, ['phone-ap'], 'landscape'))).toEqual(['ap~tls!', 'ap~tcp!', 'ap~ip', 'ap~wifi', '*~phone-ap']);
    // only this link's envelopes: not the cell tower's radio one
    expect(stack(belowOf(street, ['cell-tower-internet'], 'landscape'))).toEqual(
      ['cell-tower~tls!', 'cell-tower~tcp!', 'cell-tower~ip', 'cell-tower~gtp', 'cell-tower~ethernet', '*~cell-tower-internet']);
    expect(stack(belowOf(home, ['internet', 'home-cabinet'], 'landscape'))?.slice(-2)).toEqual(['internet/cabinet~gpon', '*~internet/home-cabinet']);
  });

  // generic: whatever content exists, every scene of every place × activity, both orientations
  it('holds everywhere: rungs resolve, a layer stack is what ▲/▼ step, and every stack ends in a signal', () => {
    let stacks = 0;
    for (const activity of Object.keys(content.activities)) for (const place of Object.keys(content.places)) {
      const r = resolveRoute({ activity, places: [place] });
      for (const o of ['landscape', 'portrait'] as const) {
        const walk = (path: string[]): void => {
          const ref = sceneRef(r, path, o)!, b = belowOf(r, path, o), at = `${place} × ${activity} ${o} /${path.join('/')}`;
          if (ref.kind === 'path') {
            const kids = childrenOf(r, ref, o);
            expect(b?.kind === 'doors' ? b.doors.map((d) => d.path.at(-1)) : [], at).toEqual(kids.filter((c) => c.kind !== 'layer').map((c) => c.step));
            for (const c of kids) walk([...path, c.step]);
            return;
          }
          expect(b?.kind, at).toBe('stack');
          if (b?.kind !== 'stack') return;
          stacks++;
          for (const g of b.rungs) expect(sceneRef(r, g.path, o), `${at} → ${g.path.join('/')}`).not.toBeNull();
          expect(b.rungs[b.here].path, at).toEqual(path);
          const last = b.rungs.at(-1)!;
          expect(last.layer, at).toBeNull();
          expect(sceneRef(r, last.path, o)!.kind, at).toBe('dive');
          expect(b.rungs.slice(0, -1).every((g) => g.layer), at).toBe(true);
          if (ref.kind === 'layer') {
            const s = sideways(r, path, null, o);
            expect(b.rungs.slice(0, -1).map((g) => g.path.at(-1)).reverse(), at).toEqual(s.steps);
            expect(last.path, at).toEqual(signalUnder(r, ref));
            expect(b.rungs.slice(0, -1).every((g) => parentPath(g.path).join('/') === parentPath(path).join('/')), at).toBe(true);
          }
        };
        walk([]);
      }
    }
    expect(stacks).toBeGreaterThan(100);
  });
});
