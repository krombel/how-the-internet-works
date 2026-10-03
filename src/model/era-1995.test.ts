// The 1995 trip (#59, step 6): the maths of its new dives, the way it goes, and that nothing it says belongs to a later
// internet (review panel F14–F16: MPLS, 100–400G, coherent optics, leaf–spine and CDNs reached from 1995).
import { beforeAll, describe, expect, it } from 'vitest';
import type { Level } from '../define';
import { CELL, PACKET, cellsFor, cellsOnLine, lineBytes, overhead } from '../../content/scenes/atm-cells/atm';
import { FRAME_S, lineCode, lineRate, modeOf, pulsePath, slotsOf, train } from '../../content/scenes/tdm-frames/tdm';
import { CODES, codeOf, copperSparks, eyePaths, litPairs, manchesterPath } from '../../content/scenes/copper-pulses/copper';
import { sceneKeys } from './describe';
import { activityIds, content } from './registry';
import { firstOf, loadAllPacks, packs, withEra } from './strings';
import { resolveRoute, stringSources, type Route } from './resolve';
import { childrenOf, diveSubject, sceneRef, type SceneRef } from './tree';

describe('timeslots (tdm-frames)', () => {
  it('frames a PRI, a leased E1 and a T1 as the standards do', () => {
    const pri = slotsOf('pri');
    expect(pri).toHaveLength(32);
    expect(pri[0]).toBe('sync');
    expect(pri[16]).toBe('signal');
    expect(pri.filter((k) => k === 'yours')).toHaveLength(1);
    // 30 B channels: yours, the others and the free ones
    expect(pri.filter((k) => k === 'yours' || k === 'other' || k === 'idle')).toHaveLength(30);
    expect(slotsOf('e1').filter((k) => k === 'pipe')).toHaveLength(31);
    const t1 = slotsOf('t1');
    expect(t1).toHaveLength(25);
    expect(t1.filter((k) => k === 'pipe')).toHaveLength(24);
    expect(lineRate('e1')).toBe(2.048e6);
    expect(lineRate('pri')).toBe(2.048e6);
    expect(lineRate('t1')).toBe(1.544e6);
    expect(FRAME_S).toBeCloseTo(125e-6);
    expect(modeOf('t1')).toBe('t1');
    expect(modeOf('pri')).toBe('pri');
    expect(modeOf('submarine-sdh')).toBe('e1');
  });

  it('keeps a train of frames on its wire, slot 0 leading', () => {
    for (const mode of ['pri', 'e1', 't1'] as const) for (const t of [0, 0.37, 2.5, 11]) for (const dir of [1, -1] as const) {
      const slots = train(t, mode, 100, 900, 12, 30, 80, dir);
      expect(slots.length).toBeGreaterThan(20);
      for (const s of slots) {
        expect(s.x).toBeGreaterThanOrEqual(100);
        expect(s.x + 12).toBeLessThanOrEqual(900 + 1e-9);
        expect(s.i).toBeLessThan(slotsOf(mode).length);
      }
    }
  });

  it('codes the copper: ones alternate, an E1 hides four zeros in a violation, a T1 needs none', () => {
    const e1 = lineCode('e1');
    const v = e1.filter((c) => c.v);
    expect(v).toHaveLength(1);
    const i = e1.indexOf(v[0]);
    const before = e1.slice(0, i).filter((c) => c.level).at(-1)!;
    // a violation has the same sign as the pulse before it
    expect(v[0].level).toBe(before.level);
    expect(e1.slice(i - 3, i).every((c) => c.level === 0)).toBe(true);
    const t1 = lineCode('t1').filter((c) => c.level);
    expect(lineCode('t1').some((c) => c.v)).toBe(false);
    for (let k = 1; k < t1.length; k++) expect(t1[k].level).toBe(-t1[k - 1].level);
    const d = pulsePath(e1, 0, 0, 100, 40);
    expect(d.startsWith('M0 20')).toBe(true);
    expect(d.endsWith('H100')).toBe(true);
  });
});

describe('ATM cells (atm-cells)', () => {
  it('cuts a full-size packet into 32 cells of 53 bytes', () => {
    expect(CELL).toBe(53);
    expect(cellsFor(PACKET)).toBe(32);
    expect(lineBytes(PACKET)).toBe(1696);
    expect(overhead(PACKET)).toBeCloseTo(0.116, 3);
    // a bare TCP ack (40 bytes) plus AAL5's 16 needs a second cell
    expect(cellsFor(40)).toBe(2);
    expect(cellsFor(32)).toBe(1);
  });

  it('keeps the cells on the line, in order, swapped past the switch', () => {
    for (const t of [0, 1.3, 7.9]) {
      const cells = cellsOnLine(t, 100, 1500, 800, 40, 70, 120);
      expect(cells.length).toBeGreaterThan(10);
      for (const c of cells) {
        expect(c.x).toBeGreaterThanOrEqual(100);
        expect(c.x + 40).toBeLessThanOrEqual(1500);
        expect(c.swapped).toBe(c.x + 20 > 800);
      }
      for (let k = 1; k < cells.length; k++) expect(cells[k].n).toBe(cells[k - 1].n - 1);
    }
  });
});

