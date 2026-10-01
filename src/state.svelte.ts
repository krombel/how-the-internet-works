// Reactive app state: language/level, the current location + resolved route, style + sound settings (the style is
// synced to the URL query), the active theme, day or night, and the view (viewport, orientation, clock, mode) shared
// with scenes.
import { tick } from 'svelte';
import type { Level, Mode, Orient } from './define';
import type { Viewport } from './engine/camera';
import { sfx } from './engine/sound';
import { clearMeasureCache, textBox } from './engine/svg';
import type { Loc } from './model/location';
import { resolveRoute, stringSources, type Hop, type Route } from './model/resolve';
import { firstOf, languages, loadDiveStrings as loadDives, lookup, lookupLevel, packs } from './model/strings';
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

/** Bumped when more strings arrive (the English dive strings), so text that asked for them too early updates. */
const more = $state({ n: 0 });
let dives: Promise<void> | null = null;
export const loadDiveStrings = () => (dives ??= loadDives().then(() => { more.n++; }));
/** A UI or content string in the current language (English fallback; the key itself if missing everywhere). */
export const tr = (key: string) => (more.n, lookup(loc.lang, key) ?? key);
/** Level-aware: `key.kid` / `key.nerd`, falling back to `key`. */
export const trl = (key: string, level: Level = loc.level) => (more.n, lookupLevel(loc.lang, key, level) ?? key);
/** The first of several keys (most specific first) that has a string. */
export const trFirst = (keys: string[], level?: Level) => (more.n, firstOf(loc.lang, keys, level) ?? '');
/** Fill {placeholders}. */
export const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

// ------------------------------------------------------------------ where we are
// Raw state: the router replaces both wholesale, and a route is resolved once and cached, so `nav.route` stays the
// same object while the route doesn't change (a deep $state would wrap it in a fresh proxy on every navigation).
class Nav {
  loc = $state.raw<Loc>({ lang: 'en', places: [], activity: '', path: [], stop: null });
  route = $state.raw<Route>(resolveRoute({ activity: '', places: [] }));
}
export const nav = new Nav();
/** Display name of a hop (an instance of a node). */
export const nameOf = (h: Hop | string) => tr(`node.${typeof h === 'string' ? nav.route.hops[h]?.node.id ?? h : h.node.id}.name`);
/** How wide a device's name is drawn, at its authored 28 units (in this language and theme). */
export const nameW = (n: { node: { id: string } }) => textBox(tr(`node.${n.node.id}.name`), 28, 'middle', 0.6, '--label-font').w;
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

/** `paused`: the reader stopped all motion (remembered, like the level: it's an access need, WCAG 2.2.2). */
export interface Settings { style: string; sound: boolean; mode: Mode; paused: boolean }
const pick = <T extends string>(v: string | null, ok: readonly T[], d: T): T => (v && (ok as readonly string[]).includes(v) ? (v as T) : d);
export const settings = $state<Settings>({
  style: pick(q.get('style'), THEME_IDS, pick(localStorage.getItem('style'), THEME_IDS, THEME_IDS[0])),
  sound: false, // always muted on load
  mode: 'day', // set below
  paused: localStorage.getItem('paused') === '1',
});

/** Write the style back into the query string (hash is left alone); only needed once there is a choice. A `mode`
 *  already in the query is kept in step with the reader's choice. */
export function syncUrl() {
  const p = new URLSearchParams(location.search);
  if (THEME_IDS.length > 1) p.set('style', settings.style);
  if (p.has('mode')) p.set('mode', settings.mode);
  const qs = p.toString();
  const url = `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`;
  if (url !== location.pathname + location.search + location.hash) history.replaceState(history.state, '', url);
  localStorage.setItem('style', settings.style);
}
export function setPaused(on: boolean) {
  settings.paused = on;
  if (on) localStorage.setItem('paused', '1');
  else localStorage.removeItem('paused');
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
  // document.fonts.ready doesn't wait for faces nothing uses yet, so request them explicitly, with every language's
  // own name as the sample text so each script's faces load. The mode goes on first, so a night reader never sees
  // the day palette while the fonts load.
  applyMode(th);
  document.documentElement.dataset.style = id;
  const cs = getComputedStyle(document.documentElement);
  const fams = [...new Set(['--ui-font', '--heading-font', '--label-font', '--tag-font'].map((v) => cs.getPropertyValue(v).trim()).filter(Boolean))];
  const sample = `Ab${languages.map((l) => l.name).join('')}`;
  const loads = fams.map((f) => document.fonts.load(`700 20px ${f}`, sample).catch(() => []));
  await Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 1500))]);
  clearMeasureCache();
  themeState.current = th;
  themeState.ready = true;
  sfx.timbre = th.timbre;
}

// ------------------------------------------------------------------ view (shared with scenes)
const calm = matchMedia('(prefers-reduced-motion: reduce)');
/** `still`: the reader prefers reduced motion (decorative motion, like the doors' breathing, stands still). */
/** `mode`: day or night (always day when the theme has no night). */
export const view = $state<{ vp: Viewport; orient: Orient; time: number; real: number; followId: string | null; still: boolean; mode: Mode }>({
  vp: { w: 1, h: 1, top: 0, bottom: 0 }, orient: 'landscape', time: 0, real: 0, followId: null, still: calm.matches, mode: 'day',
});
calm.addEventListener('change', () => (view.still = calm.matches));

// ------------------------------------------------------------------ day and night
// The reader's mode follows the OS (prefers-color-scheme) until they pick one with the toggle; `?mode=day|night` in
// the link wins on load. A choice that matches the OS is not stored, so the page goes back to following the OS. The
// engine only sets `data-mode` on <html> (the theme's tokens do the rest) and `view.mode` (for art that adds
// night-only things); a theme without `night` stays in day.
const dark = matchMedia('(prefers-color-scheme: dark)');
const osMode = (): Mode => (dark.matches ? 'night' : 'day');
const asMode = (v: string | null): Mode | null => (v === 'day' || v === 'night' ? v : null);
function remember(m: Mode) {
  settings.mode = m;
  if (m === osMode()) localStorage.removeItem('mode');
  else localStorage.setItem('mode', m);
}
remember(asMode(q.get('mode')) ?? asMode(localStorage.getItem('mode')) ?? osMode());

/** Whether the current theme has a night (the toggle hides when it doesn't). */
export const hasNight = () => !!themeState.current.night;

function applyMode(th = themeState.current) {
  const m: Mode = th.night ? settings.mode : 'day';
  const look = m === 'night' && th.night ? th.night : th;
  view.mode = m;
  document.documentElement.dataset.mode = m;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', look.themeColor);
  document.documentElement.style.colorScheme = look.scheme;
}

/** Switch day ↔ night: a cross-fade of the whole page (a View Transition, styled by the theme), or at once with
 *  prefers-reduced-motion or where View Transitions aren't supported. */
export function setMode(m: Mode) {
  remember(m);
  syncUrl();
  if (view.mode === (hasNight() ? m : 'day')) return;
  if (view.still || !document.startViewTransition) return applyMode();
  document.startViewTransition(async () => { applyMode(); await tick(); });
}
dark.addEventListener('change', () => { if (!localStorage.getItem('mode')) setMode(osMode()); });
