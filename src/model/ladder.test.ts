import { describe, expect, it } from 'vitest';
import { belowOf, carriedBy, rungStep, type Below } from './ladder';
import { activityIds, content } from './registry';
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
    // a device with a dive (#9) is a door between its links
    expect(doors(home, [])).toEqual(['dive:phone-ap', 'dive:ap-router', 'dive:router', 'dive:router-internet', 'expand:internet']);
    // a stretch of links is one door
    expect(doors(home, ['internet'])).toEqual(['dive:internet/home-cabinet', 'dive:internet/olt-bng', 'dive:internet/bng-core', 'dive:internet/core-border', 'dive:internet/border', 'dive:internet/border-ixp', 'dive:internet/ixp', 'dive:internet/ixp-datacentre', 'expand:internet/datacentre']);
    // and inside the data centre, devices with a dive end a stretch
    expect(doors(home, ['internet', 'datacentre'])).toEqual(['dive:internet/datacentre/ixp-dc-router', 'dive:internet/datacentre/dc-router-load-balancer', 'dive:internet/datacentre/spine', 'dive:internet/datacentre/spine-rack-switch', 'dive:internet/datacentre/cdn']);
    expect(doors(street, [])).toEqual(['dive:phone-cell-tower', 'dive:cell-tower', 'dive:cell-tower-internet', 'expand:internet']);
    expect(belowOf(home, ['no-such-step'], 'landscape')).toBeNull();
  });
});