describe('10BASE-T (copper-pulses in 1995)', () => {
  it('draws 10 Mbit/s as Manchester code on two pairs, anything faster as PAM-5', () => {
    expect(codeOf(10e6)).toBe('manchester');
    expect(codeOf(1e9)).toBe('pam5');
    expect(litPairs('manchester', false)).toEqual([0, 1]);
    expect(litPairs('pam5', true)).toEqual([0, 1, 2, 3]);
    expect(CODES.manchester.labels).toHaveLength(2);
    expect(CODES.pam5.labels).toHaveLength(5);
    expect(eyePaths([0.08, 0.92], 6)).toHaveLength(6);
    expect(CODES.pam5.eye).toHaveLength(12);
  });

  it('flips the line in the middle of every bit, low to high for a one', () => {
    // two bits in 40 wide, 10 high: 1 (low, high) then 0 (high, low)
    expect(manchesterPath(0, 0, 40, 10, [1, 0])).toBe('M0 10.0 H10.0 V0.0 H20.0 H30.0 V10.0 H40.0');
    const bits = [1, 1, 0, 1, 0, 0];
    const d = manchesterPath(0, 0, 120, 10, bits);
    // a flip in the middle of every bit
    for (let i = 0; i < bits.length; i++) expect(d).toContain(`H${(i * 20 + 10).toFixed(1)} V`);
  });

  it('takes turns on its two pairs: one way at a time, never on the others', () => {
    for (let t = 0; t < 12; t += 0.25) {
      const live = copperSparks(t, false, true, 'manchester').filter((s) => s.alpha > 0.02);
      expect(live.length).toBeLessThanOrEqual(1);
      for (const s of live) expect(s.dir).toBe(s.pair === 0 ? 1 : -1);
    }
    expect(copperSparks(0, false, true).length).toBe(8);
  });
});

/** Every reachable scene of a route, in both orientations. */
function scenes(r: Route): SceneRef[] {
  const out = new Map<string, SceneRef>();
  for (const o of ['landscape', 'portrait'] as const) {
    const walk = (ref: SceneRef): void => {
      out.set(ref.path.join('/'), ref);
      for (const c of childrenOf(r, ref, o)) walk(sceneRef(r, [...ref.path, c.step], o)!);
    };
    walk(sceneRef(r, [], o)!);
  }
  return [...out.values()];
}

describe('the 1995 trip', () => {
  beforeAll(loadAllPacks);
  const trips = () => activityIds().map((activity) => resolveRoute({ activity, places: ['home-dialup'] }));

  it('dials, then rides timeslots, a sea cable and ATM to the server room', () => {
    for (const r of trips()) {
      expect(r.era).toBe('1995');
      const way = r.links.map((l) => `${l.tech.id}/${l.stack.join('+')}`);
      expect(way.slice(0, 7)).toEqual(['dialup/ppp', 'pri/ppp', 'ethernet/ethernet', 'e1/hdlc', 'submarine-sdh/hdlc', 'atm/atm', 't1/hdlc']);
      expect(r.asides.map((a) => `${a.link.id}/${a.link.tech.id}`)).toContain('core-ixp/e1');
      const steps = scenes(r).map((s) => s.path.at(-1));
      // the layers' own dives: HDLC at the ISP's router, ATM at the backbone's
      expect(steps).toContain('core~hdlc');
      expect(steps.some((s) => s?.endsWith('~atm'))).toBe(true);
      expect(scenes(r).some((s) => s.dive === 'tdm-frames')).toBe(true);
    }
  });

  it('says nothing of a later internet, unless it says when (review panel F14–F16)', () => {
    const LATER = /MPLS|coherent|DWDM|leaf|CDN|[1-8]00\s?G|400GBASE|k8s|Kubernetes|75 000|80 000/i;
    const SAYS_WHEN = /today|i dag|nutid|\b(199[6-9]|20\d\d)\b/i;
    const bad = new Set<string>();
    for (const r of trips()) {
      const era = (keys: string[]) => withEra(keys, r.era);
      const src = stringSources(r);
      const lists: string[][] = [];
      for (const ref of scenes(r)) {
        for (const keys of sceneKeys(r, ref)) for (const s of ['', '.describe', '.extra', '.title']) lists.push(keys.map((k) => k + s));
        if (ref.kind === 'dive') lists.push(...['kid', 'nerd', 'title'].map((k) => [`scene.${ref.dive}.${diveSubject(ref)}.${k}`]));
      }
      for (const h of Object.values(r.hops)) {
        lists.push([...src.map((s) => `${s}.stop.${h.id}`), `node.${h.node.id}`], [`node.${h.node.id}.name`]);
        lists.push([...src.map((s) => `${s}.tag.${h.id}`), `node.${h.node.id}.tag`]);
        if (h.owner) lists.push([`owner.${h.owner}.name`]);
      }
      for (const l of [...r.links, ...r.asides.map((a) => a.link)]) {
        lists.push([...src.map((s) => `${s}.stop.${l.id}`), `tech.${l.tech.id}`], [`tech.${l.tech.id}.name`]);
        lists.push([...src.map((s) => `${s}.tag.${l.id}`), `tech.${l.tech.id}.tag`]);
      }
      for (const keys of lists) for (const lang of Object.keys(packs)) for (const level of ['kid', 'nerd'] as Level[]) {
        const s = firstOf(lang, era(keys), level);
        if (s && LATER.test(s) && !SAYS_WHEN.test(s)) bad.add(`${lang} ${level} ${keys[0]}: ${s}`);
      }
    }
    expect([...bad]).toEqual([]);
  });

  it('counts the networks of its own time', () => {
    const nerd = (era: string | undefined) => firstOf('en', withEra(['node.internet'], era), 'nerd')!;
    expect(nerd(undefined)).toMatch(/80 000/);
    expect(nerd('2010')).toMatch(/35 000/);
    expect(nerd('1995')).toMatch(/1 700/);
    expect(Object.keys(content.eras)).toEqual(expect.arrayContaining(['1995', '2010']));
  });
});
