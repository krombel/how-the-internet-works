// `npm run check:content` runs this file: the real content must validate, and authors get readable messages.
import { beforeAll, describe, expect, it } from 'vitest';
import { content, type Content } from './registry';
import { loadAllPacks, packs } from './strings';
import { resolveRoute } from './resolve';
import { childrenOf, sceneRef, sideways } from './tree';
import { coverage, formatProblems, validate } from './validate';

const files = Object.keys(import.meta.glob('/content/*/*/Scene.svelte'));

describe('content', () => {
  beforeAll(loadAllPacks);

  it('validates', () => {
    const problems = validate({ content, packs, files });
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
    for (const activity of Object.keys(content.activities)) for (const place of Object.keys(content.places))
      for (const l of resolveRoute({ activity, places: [place] }).links) {
        if (!l.dive) missing.add(`link ${l.tech.id}`);
        for (const layer of l.stack) if (!content.layers[layer].dive) missing.add(`layer ${layer}`);
      }
    expect([...missing]).toEqual([]);
  });

  it('names neighbouring stretches that dive into the same scene apart, in every language', () => {
    const bad: string[] = [];
    const title = (lang: string, dive: string, tech: string) =>
      packs[lang].strings[`scene.${dive}.${tech}.title`] ?? packs[lang].strings[`scene.${dive}.title`];
    for (const activity of Object.keys(content.activities)) for (const place of Object.keys(content.places)) {
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
            const ta = title(lang, a.dive!, a.link!.link.tech.id), tb = title(lang, b.dive!, b.link!.link.tech.id);
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
    return formatProblems(validate({ content: c, packs, files }));
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
    expect(broken((c) => { (c.scenes[layerScene] as { explains: string }).explains = 'node'; })).toContain(`content/scenes/${layerScene}/scene.ts › explains:`);
  });

  it('checks schemas and learn-more links', () => {
    const msg = broken((c) => { (c.nodes.phone as { role: string }).role = 'modem'; c.nodes.phone.learnMore = [{ url: 'http://x.org', title: 'x', level: 'kid', lang: 'dk' }]; });
    expect(msg).toContain('content/nodes/phone/node.ts › role:');
    expect(msg).toContain('learnMore[0].url');
    expect(msg).toContain('learnMore[0].lang: "dk" is not a language. Did you mean "da"?');
  });
});
