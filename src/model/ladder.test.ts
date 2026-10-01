import { describe, expect, it } from 'vitest';
import { belowOf, carriedBy, type Below } from './ladder';
import { content } from './registry';
import { resolveRoute, type Route } from './resolve';
import { childrenOf, diveRuns, layersAt, linkDivePath, parentPath, sceneRef } from './tree';

const home = resolveRoute({ activity: 'watch-video', places: ['home'] });
const street = resolveRoute({ activity: 'watch-video', places: ['street'] });
const desk = resolveRoute({ activity: 'watch-video', places: ['desk'] });
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
  it('stacks the layers carried on one link at a layer dive\'s hop, top first, over that link\'s signal', () => {
    // IP rides both sides of the router: by default the side it leaves on (fibre), or the side you came from
    expect(stack(belowOf(home, ['router~ip'], 'landscape'))).toEqual(['router~tls!', 'router~tcp!', '*router~ip', 'router~gpon', '~router-internet']);
    expect(stack(belowOf(home, ['router~ip'], 'landscape', 'ap-router'))).toEqual(['router~tls!', 'router~tcp!', '*router~ip', 'router~ethernet', '~ap-router']);
    // a link envelope stands on its own link: no fibre frame on the copper
    expect(stack(belowOf(home, ['router~ethernet'], 'landscape'))).toEqual(['router~tls!', 'router~tcp!', 'router~ip', '*router~ethernet', '~ap-router']);
    expect(stack(belowOf(desk, ['router~ethernet'], 'landscape', 'router-cabinet'))).toEqual(['router~tls!', 'router~tcp!', 'router~ip', '*router~ethernet', '~laptop-router']);
    expect(stack(belowOf(home, ['phone~tls'], 'portrait'))).toEqual(['*phone~tls', 'phone~tcp', 'phone~ip', 'phone~wifi', '~phone-ap']);
    // MPLS is on the link into the core only; the core's other side carries plain Ethernet
    expect(stack(belowOf(home, ['internet', 'core~mpls'], 'landscape'))?.slice(-3)).toEqual(['*internet/core~mpls', 'internet/core~ethernet', '~internet/bng-core']);
    expect(stack(belowOf(home, ['internet', 'core~ethernet'], 'landscape', 'core-ixp'))?.slice(-3)).toEqual(['internet/core~ip', '*internet/core~ethernet', '~internet/bng-core']);
  });

  it('stacks what a signal carries over it: the envelopes on all its links, then what they carry', () => {
    expect(stack(belowOf(home, ['phone-ap'], 'landscape'))).toEqual(['ap~tls!', 'ap~tcp!', 'ap~ip', 'ap~wifi', '*~phone-ap']);
    expect(stack(belowOf(desk, ['laptop-router'], 'landscape'))).toEqual(['router~tls!', 'router~tcp!', 'router~ip', 'router~ethernet', '*~laptop-router']);
    // only this link's envelopes: not the cell tower's radio one
    expect(stack(belowOf(street, ['cell-tower-internet'], 'landscape'))).toEqual(
      ['cell-tower~tls!', 'cell-tower~tcp!', 'cell-tower~ip', 'cell-tower~gtp', 'cell-tower~ethernet', '*~cell-tower-internet']);
    expect(stack(belowOf(home, ['internet', 'home-cabinet'], 'landscape'))?.slice(-2)).toEqual(['internet/cabinet~gpon', '*~internet/home-cabinet']);
    // a stretch of links (#34) shares only what all of them carry: no MPLS from its first link
    const run = belowOf(home, ['internet', 'bng-core'], 'landscape');
    expect(stack(run)).toEqual(['internet/core~tls!', 'internet/core~tcp!', 'internet/core~ip', 'internet/core~ethernet', '*~internet/bng-core']);
    expect(run?.kind === 'stack' && run.link).toBe('core-ixp');
    // and so does the caption's What it carries
    expect(carriedBy(home, sceneRef(home, ['internet', 'bng-core'], 'landscape')!, 'landscape').map((u) => u.layer)).toEqual(['ethernet']);
  });

  // generic: whatever content exists, every scene of every place × activity, both orientations
  it('holds everywhere: rungs resolve, the one you\'re on is marked, and every stack ends in a signal', () => {
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
          expect(b.rungs.slice(0, -1).every((g) => g.layer && parentPath(g.path).join('/') === parentPath(b.rungs[0].path).join('/')), at).toBe(true);
        };
        walk([]);
      }
    }
    expect(stacks).toBeGreaterThan(100);
  });

  // generic: on every link of every route, the ladder holds that link's envelopes (and no other link's) over its signal
  it('matches the link you\'re on, everywhere: its layers, its signal, and a stable climb', () => {
    let links = 0;
    for (const activity of Object.keys(content.activities)) for (const place of Object.keys(content.places)) {
      const r = resolveRoute({ activity, places: [place] });
      for (const o of ['landscape', 'portrait'] as const) {
        const near = (hop: string) => { const i = r.hops[hop].index; return [r.links[i - 1], r.links[i]].filter(Boolean); };
        const walk = (path: string[]): void => {
          const ref = sceneRef(r, path, o)!;
          if (ref.kind === 'path') return childrenOf(r, ref, o).forEach((c) => walk([...path, c.step]));
          const at = `${place} × ${activity} ${o} /${path.join('/')}`;
          const linkLayers = (b: Below, hop: string) => b.kind === 'stack'
            ? b.rungs.filter((g) => g.layer && near(hop).some((l) => l.stack.includes(g.layer!))).map((g) => g.layer!) : [];
          if (ref.kind === 'dive') {
            // a signal: its envelopes are on every link of its stretch, read at one end of it
            const run = diveRuns(r, sceneRef(r, parentPath(path), o)!.group, o).byLink.get(ref.link!.id)!.links.map((l) => l.link);
            const b = belowOf(r, path, o)!, hop = sceneRef(r, b.kind === 'stack' ? b.rungs[0].path : [], o)!.at!.hop;
            expect(b.kind === 'stack' && run.map((l) => l.id), at).toContain(b.kind === 'stack' && b.link);
            expect(near(hop).some((l) => run.includes(l)), at).toBe(true);
            for (const x of linkLayers(b, hop)) for (const l of run) expect(l.stack, `${at}: ${x} on ${l.id}`).toContain(x);
            return;
          }
          // a layer dive: stand on each link at its hop that carries this layer (or any, for an inner layer)
          const { hop, layer } = ref.at!, sides = near(hop), inner = !sides.some((l) => l.stack.includes(layer));
          for (const link of sides.filter((l) => inner || l.stack.includes(layer))) {
            const b = belowOf(r, path, o, link.id), on = `${at} on ${link.id}`;
            if (b?.kind !== 'stack') throw new Error(`no stack: ${on}`);
            links++;
            expect(b.link, on).toBe(link.id);
            expect(b.rungs[b.here].path, on).toEqual(path);
            const mine = linkLayers(b, hop);
            for (const x of mine) expect(link.stack, `${on}: ${x}`).toContain(x);
            for (const x of link.stack) if (layersAt(r, r.hops[hop]).some((a) => a.layer === x)) expect(mine, `${on}: ${x}`).toContain(x);
            const sig = linkDivePath(r, link, parentPath(path));
            expect(b.rungs.at(-1)!.path, on).toEqual(sig);
            // climbing keeps the ladder: every envelope rung, stood on from here, shows the same one
            for (const g of b.rungs.slice(0, -1)) expect(stack(belowOf(r, g.path, o, b.link)), `${on} → ${g.path.join('/')}`).toEqual(
              stack({ ...b, here: b.rungs.indexOf(g) }));
          }
        };
        walk([]);
      }
    }
    expect(links).toBeGreaterThan(200);
  });
});