describe('layer ladder (#14, #32)', () => {
  it('stacks the layers carried on one link at a layer dive\'s hop, top first, over that link\'s signal', () => {
    // IP rides both sides of the router: by default the side it leaves on (fibre, an Ethernet frame inside a PON frame),
    // or the side you came from
    expect(stack(belowOf(home, ['router~ip'], 'landscape'))).toEqual(['router~http!', 'router~tls!', 'router~tcp!', '*router~ip', 'router~ethernet', 'router~gpon', '~router-internet']);
    expect(stack(belowOf(home, ['router~ip'], 'landscape', 'ap-router'))).toEqual(['router~http!', 'router~tls!', 'router~tcp!', '*router~ip', 'router~ethernet', '~ap-router']);
    // a link envelope stands on its own link: no fibre frame on the copper
    expect(stack(belowOf(home, ['router~ethernet'], 'landscape'))).toEqual(['router~http!', 'router~tls!', 'router~tcp!', 'router~ip', '*router~ethernet', '~ap-router']);
    expect(stack(belowOf(home, ['router~gpon'], 'landscape', 'ap-router'))).toEqual(['router~http!', 'router~tls!', 'router~tcp!', 'router~ip', 'router~ethernet', '*router~gpon', '~router-internet']);
    // Ethernet rides both sides of the router too; on the fibre, inside the PON frame
    expect(stack(belowOf(desk, ['router~ethernet'], 'landscape', 'router-cabinet'))).toEqual(['router~http!', 'router~tls!', 'router~tcp!', 'router~ip', '*router~ethernet', 'router~gpon', '~router-internet']);
    expect(stack(belowOf(home, ['phone~tls'], 'portrait'))).toEqual(['phone~http', '*phone~tls', 'phone~tcp', 'phone~ip', 'phone~wifi', '~phone-ap']);
    // MPLS rides the long haul into the border router (#25); its other side, the cross-connect, carries plain Ethernet
    expect(stack(belowOf(home, ['internet', 'border~mpls'], 'landscape'))?.slice(-3)).toEqual(['*internet/border~mpls', 'internet/border~ethernet', '~internet/core-border']);
    expect(stack(belowOf(home, ['internet', 'border~ethernet'], 'landscape', 'border-ixp'))?.slice(-3)).toEqual(['internet/border~ip', '*internet/border~ethernet', '~internet/border-ixp']);
  });

  it('stacks what a signal carries over it: the envelopes on all its links, then what they carry', () => {
    expect(stack(belowOf(home, ['phone-ap'], 'landscape'))).toEqual(['ap~http!', 'ap~tls!', 'ap~tcp!', 'ap~ip', 'ap~wifi', '*~phone-ap']);
    expect(stack(belowOf(desk, ['laptop-router'], 'landscape'))).toEqual(['router~http!', 'router~tls!', 'router~tcp!', 'router~ip', 'router~ethernet', '*~laptop-router']);
    // only this link's envelopes: not the cell tower's radio one
    expect(stack(belowOf(street, ['cell-tower-internet'], 'landscape'))).toEqual(
      ['cell-tower~http!', 'cell-tower~tls!', 'cell-tower~tcp!', 'cell-tower~ip', 'cell-tower~gtp', 'cell-tower~ethernet', '*~cell-tower-internet']);
    // through the passive splitter, read at the OLT
    expect(stack(belowOf(home, ['internet', 'home-cabinet'], 'landscape'))?.slice(-3)).toEqual(['internet/olt~ethernet', 'internet/olt~gpon', '*~internet/home-cabinet']);
    // a stretch of links (#34) shares what all of them carry: the long haul is label-switched all along
    const run = belowOf(home, ['internet', 'bng-core'], 'landscape');
    expect(stack(run)).toEqual(['internet/core~http!', 'internet/core~tls!', 'internet/core~tcp!', 'internet/core~ip', 'internet/core~mpls', 'internet/core~ethernet', '*~internet/bng-core']);
    expect(run?.kind === 'stack' && run.link).toBe('bng-core');
    // and so does the caption's What it carries; the exchange's cross-connects carry plain Ethernet, no label
    expect(carriedBy(home, sceneRef(home, ['internet', 'bng-core'], 'landscape')!, 'landscape').map((u) => u.layer)).toEqual(['ethernet', 'mpls']);
    expect(carriedBy(home, sceneRef(home, ['internet', 'border-ixp'], 'landscape')!, 'landscape').map((u) => u.path.join('/'))).toEqual(['internet/ixp~ethernet']);
  });

  it('stacks what a device handles on one of its links, the one you came by or else the one it sends on (#9)', () => {
    // none lit: you're at the device, not one of its envelopes
    const out = belowOf(home, ['router'], 'landscape');
    expect(stack(out)).toEqual(['router~http!', 'router~tls!', 'router~tcp!', 'router~ip', 'router~ethernet', 'router~gpon', '~router-internet']);
    expect(out?.kind === 'stack' && [out.hop, out.link]).toEqual(['router', 'router-cabinet']);
    expect(stack(belowOf(home, ['router'], 'landscape', 'ap-router'))).toEqual(['router~http!', 'router~tls!', 'router~tcp!', 'router~ip', 'router~ethernet', '~ap-router']);
    // a link that isn't at the device can't hold it
    expect(stack(belowOf(home, ['router'], 'landscape', 'phone-ap'))?.at(-1)).toBe('~router-internet');
    // and its caption's What it carries is its links' envelopes, one each side
    expect(carriedBy(home, sceneRef(home, ['router'], 'landscape')!, 'landscape').map((u) => u.layer)).toEqual(['ethernet', 'gpon']);
  });

  // generic: whatever content exists, every scene of every place × activity, both orientations
  it('holds everywhere: rungs resolve, the one you\'re on is marked, and every stack ends in a signal', () => {
    let stacks = 0;
    for (const activity of activityIds()) for (const place of Object.keys(content.places)) {
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
          // a device (#9) is not one of its envelopes
          if (ref.node) expect(b.here, at).toBe(-1);
          else expect(b.rungs[b.here].path, at).toEqual(path);
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
    for (const activity of activityIds()) for (const place of Object.keys(content.places)) {
      const r = resolveRoute({ activity, places: [place] });
      for (const o of ['landscape', 'portrait'] as const) {
        const near = (hop: string) => { const i = r.hops[hop].index; return [r.links[i - 1], r.links[i]].filter(Boolean); };
        const walk = (path: string[]): void => {
          const ref = sceneRef(r, path, o)!;
          if (ref.kind === 'path') return childrenOf(r, ref, o).forEach((c) => walk([...path, c.step]));
          const at = `${place} × ${activity} ${o} /${path.join('/')}`;
          const linkLayers = (b: Below, hop: string) => b.kind === 'stack'
            ? b.rungs.filter((g) => g.layer && near(hop).some((l) => l.stack.includes(g.layer!))).map((g) => g.layer!) : [];
          if (ref.node) {
            // a device (#9): on each of its links, that link's envelopes over its signal, and climbing keeps the ladder
            for (const link of near(ref.node.hop.id)) {
              const b = belowOf(r, path, o, link.id), on = `${at} on ${link.id}`;
              if (b?.kind !== 'stack') throw new Error(`no stack: ${on}`);
              expect(b.link, on).toBe(link.id);
              expect(b.rungs.at(-1)!.path, on).toEqual(linkDivePath(r, link, parentPath(path)));
              for (const g of b.rungs.slice(0, -1)) expect(stack(belowOf(r, g.path, o, b.link)), `${on} → ${g.path.join('/')}`).toEqual(
                stack({ ...b, here: b.rungs.indexOf(g) }));
            }
            return;
          }
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

describe('rung to rung (#62)', () => {
  it('steps down the stack towards the signal (1) or up (-1), between rungs of the ladder you see', () => {
    expect(rungStep(home, ['phone~tls'], ['phone~tcp'], 'landscape')).toBe(1);
    expect(rungStep(home, ['phone~tcp'], ['phone~tls'], 'landscape')).toBe(-1);
    // down onto the signal and back up from it
    expect(rungStep(home, ['router~ip'], ['router-internet'], 'landscape')).toBe(1);
    expect(rungStep(home, ['phone-ap'], ['ap~wifi'], 'landscape')).toBe(-1);
    // the ladder you came by: on the copper the router's signal is the copper's
    expect(rungStep(home, ['router~ip'], ['ap-router'], 'landscape', 'ap-router')).toBe(1);
    expect(rungStep(home, ['router~ip'], ['ap-router'], 'landscape')).toBe(0);
  });

  it('is no step from a path scene, a device\'s dive, to another hop or to where you are', () => {
    expect(rungStep(home, [], ['phone-ap'], 'landscape')).toBe(0);
    expect(rungStep(home, ['router'], ['router~ip'], 'landscape')).toBe(0);
    expect(rungStep(home, ['phone~ip'], ['ap~ip'], 'landscape')).toBe(0);
    expect(rungStep(home, ['phone~ip'], ['phone~ip'], 'landscape')).toBe(0);
    expect(rungStep(home, ['router~ip'], [], 'landscape')).toBe(0);
  });

  // generic: every rung of every ladder, from every other rung of it
  it('holds everywhere: between any two rungs, the way down the ladder', () => {
    let pairs = 0;
    for (const activity of activityIds()) for (const place of Object.keys(content.places)) {
      const r = resolveRoute({ activity, places: [place] });
      for (const o of ['landscape', 'portrait'] as const) {
        const walk = (path: string[]): void => {
          const ref = sceneRef(r, path, o)!;
          if (ref.kind === 'path') return childrenOf(r, ref, o).forEach((c) => walk([...path, c.step]));
          const b = belowOf(r, path, o);
          if (b?.kind !== 'stack' || b.here < 0) return;
          b.rungs.forEach((g, i) => {
            pairs++;
            expect(rungStep(r, path, g.path, o), `${place} × ${activity} ${o} /${path.join('/')} → ${g.path.join('/')}`).toBe(Math.sign(i - b.here));
          });
        };
        walk([]);
      }
    }
    expect(pairs).toBeGreaterThan(500);
  });
});
