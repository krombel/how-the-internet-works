// Reactive app state: language/level, the current location + resolved route, style + sound settings (the style is
// synced to the URL query), the active theme, and the view (viewport, orientation, clock) shared with scenes.
import type { Level, Orient } from './define';
import type { Viewport } from './engine/camera';
import { sfx } from './engine/sound';
import { clearMeasureCache } from './engine/svg';
import type { Loc } from './model/location';
import { resolveRoute, stringSources, type Hop, type Route } from './model/resolve';
import { firstOf, loadLayerStrings as loadLayers, lookup, lookupLevel, packs } from './model/strings';
import { defineTheme } from './render/art-base';
import type { Theme } from './render/theme-types';

// ------------------------------------------------------------------ language + level
const storedLevel = localStorage.getItem('level');
export const loc = $state<{ lang: string; level: Level }>({ lang: 'en', level: storedLevel === 'nerd' ? 'nerd' : 'kid' });

export function setLang(lang: string) {
  if (lang === loc.lang && document.documentElement.lang === lang) return;
  loc.lang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = packs[lang]?.meta.dir ?? 'ltr';
  clearMeasureCache();
}
export function setLevel(l: Level) {
  loc.level = l;
  localStorage.setItem('level', l);
}
const q = new URLSearchParams(location.search);
if (q.get('level') === 'nerd' || q.get('level') === 'kid') setLevel(q.get('level') as Level);

/** Bumped when more strings arrive (the English layer strings), so text that asked for them too early updates. */
const more = $state({ n: 0 });
let layers: Promise<void> | null = null;
export const loadLayerStrings = () => (layers ??= loadLayers().then(() => { more.n++; }));
/** A UI or content string in the current language (English fallback; the key itself if missing everywhere). */
export const tr = (key: string) => (more.n, lookup(loc.lang, key) ?? key);
/** Level-aware: `key.kid` / `key.nerd`, falling back to `key`. */
export const trl = (key: string, level: Level = loc.level) => (more.n, lookupLevel(loc.lang, key, level) ?? key);
/** The first of several keys (most specific first) that has a string. */
export const trFirst = (keys: string[], level?: Level) => (more.n, firstOf(loc.lang, keys, level) ?? '');
/** Fill {placeholders}. */
export const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

// ------------------------------------------------------------------ where we are
export const nav = $state<{ loc: Loc; route: Route }>({
  loc: { lang: 'en', places: [], activity: '', path: [], stop: null },
  route: resolveRoute({ activity: '', places: [] }),
});
/** Display name of a hop (an instance of a node). */
export const nameOf = (h: Hop | string) => tr(`node.${typeof h === 'string' ? nav.route.hops[h]?.node.id ?? h : h.node.id}.name`);
/** How the text refers to the reader's own device ("your phone"): the node's `yours` string, else its name. */
export const yours = (h: Hop) => lookup(loc.lang, `node.${h.node.id}.yours`) ?? nameOf(h);
/** Strings for an item in the current route: the places and segments may override the item's own text. */
export const routeKeys = (suffix: string) => stringSources(nav.route).map((s) => `${s}.${suffix}`);

// ------------------------------------------------------------------ themes (pluggable folders)
// theme.ts (art, tokens, fonts) is loaded lazily; meta.json (order + switcher swatch) is tiny and eager.
const themeModules = import.meta.glob<{ default: Theme }>('/content/themes/*/theme.ts');
const themeMeta = import.meta.glob<{ order: number; swatch: string }>('/content/themes/*/meta.json', { eager: true, import: 'default' });
const idOf = (p: string) => p.split('/')[3];
const metaOf = (id: string) => themeMeta[`/content/themes/${id}/meta.json`] ?? { order: 99, swatch: '#888' };
export const THEME_IDS = Object.keys(themeModules).map(idOf).sort((a, b) => metaOf(a).order - metaOf(b).order || a.localeCompare(b));
export const themeSwatches: Record<string, string> = Object.fromEntries(THEME_IDS.map((id) => [id, metaOf(id).swatch]));

export interface Settings { style: string; sound: boolean }
const pick = <T extends string>(v: string | null, ok: readonly T[], d: T): T => (v && (ok as readonly string[]).includes(v) ? (v as T) : d);
export const settings = $state<Settings>({
  style: pick(q.get('style'), THEME_IDS, pick(localStorage.getItem('style'), THEME_IDS, THEME_IDS[0])),
  sound: false, // always muted on load
});

/** Write the style back into the query string (hash is left alone); only needed once there is a choice. */
export function syncUrl() {
  const p = new URLSearchParams(location.search);
  if (THEME_IDS.length > 1) p.set('style', settings.style);
  const qs = p.toString();
  const url = `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`;
  if (url !== location.pathname + location.search + location.hash) history.replaceState(history.state, '', url);
  localStorage.setItem('style', settings.style);
}
export function setSound(on: boolean) {
  settings.sound = on;
  sfx.setEnabled(on);
}

const placeholder = defineTheme({
  id: 'loading', themeColor: '#101010', scheme: 'dark', labelMinPx: 12, motion: { speed: 1 },
  timbre: { wave: 'sine', blip: 880, noise: { freq: 900, q: 0.8 }, gain: 0.5, detune: 0, decay: 0.18 },
});
export const themeState = $state<{ current: Theme; ready: boolean }>({ current: placeholder, ready: false });
const loaded = new Map<string, Theme>();

export async function loadTheme(id: string) {
  let th = loaded.get(id);
  if (!th) {
    th = (await themeModules[`/content/themes/${id}/theme.ts`]()).default;
    loaded.set(id, th);
  }
  // Wait for this theme's fonts (declared in its tokens.css), so text measurements and first paint are right.
  // document.fonts.ready doesn't wait for faces nothing uses yet, so request them explicitly (Latin + Arabic).
  document.documentElement.dataset.style = id;
  const cs = getComputedStyle(document.documentElement);
  const fams = [...new Set(['--ui-font', '--heading-font', '--label-font', '--tag-font'].map((v) => cs.getPropertyValue(v).trim()).filter(Boolean))];
  const loads = fams.flatMap((f) => ['Ab', 'عربي'].map((txt) => document.fonts.load(`700 20px ${f}`, txt).catch(() => [])));
  await Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 1500))]);
  clearMeasureCache();
  themeState.current = th;
  themeState.ready = true;
  sfx.timbre = th.timbre;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', th.themeColor);
  document.documentElement.style.colorScheme = th.scheme;
}

// ------------------------------------------------------------------ view (shared with scenes)
const calm = matchMedia('(prefers-reduced-motion: reduce)');
/** `still`: the reader prefers reduced motion (decorative motion, like the doors' breathing, stands still). */
export const view = $state<{ vp: Viewport; orient: Orient; time: number; real: number; followId: string | null; still: boolean }>({
  vp: { w: 1, h: 1, top: 0, bottom: 0 }, orient: 'landscape', time: 0, real: 0, followId: null, still: calm.matches,
});
calm.addEventListener('change', () => (view.still = calm.matches));
