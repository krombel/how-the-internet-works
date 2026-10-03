// Locations as URLs: #/<lang>/<place>[+<place>…]/<activity>/<step>/<step>…[/@<stop>]
// e.g. #/da/on-the-go/watch-video/internet/@mobile-core. Pure: parsing, formatting and validation against the content.
import { isLang, FALLBACK } from './strings';
import { normaliseChoice, resolveRoute } from './resolve';
import { pathScene } from './layout';
import { sceneRef, validPrefix } from './tree';
import { content as defaultContent, type Content } from './registry';

export interface Loc { lang: string; places: string[]; activity: string; path: string[]; stop: string | null }

export function parseHash(hash: string, preferredLang?: string): Loc {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [lang, places = '', activity = '', ...rest] = parts;
  const last = rest[rest.length - 1];
  const stop = last?.startsWith('@') ? last.slice(1) : null;
  const pref = preferredLang?.slice(0, 2);
  return {
    lang: isLang(lang) ? lang : isLang(pref) ? pref : FALLBACK,
    places: places ? places.split('+') : [],
    activity,
    path: stop ? rest.slice(0, -1) : rest,
    stop,
  };
}

export function formatHash(l: Loc): string {
  const steps = l.path.map(encodeURIComponent).join('/');
  return `#/${l.lang}/${l.places.join('+')}/${l.activity}${steps ? `/${steps}` : ''}${l.stop ? `/@${encodeURIComponent(l.stop)}` : ''}`;
}

/** Fill in defaults and drop whatever doesn't exist (unknown place → default, stale path → deepest valid prefix). */
export function normaliseLoc(l: Loc, c: Content = defaultContent): Loc {
  const choice = normaliseChoice({ activity: l.activity, places: l.places }, c);
  const r = resolveRoute(choice, c);
  const path = validPrefix(r, l.path);
  const ref = sceneRef(r, path)!;
  const stop = l.stop && path.length === l.path.length && ref.kind === 'path' && pathScene(r, ref.group, 'landscape').stops.includes(l.stop) ? l.stop : null;
  return { lang: l.lang, ...choice, path, stop };
}

