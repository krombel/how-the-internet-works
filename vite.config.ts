import { readdirSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const root = decodeURIComponent(new URL('.', import.meta.url).pathname);

/** `virtual:string-packs`: a loader per language other than English, each loading one chunk with all of that
 *  language's strings (content/locales/<lang>/ui.json + every content/<kind>/<id>/locales/<lang>.json). English ships
 *  in the main bundle as the fallback, so adding a language costs nothing for anyone who doesn't pick it; except its
 *  dive strings (layers: header field names and meanings; dive scenes: their captions and labels), only needed once a
 *  packet is caught or a dive is opened: `virtual:dive-strings` loads them as one chunk. */
function stringPacks(): Plugin {
  const ID = 'virtual:string-packs', PACK = 'virtual:string-pack/', DIVES = 'virtual:dive-strings';
  return {
    name: 'string-packs',
    resolveId: (id) => (id === ID || id === DIVES || id.startsWith(PACK) ? `\0${id}` : undefined),
    load(id) {
      if (id === `\0${DIVES}`) return `export const folders = import.meta.glob(['/content/layers/*/locales/en.json', '/content/scenes/*/locales/en.json'], { eager: true, import: 'default' });\n`;
      if (id === `\0${ID}`) {
        const langs = readdirSync(`${root}content/locales`).filter((l) => l !== 'en' && !l.startsWith('.'));
        return `export default {${langs.map((l) => `${JSON.stringify(l)}: () => import(${JSON.stringify(PACK + l)})`).join(', ')}};`;
      }
      if (id.startsWith(`\0${PACK}`)) {
        const lang = id.slice(PACK.length + 1);
        return `export const ui = import.meta.glob('/content/locales/${lang}/ui.json', { eager: true, import: 'default' });\n`
          + `export const folders = import.meta.glob('/content/*/*/locales/${lang}.json', { eager: true, import: 'default' });\n`;
      }
    },
  };
}

export default defineConfig({
  plugins: [svelte(), stringPacks()],
  resolve: {
    // Content folders import the engine only through $core/api (Svelte side) and $core/define (definition files).
    alias: { $core: `${root}src` },
  },
  build: { target: 'es2022' },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
