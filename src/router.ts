// Browser history for locations: #/<lang>/<place>[+<place>…]/<activity>/<step>…[/@<stop>] (see model/location.ts).
// Scene and place changes push a history entry (Back undoes them); stop and language changes replace it.
import { formatHash, normaliseLoc, parseHash, type Loc } from './model/location';
import { resolveRoute } from './model/resolve';
import { nowEra } from './model/registry';
import { loadPack } from './model/strings';
import { loadPastStrings, nav, setLang } from './state.svelte';

type Listener = (next: Loc, prev: Loc) => void;
const listeners = new Set<Listener>();
const read = () => normaliseLoc(parseHash(location.hash, navigator.language));
let cur = read();

export const current = () => cur;

export function go(partial: Partial<Loc>, replace = false) {
  const next: Loc = { ...cur, ...partial };
  if (('path' in partial || 'activity' in partial) && !('stop' in partial)) next.stop = null;
  const hash = formatHash(normaliseLoc(next));
  if (hash === location.hash) return;
  const url = location.pathname + location.search + hash;
  if (replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
  update();
}

function apply(l: Loc) {
  cur = l;
  // switch language once its strings are here (and only if it's still the one asked for)
  loadPack(l.lang).then(() => { if (cur.lang === l.lang) setLang(l.lang); });
  nav.loc = l;
  nav.route = resolveRoute(l);
  // the words of the past (#59) redraw the text when they arrive; the time machine has them loaded already
  if (nav.route.era !== nowEra()) void loadPastStrings();
}

function update() {
  const next = read(), prev = cur;
  const fixed = formatHash(next);
  if (fixed !== location.hash) history.replaceState(null, '', location.pathname + location.search + fixed);
  if (fixed === formatHash(prev)) return;
  apply(next);
  listeners.forEach((fn) => fn(next, prev));
}

export function onNavigate(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function startRouter() {
  window.addEventListener('popstate', update);
  window.addEventListener('hashchange', update);
  const fixed = formatHash(cur);
  if (fixed !== location.hash) history.replaceState(null, '', location.pathname + location.search + fixed);
  apply(cur);
  return cur;
}
