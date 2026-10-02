// Language packs. /content/locales/<lang>/{meta.json, ui.json} makes a language; every content folder carries its
// own strings in <folder>/locales/<lang>.json, auto-namespaced by kind and id ("node.phone.name"), with nested JSON
// flattened ("stop": { "cabinet": … } → "….stop.cabinet"). Anything missing falls back to English.
import packLoaders from 'virtual:string-packs';
import type { Level, LocaleMeta } from '../define';

type Strings = Record<string, string>;
export interface Pack { meta: LocaleMeta; strings: Strings }
export type Json = { [k: string]: string | Json };

export const FALLBACK = 'en';
/** Content folder kind → string key namespace. */
const NAMESPACE: Record<string, string> = {
  nodes: 'node', owners: 'owner', technologies: 'tech', layers: 'layer', scenes: 'scene', segments: 'segment',
  places: 'place', activities: 'activity', themes: 'theme', eras: 'era',
};

function flatten(obj: Json, prefix: string, out: Strings = {}): Strings {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else flatten(v, key, out);
  }
  return out;
}

/** Build all packs from the glob results (paths are absolute from the project root). */
function buildPacks(meta: Record<string, LocaleMeta>, ui: Record<string, Json>, folders: Record<string, Json>): Record<string, Pack> {
  const packs: Record<string, Pack> = {};
  for (const [path, m] of Object.entries(meta)) packs[path.split('/')[3]] = { meta: m, strings: {} };
  for (const [path, data] of Object.entries(ui)) {
    const lang = path.split('/')[3];
    if (packs[lang]) flatten(data, '', packs[lang].strings);
  }
  // /content/<kind>/<id>/locales/<lang>.json
  for (const [path, data] of Object.entries(folders)) {
    const [, , kind, id, , file] = path.split('/');
    const lang = file.replace(/\.json$/, '');
    if (packs[lang] && NAMESPACE[kind]) flatten(data, `${NAMESPACE[kind]}.${id}`, packs[lang].strings);
  }
  return packs;
}

// English (the fallback) ships in the main bundle, but for its dive strings (layers, dive scenes and the time machine's
// eras: `loadDiveStrings`); other languages load when first chosen, one chunk each (the `virtual:string-packs` plugin
// in vite.config.ts), so adding a language costs nothing for everyone else.
export const packs = buildPacks(
  import.meta.glob<LocaleMeta>('/content/locales/*/meta.json', { eager: true, import: 'default' }),
  import.meta.glob<Json>('/content/locales/en/ui.json', { eager: true, import: 'default' }),
  import.meta.glob<Json>(['/content/*/*/locales/en.json', '!/content/layers/*/locales/en.json', '!/content/scenes/*/locales/en.json', '!/content/eras/*/locales/en.json'], { eager: true, import: 'default' }),
);
let divesEn: Promise<void> | null = null;
/** Load the English dive strings (once): the layers', the dive scenes' and the eras', before showing a caught packet, a
 *  dive or the time machine. */
export function loadDiveStrings(): Promise<void> {
  return (divesEn ??= import('virtual:dive-strings').then(({ folders }) => {
    Object.assign(packs[FALLBACK].strings, buildPacks({ [`/content/locales/${FALLBACK}/meta.json`]: packs[FALLBACK].meta }, {}, folders)[FALLBACK].strings);
  }));
}
const loading = new Map<string, Promise<void>>([[FALLBACK, Promise.resolve()]]);

/** Load a language's strings (once). Unknown languages resolve at once (they fall back to English). */
export function loadPack(lang: string): Promise<void> {
  const load = packLoaders[lang];
  if (!packs[lang] || !load) return Promise.resolve();
  let p = loading.get(lang);
  if (!p) {
    p = load().then(({ ui, folders }) => {
      const built = buildPacks({ [`/content/locales/${lang}/meta.json`]: packs[lang].meta }, ui, folders);
      Object.assign(packs[lang].strings, built[lang].strings);
    });
    loading.set(lang, p);
  }
  return p;
}
export const loadAllPacks = () => Promise.all([loadDiveStrings(), ...Object.keys(packs).map(loadPack)]).then(() => packs);

export const languages = Object.keys(packs)
  .sort((a, b) => (a === FALLBACK ? -1 : b === FALLBACK ? 1 : a.localeCompare(b)))
  .map((code) => ({ code, ...packs[code].meta }));
export const isLang = (l: string | undefined): l is string => !!l && l in packs;

/** The string for `key` in `lang`, else English, else undefined. */
export function lookup(lang: string, key: string, from: Record<string, Pack> = packs): string | undefined {
  return from[lang]?.strings[key] ?? from[FALLBACK]?.strings[key];
}

/** Level-aware: `key.<level>` in the language, then in English, then the level-less `key` (language, English). */
export function lookupLevel(lang: string, key: string, level: Level, from: Record<string, Pack> = packs): string | undefined {
  return lookup(lang, `${key}.${level}`, from) ?? lookup(lang, key, from);
}

/** The first key (most specific first) that has a string. */
export function firstOf(lang: string, keys: string[], level?: Level, from: Record<string, Pack> = packs): string | undefined {
  for (const k of keys) {
    const s = level ? lookupLevel(lang, k, level, from) : lookup(lang, k, from);
    if (s !== undefined) return s;
  }
  return undefined;
}
