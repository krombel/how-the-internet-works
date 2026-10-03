// `npm run check:content` runs this file: the real content must validate, and authors get readable messages.
import { beforeAll, describe, expect, it } from 'vitest';
import type { Level } from '../define';
import { describeKeys } from './describe';
import { activityIds, basePlace, content, nowEra, placeFamily, type Content } from './registry';
import { loadAllPacks, lookupLevel, packs, withEra, type Json } from './strings';
import { resolveRoute } from './resolve';
import { childrenOf, diveSubject, sceneRef, sideways, type SceneRef } from './tree';
import { coverage, formatProblems, validate } from './validate';

const files = Object.keys(import.meta.glob('/content/*/*/Scene.svelte'));
const locales = import.meta.glob<Json>('/content/*/*/locales/*.json', { eager: true, import: 'default' });

describe('content', () => {
  beforeAll(loadAllPacks);

  it('validates', () => {
    const problems = validate({ content, packs, files, locales });
    if (problems.length) throw new Error(`\n${formatProblems(problems)}\n`);
  });

  it('reports translation coverage', () => {
    const rows = coverage(packs).map((r) => `${r.lang}: ${r.have}/${r.total} (${Math.round((100 * r.have) / r.total)}%)`);
    console.info(`translation coverage (missing strings fall back to English)\n  ${rows.join('\n  ')}`);
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it('only imports the engine through $core/define and $core/api', () => {
    const sources = import.meta.glob<string>('/content/**/*.{ts,svelte}', { eager: true, query: '?raw', import: 'default' });
    const bad: string[] = [];
    for (const [file, src] of Object.entries(sources))
      for (const m of src.matchAll(/from\s+['"]([^'"]+)['"]/g))
        if (m[1].startsWith('$core/') ? !['$core/define', '$core/api'].includes(m[1]) : m[1].includes('/src/')) bad.push(`${file}: ${m[1]}`);
    expect(bad).toEqual([]);
  });

  it('goes all the way down: every link has a dive, and so does every envelope it carries', () => {
    const missing = new Set<string>();
    for (const activity of activityIds()) for (const place of Object.keys(content.places))
      for (const l of resolveRoute({ activity, places: [place] }).links) {
        if (!l.dive) missing.add(`link ${l.tech.id}`);
        for (const layer of l.stack) if (!content.layers[layer].dive) missing.add(`layer ${layer}`);
      }
    expect([...missing]).toEqual([]);
  });

  it('gives every child of a scene its own step', () => {
    for (const activity of activityIds()) for (const place of Object.keys(content.places)) {
      const r = resolveRoute({ activity, places: [place] });
      const walk = (path: string[]): void => {
        const steps = childrenOf(r, sceneRef(r, path)!).map((c) => c.step);
        expect(new Set(steps).size, `${place}/${activity} /${path.join('/')}`).toBe(steps.length);
        for (const c of childrenOf(r, sceneRef(r, path)!)) if (c.kind === 'expand') walk([...path, c.step]);
      };
      walk([]);
    }
  });

  it('describes every scene a reader can reach, at both levels, in every language (#53)', () => {
    // as the app looks it up (most specific first, each key falling back to English), the description found must be
    // in the language itself: a Danish reader never hears an English one
    const bad = new Set<string>();
    for (const activity of activityIds()) for (const place of Object.keys(content.places)) for (const o of ['landscape', 'portrait'] as const) {
      const r = resolveRoute({ activity, places: [place] });
      const walk = (ref: SceneRef): void => {
        for (const keys of describeKeys(r, ref).map((k) => withEra(k, r.era === nowEra() ? undefined : r.era))) for (const lang of Object.keys(packs)) for (const level of ['kid', 'nerd'] as Level[]) {
          const k = keys.find((k) => lookupLevel(lang, k, level) !== undefined);
          if (!k || !packs[lang].strings[`${k}.${level}`]) bad.add(`${lang} ${level} ${place}/${activity} /${ref.path.join('/')}: tried ${keys.join(', ')}`);
        }
        for (const c of childrenOf(r, ref, o)) walk(sceneRef(r, [...ref.path, c.step], o)!);
      };
      walk(sceneRef(r, [], o)!);
    }
    expect([...bad]).toEqual([]);
  });

  it('gives every era its name, text and picture description, at both levels, in every language (#59)', () => {
    const bad: string[] = [];
    for (const era of Object.keys(content.eras)) for (const lang of Object.keys(packs))
      for (const k of ['name', 'kid', 'nerd', 'describe.kid', 'describe.nerd']) if (!packs[lang].strings[`era.${era}.${k}`]) bad.push(`${lang} era.${era}.${k}`);
    expect(bad).toEqual([]);
  });

  it('names neighbouring stretches that dive into the same scene apart, in every language', () => {
    const bad: string[] = [];
    const title = (lang: string, dive: string, what: string) =>
      packs[lang].strings[`scene.${dive}.${what}.title`] ?? packs[lang].strings[`scene.${dive}.title`];
    for (const activity of activityIds()) for (const place of Object.keys(content.places)) {
      const r = resolveRoute({ activity, places: [place] });
      const walk = (path: string[]): void => {
        const ref = sceneRef(r, path)!, kids = childrenOf(r, ref);
        for (const c of kids) if (c.kind === 'expand') walk([...path, c.step]);
        const first = kids.find((c) => c.kind === 'dive');
        if (!first) return;
        const at = (step: string) => sceneRef(r, [...path, step])!;
        const runs = sideways(r, [...path, first.step], null, 'landscape').steps.map(at);
        for (const [i, b] of runs.entries()) {
          const a = runs[i - 1];
          if (!a || a.dive !== b.dive) continue;
          for (const lang of Object.keys(packs)) {
            const ta = title(lang, a.dive!, diveSubject(a)), tb = title(lang, b.dive!, diveSubject(b));
            if (!ta || ta === tb) bad.push(`${lang} ${place}/${activity} ${[...path, a.path.at(-1)].join('/')} → ${b.path.at(-1)}: "${tb}"`);
          }
        }
      };
      walk([]);
    }
    expect(bad).toEqual([]);
  });
});

describe('validation messages', () => {
  const broken = (patch: (c: Content) => void) => {
    const c: Content = structuredClone(content);
    patch(c);
    return formatProblems(validate({ content: c, packs, files, locales }));
  };

  it('suggests a close technology id', () => {
    const msg = broken((c) => { c.places.street.hops[1] = { link: 'nr5g' }; });
    expect(msg).toContain('content/places/street/place.ts › hops[1].link: "nr5g" is not a technology. Did you mean "nr"?');
  });

  it('catches hops and links out of order', () => {
    const msg = broken((c) => { c.places.home.hops.splice(1, 1); });
    expect(msg).toMatch(/place\.ts › hops\[1\]: expected a link/);
  });

  it('names unknown layout instances', () => {
    const msg = broken((c) => { c.places.home.layout!.overview!.landscape!.nodes!.phnoe = [1, 2, 3]; });
    expect(msg).toContain('layout.overview.landscape.nodes.phnoe: "phnoe" is not a hop in any route of "watch-video". Did you mean "phone"?');
  });

  it('keeps prop spots (the era flavour, #59) to a place’s overview', () => {
    const msg = broken((c) => {
      c.segments['isp-to-cdn'].layout!.internet!.landscape!.props = { shelf: [1, 2, 3, 4] };
      c.places.home.layout!.overview!.portrait!.props = { wall: [1, 2, 3, 4] };
    });
    expect(msg).toContain('layout.internet.landscape.props: prop spots belong in a place\'s overview');
    expect(msg).not.toContain('overview.portrait.props');
  });

  it('checks owners: known ids on hops and layout signs, and a name', () => {
    const msg = broken((c) => {
      (c.segments['isp-to-cdn'].hops[0] as { owner?: string }).owner = 'ips';
      c.segments['isp-to-cdn'].layout!.internet!.landscape!.owners!.cnd = [1, 2];
      c.owners.acme = { ...c.owners.isp, id: 'acme', file: 'content/owners/acme/owner.ts' };
    });
    expect(msg).toContain('hops[0].owner: "ips" is not an owner. Did you mean "isp"?');
    expect(msg).toContain('owners.cnd: "cnd" is not an owner. Did you mean "cdn"?');
    expect(msg).toContain('missing English string "owner.acme.name"');
  });

  it('checks groups: networks, listed once, and a group inside another one listed before it', () => {
    const groups = (g: Content['activities'][string]['groups']) => broken((c) => { c.activities['watch-video'].groups = g; });
    expect(groups([{ id: 'datacentre', in: 'internet' }, 'internet'])).toContain('watch-video/activity.ts › groups[0].in: "internet" is not a group listed before "datacentre"');
    expect(groups(['internet', { id: 'cdn', in: 'internet' }])).toContain('groups[1].id: ');
    expect(groups(['internet', 'datacentre', { id: 'datacentre', in: 'internet' }])).toContain('groups[2].id: "datacentre" is listed twice');
  });

  it('checks a group drawn by another node (#59): a known network node', () => {
    const groups = (g: Content['activities'][string]['groups']) => broken((c) => { c.activities['watch-video-1995'].groups = g; });
    expect(groups(['internet', { id: 'datacentre', in: 'internet', node: 'datacenter' }])).toContain('watch-video-1995/activity.ts › groups[1].node: "datacenter" is not a node. Did you mean "datacentre"?');
    expect(groups(['internet', { id: 'datacentre', in: 'internet', node: 'cdn' }])).toContain('groups[1].node: "cdn" is a ');
  });

  it('checks activity and segment variants (#59): a known base, one level deep, one an era, and the same slots', () => {
    const v = 'content/activities/watch-video-2010/activity.ts';
    expect(broken((c) => { c.activities['watch-video-2010'].variantOf = 'watch-vidoe'; })).toContain(`${v} › variantOf: "watch-vidoe" is not an activity. Did you mean "watch-video"?`);
    expect(broken((c) => { c.activities['watch-video-2010'].variantOf = 'watch-video-1995'; })).toContain(`${v} › variantOf: "watch-video-1995" is itself a variant of "watch-video"; use "watch-video"`);
    expect(broken((c) => { delete c.activities['watch-video-2010'].era; })).toContain(`${v} › era: a variant is for an era`);
    expect(broken((c) => { c.activities['watch-video-2010'].era = '1995'; })).toContain(`${v} › era: "watch-video-1995" is already the variant of "watch-video" for the era "1995"`);
    expect(broken((c) => { c.activities['watch-video'].era = '1995'; })).toContain('watch-video/activity.ts › era: only a variant has an era');
    expect(broken((c) => { c.activities['watch-video-2010'].route = [{ place: 'me', default: 'home', only: ['home'] }, ...c.activities['watch-video-2010'].route.slice(1)]; }))
      .toContain(`${v} › route: a variant has the same place slots as its base "watch-video"`);
    const msg = broken((c) => {
      c.segments['datacentre-1995'] = { ...structuredClone(c.segments.datacentre), id: 'datacentre-1995', file: 'content/segments/datacentre-1995/segment.ts', variantOf: 'datacentre', era: '1995' };
      c.activities['watch-video-2010'].route = [c.activities['watch-video-2010'].route[0], { segment: 'isp-to-cdn' }, { segment: 'datacentre-1995' }];
    });
    expect(msg).toContain(`${v} › route[2].segment: "datacentre-1995" is a variant of "datacentre"; name "datacentre" (the route's era picks the variant)`);
    // its words go in its base's block for its era, which loads lazily with the past's other words
    const own = formatProblems(validate({ content, packs, files, locales: { ...locales, '/content/activities/watch-video-2010/locales/en.json': { title: 'A small video' } } }));
    expect(own).toContain('content/activities/watch-video-2010/locales/en.json › strings: a variant has no strings of its own: write them in "2010": { … } in content/activities/watch-video/locales/');
  });

  it('needs a place in every era, so the time machine can go there', () => {
    expect(broken((c) => { c.eras['1985'] = { ...c.eras['1995'], id: '1985', year: 1985, file: 'content/eras/1985/era.ts' }; }))
      .toContain('content/eras/1985/era.ts › era: no place is in the era "1985"');
  });

  it('translates an era’s block wherever its English is, or a reader would get English in the middle of their language (#59)', () => {
    const missing: string[] = [];
    for (const [lang, p] of Object.entries(packs)) {
      if (lang === 'en') continue;
      for (const k of Object.keys(packs.en.strings)) if (/^[a-z]+\.[^.]+\.\d{4}\./.test(k) && !k.startsWith('era.') && !(k in p.strings)) missing.push(`${lang}: ${k}`);
    }
    expect(missing).toEqual([]);
  });

  it('checks place variants: a known base, one level deep, and an access name', () => {
    expect(broken((c) => { c.places['home-dsl'].variantOf = 'hoem'; })).toContain('place.ts › variantOf: "hoem" is not a place. Did you mean "home"?');
    expect(broken((c) => { c.places.desk.variantOf = 'home-dsl'; })).toContain('desk/place.ts › variantOf: "home-dsl" is itself a variant of "home"; use "home"');
    expect(broken((c) => { c.places.lake = { ...c.places.street, id: 'lake', file: 'content/places/lake/place.ts', variantOf: 'desk' }; }))
      .toContain('missing English string "place.lake.access"');
  });

  it('needs a base place to say where it is, in a sentence (the time machine, #59)', () => {
    expect(broken((c) => { c.places.lake = { ...c.places.street, id: 'lake', file: 'content/places/lake/place.ts', era: undefined }; }))
      .toContain('missing English string "place.lake.where"');
  });

  it('groups a place with its variants, base first, in order (the picker shows one place and its ways online)', () => {
    expect([basePlace('home-dsl'), basePlace('home'), basePlace('street')]).toEqual(['home', 'home', 'street']);
    expect(placeFamily('home-dsl')).toEqual(['home', 'home-fttb', 'home-dsl', 'home-dialup']);
    expect(placeFamily('home', ['home-dsl', 'street', 'home'])).toEqual(['home-dsl', 'home']);
    expect(placeFamily('street-2010')).toEqual(['street', 'street-2010']);
    expect(placeFamily('desk')).toEqual(['desk', 'desk-2010']);
  });

  it('checks eras (#59): known, named and described, and two of them or none in a family', () => {
    expect(broken((c) => { c.places['home-dsl'].era = '2001'; })).toContain('home-dsl/place.ts › era: "2001" is not an era. Did you mean "2010"?');
    expect(broken((c) => { delete c.places['home-fttb'].era; })).toContain('home-fttb/place.ts › era: "home" and its ways of getting online have eras, so this needs one too.');
    expect(broken((c) => { c.places.street.era = '2010'; }))
      .toContain('street/place.ts › era: every way of getting online from "street" is in the era "2010"; a time machine needs two eras at least');
    const msg = broken((c) => { c.eras['1985'] = { year: 1985.5, id: '1985', file: 'content/eras/1985/era.ts' }; });
    expect(msg).toContain('content/eras/1985/era.ts › year:');
    expect(msg).toContain('content/eras/1985/era.ts › strings: missing English string "era.1985.name"');
    expect(msg).toContain('missing English string "era.1985" or "era.1985.kid"');
    expect(msg).toContain('missing English string "era.1985.describe.kid"');
  });

  it('asks for missing English strings', () => {
    const msg = broken((c) => { c.nodes.gizmo = { ...c.nodes.phone, id: 'gizmo', file: 'content/nodes/gizmo/node.ts' }; c.layers.zip = { ...c.layers.ip, id: 'zip', file: 'content/layers/zip/layer.ts' }; });
    expect(msg).toContain('content/nodes/gizmo/node.ts › strings: missing English string "node.gizmo.name" (in content/nodes/gizmo/locales/en.json)');
    expect(msg).toContain('content/layers/zip/layer.ts › strings: missing English string "layer.zip.field.ttl.name" or "layer.zip.field.ttl.name.kid"');
  });

  it('checks header fields: unique ids, known facts and codes', () => {
    const msg = broken((c) => {
      const f = c.layers.ip.fields;
      f.push({ ...f[0] });
      f[1] = { ...f[1], value: '{sorce}' };
      f[2] = { ...f[2], value: 'x {inner.ethertipe}' };
      c.layers.tcp.fields = [];
    });
    expect(msg).toContain('content/layers/ip/layer.ts › fields[13]: "version" is already a field of this layer');
    expect(msg).toContain('content/layers/ip/layer.ts › fields[1].value: "{sorce}" is not a fact. Did you mean "src"?');
    expect(msg).toContain('fields[2].value: "{inner.ethertipe}" is not a fact. Did you mean "inner.ethertype"?');
    expect(msg).toContain('content/layers/tcp/layer.ts › fields:');
    expect(broken((c) => { c.layers.ip.fields[0].use = ['routr' as 'router']; })).toContain('content/layers/ip/layer.ts › fields[0].use');
  });

  it('checks layer dives: they exist and explain a layer', () => {
    const layerScene = Object.values(content.scenes).find((s) => s.explains === 'layer')!.id;
    const typo = `${layerScene}x`;
    expect(broken((c) => { c.layers.tcp.dive = typo; })).toContain(`content/layers/tcp/layer.ts › dive: "${typo}" is not a scene. Did you mean "${layerScene}"?`);
    expect(broken((c) => { c.layers.tcp.dive = 'wifi-radio'; })).toContain('content/layers/tcp/layer.ts › dive: "wifi-radio" explains a link; this needs a scene with `explains: \'layer\'`.');
    expect(broken((c) => { c.technologies.wifi.dive = layerScene; })).toContain(`content/technologies/wifi/technology.ts › dive: "${layerScene}" explains a layer; this needs a scene with \`explains: 'link'\`. Known: `);
    expect(broken((c) => { c.places.street.hops[3] = { link: 'metro-fibre', dive: layerScene }; })).toContain('place.ts › hops[3].dive: ');
    expect(broken((c) => { (c.scenes[layerScene] as { explains: string }).explains = 'device'; })).toContain(`content/scenes/${layerScene}/scene.ts › explains:`);
  });

  it('checks device dives: they explain a device, and only a device has one', () => {
    const nodeScene = Object.values(content.scenes).find((s) => s.explains === 'node')!.id;
    expect(broken((c) => { c.nodes.phone.dive = 'wifi-radio'; })).toContain('content/nodes/phone/node.ts › dive: "wifi-radio" explains a link; this needs a scene with `explains: \'node\'`.');
    expect(broken((c) => { c.nodes.internet.dive = nodeScene; })).toContain('content/nodes/internet/node.ts › dive: only a device has a dive (a network is drawn as a group, which opens up instead).');
    expect(broken((c) => { c.technologies.wifi.dive = nodeScene; })).toContain(`content/technologies/wifi/technology.ts › dive: "${nodeScene}" explains a node; this needs a scene with \`explains: 'link'\`.`);
  });

  it('checks spoken descriptions: both levels, short, in every locale file', () => {
    const msg = formatProblems(validate({ content, packs, files, locales: {
      '/content/scenes/wifi-radio/locales/da.json': { describe: { kid: 'En bølge.' }, role: { nat: { describe: { kid: 'x', nerd: 'y'.repeat(401), kids: 'z' } } } },
      '/content/places/home/locales/en.json': { describe: 'A house.' },
    } }));
    expect(msg).toContain('content/scenes/wifi-radio/locales/da.json › describe.nerd:');
    expect(msg).toContain('content/scenes/wifi-radio/locales/da.json › role.nat.describe.nerd:');
    expect(msg).toContain('content/scenes/wifi-radio/locales/da.json › role.nat.describe:');
    expect(msg).toContain('content/places/home/locales/en.json › describe:');
  });

  it('checks schemas and learn-more links', () => {
    const msg = broken((c) => { (c.nodes.phone as { role: string }).role = 'modem'; c.nodes.phone.learnMore = [{ url: 'http://x.org', title: 'x', level: 'kid', lang: 'dk' }]; });
    expect(msg).toContain('content/nodes/phone/node.ts › role:');
    expect(msg).toContain('learnMore[0].url');
    expect(msg).toContain('learnMore[0].lang: "dk" is not a language. Did you mean "da"?');
  });
});
