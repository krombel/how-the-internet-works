// What the caption says for a location: title, kid/nerd text, a gesture hint and learn-more links (issue #4). Text is
// looked up from the most specific source to the least: the places and segments on the route (they can say something
// about a stop in their context), then the node, technology or scene itself.
import type { LearnMore, Orient } from '../define';
import { pathScene } from '../model/layout';
import type { Route } from '../model/resolve';
import { sceneRef } from '../model/tree';
import { loc, routeKeys, tr, trFirst } from '../state.svelte';

export interface CaptionText { title: string; body: string; hint: string; links: LearnMore[] }

/** The title of a scene (for the breadcrumb and the caption). */
export function sceneTitle(r: Route, path: string[], o: Orient): string {
  const ref = sceneRef(r, path, o);
  if (!ref || path.length === 0) return tr(`activity.${r.activity.id}.title`);
  if (ref.kind === 'path') {
    const g = r.hops[ref.group!];
    return trFirst([...routeKeys(`inside.${g.id}.title`), `node.${g.node.id}.inside.title`, `node.${g.node.id}.name`]);
  }
  const tech = ref.link!.link.tech.id;
  return trFirst([`scene.${ref.dive}.${tech}.title`, `scene.${ref.dive}.title`]);
}

export function captionFor(r: Route, path: string[], stop: string | null, o: Orient): CaptionText {
  const ref = sceneRef(r, path, o);
  const lv = loc.level;
  if (!ref) return { title: '', body: '', hint: '', links: [] };
  const c = r.content;
  if (ref.kind === 'dive') {
    const tech = ref.link!.link.tech;
    return {
      title: sceneTitle(r, path, o),
      body: trFirst([`scene.${ref.dive}.${tech.id}`, `scene.${ref.dive}`], lv),
      hint: tr('hint.zoomOut'),
      links: learnMore([...(c.scenes[ref.dive!]?.learnMore ?? []), ...(tech.learnMore ?? [])]),
    };
  }
  const ps = pathScene(r, ref.group, o);
  const n = stop ? ps.nodes.find((k) => k.id === stop) : null;
  const l = stop && !n ? ps.links.find((k) => k.id === stop) : null;
  if (n) return {
    title: tr(`node.${n.node.id}.name`),
    body: trFirst([...routeKeys(`stop.${n.id}`), `node.${n.node.id}`], lv),
    hint: tr(n.kind === 'group' ? 'hint.expand' : 'hint.step'),
    links: learnMore(n.node.learnMore ?? []),
  };
  if (l) return {
    title: tr(`tech.${l.link.tech.id}.name`),
    body: trFirst([...routeKeys(`stop.${l.id}`), `tech.${l.link.tech.id}`], lv),
    hint: tr(l.dive ? 'hint.dive' : 'hint.step'),
    links: learnMore(l.link.tech.learnMore ?? []),
  };
  if (ref.group) {
    const g = r.hops[ref.group];
    return {
      title: sceneTitle(r, path, o),
      body: trFirst([...routeKeys(`inside.${g.id}`), `node.${g.node.id}.inside`], lv),
      hint: tr('hint.group'),
      links: learnMore(g.node.learnMore ?? []),
    };
  }
  const places = r.slots.map((s) => c.places[s.place]);
  return {
    title: sceneTitle(r, [], o),
    body: [tr(`activity.${r.activity.id}.${lv}`), ...places.map((p) => trFirst([`place.${p.id}`], lv))].filter(Boolean).join(' '),
    hint: tr('hint.overview'),
    links: learnMore([...(r.activity.learnMore ?? []), ...places.flatMap((p) => p.learnMore ?? [])]),
  };
}

/** Links for the reader's level; in their own language if there are any (English nerd links stay), else English. */
function learnMore(all: LearnMore[], lang = loc.lang, level = loc.level, max = 3): LearnMore[] {
  const fit = all.filter((l) => l.level === 'both' || l.level === level);
  const own = fit.filter((l) => l.lang === lang);
  const en = lang === 'en' ? [] : fit.filter((l) => l.lang === 'en' && !(own.length && l.level !== 'nerd'));
  const seen = new Set<string>();
  return [...own, ...en].filter((l) => !seen.has(l.url) && seen.add(l.url)).slice(0, max);
}
