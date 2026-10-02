import { describe, expect, it } from 'vitest';
import { LOOP, SEEN, beatAt, bulk, clock, httpMoment, layoutFor, seenSoFar, walkerX, type Where } from '../../content/scenes/http-chunk/http';

const tall = { h: 900, top: 0, bottom: 0 };
const short = { h: 390, top: 0, bottom: 0 };
const layouts = [layoutFor('landscape', tall), layoutFor('landscape', short), layoutFor('portrait', tall)];
const steps = (dt = 0.05) => Array.from({ length: Math.round(LOOP / dt) }, (_, i) => i * dt);

describe('the video chunk dive (http-chunk)', () => {
  it('tells the story in order and loops', () => {
    const seen: string[] = [];
    for (const t of steps()) if (seen.at(-1) !== beatAt(t)) seen.push(beatAt(t));
    expect(seen).toEqual(['ask', 'hit', 'slower', 'ask2', 'miss', 'play']);
    expect(beatAt(LOOP + 0.1)).toBe('ask');
    expect(clock(-1)).toBeCloseTo(LOOP - 1);
  });

  it('asks for 42 in medium while the connection is fast, then 43 in low once it is slow', () => {
    const first = httpMoment(1);
    expect([first.chunk, first.quality, first.bars]).toEqual([42, 'med', 3]);
    const second = httpMoment(10);
    expect([second.chunk, second.quality, second.bars]).toEqual([43, 'low', 1]);
    // the bars fall before the second slip is written
    expect(httpMoment(9.3).bars).toBe(1);
    expect(httpMoment(9.3).write).toBe(1);
    expect(httpMoment(9.5).write).toBeLessThan(1);
  });

  it('finds 42 on the shelf, but has to fetch 43 from the main copy before stamping 200 OK', () => {
    expect(httpMoment(5).ok).toBe(1);
    expect(httpMoment(5).fetch).toBe(0);
    expect(httpMoment(13).stored).toBe(false);
    expect(httpMoment(14).ok).toBe(0);
    expect(httpMoment(15).stored).toBe(true);
    expect(httpMoment(15).ok).toBe(1);
    for (const t of steps()) {
      const m = httpMoment(t);
      // the second answer never goes before the copy is on the shelf
      if (m.walker?.kind === 'chunk' && m.quality === 'low') expect(m.stored).toBe(true);
    }
  });

  it('walks a slip up, then a chunk down, twice, and nothing walks on the road twice at once', () => {
    const walks: string[] = [];
    for (const t of steps()) {
      const w = httpMoment(t).walker;
      const key = w && `${w.kind}:${w.quality}`;
      if (key && walks.at(-1) !== key) walks.push(key);
    }
    expect(walks).toEqual(['ask:med', 'chunk:med', 'ask:low', 'chunk:low']);
    expect(SEEN.map((w) => `${w.kind}:${w.quality}`)).toEqual(walks);
  });

  it('makes the sizes tell the story: slip tiny, medium chunk biggest, low chunk smaller', () => {
    const ask = bulk({ kind: 'ask', quality: 'med' });
    const med = bulk({ kind: 'chunk', quality: 'med' });
    const low = bulk({ kind: 'chunk', quality: 'low' });
    expect(ask).toBeLessThan(low);
    expect(low).toBeLessThan(med);
  });

  it('keeps the walker between the two doorsteps, moving the right way, in every layout', () => {
    for (const L of layouts) {
      for (const where of ['client', 'server', 'middle'] as Where[]) {
        let last = null as { kind: string; x: number } | null;
        for (const t of steps()) {
          const w = httpMoment(t).walker;
          if (!w) { last = null; continue; }
          const x = walkerX(w, L, where);
          const half = 72 * L.parcel * bulk(w);
          const c = where === 'client' ? L.home[0] : L.ends[0];
          const s = where === 'server' ? L.home[1] : L.ends[1];
          expect(x - half).toBeGreaterThanOrEqual(c.x + c.size / 2);
          expect(x + half).toBeLessThanOrEqual(s.x - s.size / 2);
          if (last?.kind === w.kind) {
            if (w.kind === 'ask') expect(x).toBeGreaterThanOrEqual(last.x);
            else expect(x).toBeLessThanOrEqual(last.x);
          }
          last = { kind: w.kind, x };
        }
      }
    }
  });

  it('counts what a sealed hop has seen go by, from none to all four', () => {
    expect(seenSoFar(0)).toBe(0);
    expect(seenSoFar(LOOP - 0.01)).toBe(SEEN.length);
    const ts = steps();
    for (let i = 1; i < ts.length; i++) expect(seenSoFar(ts[i])).toBeGreaterThanOrEqual(seenSoFar(ts[i - 1]));
  });

  it('uses the short-landscape layout only when the panel is short', () => {
    expect(layoutFor('landscape', short).compact).toBe(true);
    expect(layoutFor('landscape', tall).compact).toBe(false);
    expect(layoutFor('portrait', short).compact).toBe(false);
  });
});
