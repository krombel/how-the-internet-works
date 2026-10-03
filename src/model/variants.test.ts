// Era variants (#59): an activity or a segment of another era stands in for its base and speaks through the base's
// strings, a content item's locale file may hold a block of strings for an era, and a hop whose node changes cross-fades.
import { beforeAll, describe, expect, it } from 'vitest';
import { morphScene, pathScene } from './layout';
import { activityIds, content, inEra, type Content } from './registry';
import { activityKey, normaliseChoice, resolveRoute, stringSources } from './resolve';
import { firstOf, loadAllPacks, withEra } from './strings';

const at = (place: string, c?: Content) => resolveRoute({ activity: 'watch-video', places: [place] }, c);

describe('era variants (#59)', () => {
  beforeAll(loadAllPacks);

  it('lists base activities only: a variant is picked by the era, not by the reader', () => {
    expect(activityIds()).toContain('watch-video');
    expect(activityIds().filter((a) => content.activities[a].variantOf)).toEqual([]);
    expect(inEra(content.activities, 'watch-video', '1995').id).toBe('watch-video-1995');
    expect(inEra(content.activities, 'watch-video', 'today').id).toBe('watch-video');
  });

  it('gives a route its era, and the activity of that era', () => {
    expect(['home', 'street', 'home-dsl', 'home-dialup'].map((p) => [at(p).era, at(p).activity.id])).toEqual([
      ['today', 'watch-video'], ['today', 'watch-video'], ['2010', 'watch-video-2010'], ['1995', 'watch-video-1995'],
    ]);
    // honest flows: plain HTTP on port 80 before TLS was everywhere
    for (const p of ['home-dsl', 'home-dialup']) for (const f of at(p).activity.flows) {
      expect(f.stack).toEqual(['ip', 'tcp', 'http']);
      expect(f.ports?.server).toBe(80);
    }
    expect(at('home').activity.flows[0].stack).toContain('tls');
  });

  it('keeps a variant out of the URL: its id becomes the base, and the era picks again', () => {
    expect(normaliseChoice({ activity: 'watch-video-1995', places: ['home'] }).activity).toBe('watch-video');
    expect(resolveRoute({ activity: 'watch-video-1995', places: ['home'] }).activity.id).toBe('watch-video');
  });

  it('looks a variant’s strings up in its base’s namespace, its era’s block first', () => {
    expect(activityKey(content.activities['watch-video-2010'])).toBe('activity.watch-video');
    expect(activityKey(content.activities['watch-video'])).toBe('activity.watch-video');
    expect(stringSources(at('home-dialup')).at(-1)).toBe('activity.watch-video');
    const say = (place: string, key: string) => firstOf('en', withEra([`${activityKey(at(place).activity)}.${key}`], at(place).era === 'today' ? undefined : at(place).era));
    expect([say('home-dialup', 'title'), say('home-dsl', 'title'), say('home', 'title')]).toEqual(['Opening a web page with a picture', 'Watching a small video', 'Watching a video']);
    // the 2010 variant has no packet names of its own: its base's
    expect(say('home-dsl', 'packet.video')).toBe('Video');
    expect(say('home-dialup', 'packet.page')).toBe('Page');
  });

  it('puts an era’s own string first, before each content key', () => {
    expect(withEra(['scene.tcp-pieces.sealed', 'scene.tcp-pieces', 'node.cdn.name', 'era.1995.name', 'ui.time'], '1995')).toEqual([
      'scene.tcp-pieces.1995.sealed', 'scene.tcp-pieces.sealed', 'scene.tcp-pieces.1995', 'scene.tcp-pieces',
      'node.cdn.1995.name', 'node.cdn.name', 'era.1995.name', 'ui.time',
    ]);
    expect(withEra(['node.cdn.name'], undefined)).toEqual(['node.cdn.name']);
    const port = (era?: string) => firstOf('en', withEra(['layer.tcp.field.dport.about'], era));
    expect([port('1995'), port('2010'), port(undefined)].map((s) => s?.match(/\d+ = \w+/)?.[0])).toEqual(['80 = HTTP', '80 = HTTP', '443 = HTTPS']);
    // an era without a string of its own falls through to today's
    expect(firstOf('en', withEra(['node.cdn.name'], '2010'))).toBe(firstOf('en', ['node.cdn.name']));
  });

  it('keeps the words of the past out of the eager English (`eraBlocks` in vite.config.ts)', async () => {
    const now = import.meta.glob<Record<string, unknown>>('/content/nodes/dc-router/locales/en.json', { eager: true, import: 'default', query: '?now' });
    const past = import.meta.glob<Record<string, unknown>>('/content/nodes/dc-router/locales/en.json', { eager: true, import: 'default', query: '?eras' });
    const [today] = Object.values(now), [then] = Object.values(past);
    expect(today.name).toBeTruthy();
    expect(Object.keys(today).filter((k) => /^\d+$/.test(k))).toEqual([]);
    expect(Object.keys(then)).toEqual(['1995', '2010']);
    // and the lazy chunk brings them in
    const { folders } = await import('virtual:past-strings');
    expect(Object.values(folders).flatMap(Object.keys).every((k) => /^\d+$/.test(k))).toBe(true);
    expect(firstOf('en', ['node.dc-router.1995.name'])).toBe('Router');
  });

  it('cross-fades a hop whose node changes between the two routes', () => {
    const a = pathScene(at('home'), null, 'landscape'), b = pathScene(at('home-dsl'), null, 'landscape');
    const router = (t: number) => morphScene(a, b, t).nodes.find((n) => n.id === 'router')!;
    expect(router(0.5).node.id).toBe('dsl-router');
    expect(router(0.5).was?.node.id).toBe('router');
    expect(router(0.5).alpha + router(0.5).was!.alpha).toBeCloseTo(1);
    expect([router(0).alpha, router(1).alpha, router(1).was?.alpha]).toEqual([0, 1, 0]);
    // the same node on both sides doesn't fade at all
    expect(morphScene(a, a, 0.5).nodes.every((n) => !n.was)).toBe(true);
  });

  it('picks a segment’s variant for the era, with its strings falling back to the base’s', () => {
    const c: Content = structuredClone(content);
    const base = c.segments['isp-to-cdn'];
    c.segments['isp-to-cdn-1995'] = {
      ...structuredClone(base), id: 'isp-to-cdn-1995', file: 'content/segments/isp-to-cdn-1995/segment.ts', variantOf: 'isp-to-cdn', era: '1995',
      hops: base.hops.map((h) => ('at' in h && h.at === 'border' ? { ...h, node: 'router' } : h)),
    };
    const old = at('home-dialup', c), now = at('home', c);
    expect(old.hops.border.node.id).toBe('router');
    expect(now.hops.border.node.id).toBe('border');
    // it speaks through its base's namespace (the era's block first, by `withEra`)
    expect(stringSources(old)).toContain('segment.isp-to-cdn');
    expect(stringSources(old)).not.toContain('segment.isp-to-cdn-1995');
    expect(old.sources.map((s) => s.id)).toContain('segment.isp-to-cdn-1995');
  });

  it('draws a group with another network node when the activity says so (a job done by another node in an era)', () => {
    const c: Content = structuredClone(content);
    c.activities['watch-video-1995'].groups = ['internet', { id: 'datacentre', in: 'internet', node: 'internet' }];
    expect(at('home-dialup', c).hops.datacentre.node.id).toBe('internet');
    expect(at('home', c).hops.datacentre.node.id).toBe('datacentre');
  });
});
