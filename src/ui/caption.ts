// What the caption says for a location: title, kid/nerd text, a gesture hint, the doors you can open from here and
// learn-more links (issue #4). Text is
// looked up from the most specific source to the least: the places and segments on the route (they can say something
// about a stop in their context), then the node, technology or scene itself.
import type { LearnMore, Level, Orient } from '../define';
import { doorsOf } from '../model/doors';
import { pathScene, type PathScene } from '../model/layout';
import type { Route } from '../model/resolve';
import { opens } from '../model/stack';
import { downFrom, sceneRef, upFrom, type SceneRef } from '../model/tree';
import { fill, loc, nameOf, routeKeys, tr, trFirst, trl, yours } from '../state.svelte';

/** A door to open from the caption, by verb: look inside a link's technology or open up a group (doors of the path
 *  scene, by id), or in a dive go down from an envelope to the signal that carries it and up again (by path). */
export interface CaptionDoor { kind: 'dive' | 'expand' | 'down' | 'up'; id: string; name: string; path?: string[] }
export interface CaptionText { title: string; body: string; hint: string; doors: CaptionDoor[]; links: LearnMore[] }

/** The doors of a path scene (all of them; at a stop only that stop's own), named. Changing place has its own chip.
 *  Links of the same technology share one chip (the first); their badges on the map open the others. */
function captionDoors(ps: PathScene, root: boolean, stop: string | null): CaptionDoor[] {
  const out: CaptionDoor[] = [];
  for (const d of doorsOf(ps, root)) {
    if (d.kind === 'swap' || (stop && d.id !== stop)) continue;
    const l = d.kind === 'dive' ? ps.links.find((k) => k.id === d.id) : null;
    const name = l ? tr(`tech.${l.link.tech.id}.name`) : tr(`node.${ps.nodes.find((k) => k.id === d.id)!.node.id}.name`);
    if (out.some((o) => o.kind === d.kind && o.name === name)) continue;
    out.push({ kind: d.kind, id: d.id, name });
  }
  return out;
}

/** A layer dive's text, most specific first: at this kind of node, for its role, sealed (when it can't open the
 *  layer), then the scene's own; each first for this layer (a scene may serve several), then for any; with {hop},
 *  {yours} and {layer} filled in. */
function layerText(r: Route, ref: SceneRef, suffix: string, level?: Level) {
  const at = ref.at!, hop = r.hops[at.hop], base = `scene.${ref.dive}`, end = suffix ? `.${suffix}` : '';
  const chain = (b: string) => [`${b}.at.${hop.node.id}`, `${b}.role.${hop.role}`, ...(opens(r, at.layer, hop.role) ? [] : [`${b}.sealed`]), b];
  const keys = [...chain(`${base}.${at.layer}`), ...chain(base)];
  const vars = { hop: nameOf(hop), yours: yours(r.chain[0]), layer: trl(`layer.${at.layer}.name`) };
  return fill(trFirst(keys.map((k) => k + end), level), vars);
}

/** The title of a scene (for the breadcrumb and the caption). */
export function sceneTitle(r: Route, path: string[], o: Orient): string {
  const ref = sceneRef(r, path, o);
  if (!ref || path.length === 0) return tr(`activity.${r.activity.id}.title`);
  if (ref.kind === 'path') {
    const g = r.hops[ref.group!];
    return trFirst([...routeKeys(`inside.${g.id}.title`), `node.${g.node.id}.inside.title`, `node.${g.node.id}.name`]);
  }
  if (ref.kind === 'layer') return layerText(r, ref, 'title');
  const tech = ref.link!.link.tech.id;
  return trFirst([`scene.${ref.dive}.${tech}.title`, `scene.${ref.dive}.title`]);
}

export function captionFor(r: Route, path: string[], stop: string | null, o: Orient): CaptionText {
  const ref = sceneRef(r, path, o);
  const lv = loc.level;
  if (!ref) return { title: '', body: '', hint: '', doors: [], links: [] };
  const c = r.content;
  if (ref.kind === 'layer') {
    const down = downFrom(r, ref);
    return {
      title: sceneTitle(r, path, o),
      body: layerText(r, ref, '', lv),
      hint: tr('hint.layer'),
      doors: down ? [{ kind: 'down', id: down.join('/'), name: sceneTitle(r, down, o), path: down }] : [],
      links: learnMore([...(c.scenes[ref.dive!]?.learnMore ?? []), ...(c.layers[ref.at!.layer]?.learnMore ?? [])]),
    };
  }
  if (ref.kind === 'dive') {
    const tech = ref.link!.link.tech;
    return {
      title: sceneTitle(r, path, o),
      body: trFirst([`scene.${ref.dive}.${tech.id}`, `scene.${ref.dive}`], lv),
      hint: tr('hint.zoomOut'),
      doors: upFrom(r, ref).map((u) => ({ kind: 'up', id: u.path.join('/'), name: trl(`layer.${u.layer}.name`), path: u.path })),
      links: learnMore([...(c.scenes[ref.dive!]?.learnMore ?? []), ...(tech.learnMore ?? [])]),
    };
  }
  const ps = pathScene(r, ref.group, o);
  const n = stop ? ps.nodes.find((k) => k.id === stop) : null;
  const l = stop && !n ? ps.links.find((k) => k.id === stop) : null;
  const doors = captionDoors(ps, path.length === 0, n || l ? stop : null);
  if (n) return {
    title: tr(`node.${n.node.id}.name`),
    body: trFirst([...routeKeys(`stop.${n.id}`), `node.${n.node.id}`], lv),
    hint: tr(n.kind === 'group' ? 'hint.expand' : 'hint.step'),
    doors,
    links: learnMore(n.node.learnMore ?? []),
  };
  if (l) return {
    title: tr(`tech.${l.link.tech.id}.name`),
    body: trFirst([...routeKeys(`stop.${l.id}`), `tech.${l.link.tech.id}`], lv),
    hint: tr(l.dive ? 'hint.dive' : 'hint.step'),
    doors,
    links: learnMore(l.link.tech.learnMore ?? []),
  };
  if (ref.group) {
    const g = r.hops[ref.group];
    return {
      title: sceneTitle(r, path, o),
      body: trFirst([...routeKeys(`inside.${g.id}`), `node.${g.node.id}.inside`], lv),
      hint: tr('hint.group'),
      doors,
      links: learnMore(g.node.learnMore ?? []),
    };
  }
  const places = r.slots.map((s) => c.places[s.place]);
  return {
    title: sceneTitle(r, [], o),
    body: [tr(`activity.${r.activity.id}.${lv}`), ...places.map((p) => trFirst([`place.${p.id}`], lv))].filter(Boolean).join(' '),
    hint: tr('hint.overview'),
    doors,
    links: learnMore([...(r.activity.learnMore ?? []), ...places.flatMap((p) => p.learnMore ?? [])]),
  };
}

/** Links for the reader's level; in their own language if there are any (English nerd links stay), else English. */
export function learnMore(all: LearnMore[], lang = loc.lang, level = loc.level, max = 3): LearnMore[] {
  const fit = all.filter((l) => l.level === 'both' || l.level === level);
  const own = fit.filter((l) => l.lang === lang);
  const en = lang === 'en' ? [] : fit.filter((l) => l.lang === 'en' && !(own.length && l.level !== 'nerd'));
  const seen = new Set<string>();
  return [...own, ...en].filter((l) => !seen.has(l.url) && seen.add(l.url)).slice(0, max);
}
