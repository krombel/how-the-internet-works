// What the caption says for a location: title, kid/nerd text, a gesture hint, the doors you can open from here and
// learn-more links (issue #4). Text is
// looked up from the most specific source to the least: the places and segments on the route (they can say something
// about a stop in their context), then the node, technology or scene itself.
import type { LearnMore, Level, Orient } from '../define';
import { doorsOf } from '../model/doors';
import { carriedBy } from '../model/ladder';
import { pathScene, type PathScene } from '../model/layout';
import type { Route } from '../model/resolve';
import { opens } from '../model/stack';
import { diveRuns, diveSubject, downFrom, nodeDive, parentPath, sceneRef, type SceneRef } from '../model/tree';
import { formatKm, formatLight, groupKm, kmTo, ownersOf, tripKm } from '../model/trip';
import { fill, loc, nameOf, nameW, routeKeys, tr, trFirst, trl, yours } from '../state.svelte';

/** A door to open from the caption, by verb: look inside a link's technology or a device, open up a group (doors of the path
 *  scene, by id), or in a dive go down from an envelope to the signal that carries it and up again (by path). */
export interface CaptionDoor { kind: 'dive' | 'expand' | 'down' | 'up'; id: string; name: string; path?: string[] }
/** `tag`: a line under the title, e.g. that a dive stands for a stretch of links ("3 stretches · via …"). */
export interface CaptionText { title: string; tag?: string; body: string; hint: string; doors: CaptionDoor[]; links: LearnMore[] }

/** The doors of a path scene (all of them; at a stop only that stop's own), named. Changing place has its own chip.
 *  Dives of the same technology name share one chip (the first); their badges on the map open the others. */
function captionDoors(r: Route, ps: PathScene, o: Orient, root: boolean, stop: string | null): CaptionDoor[] {
  const out: CaptionDoor[] = [];
  for (const d of doorsOf(ps, root, diveRuns(r, ps.group, o).byLink, o, nameW)) {
    if (d.kind === 'swap' || (stop && d.id !== stop && !d.links.includes(stop))) continue;
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
  return trFirst([`scene.${ref.dive}.${diveSubject(ref)}.title`, `scene.${ref.dive}.title`]);
}

/** A dive that stands for a stretch of links: how many, the devices on the way, and how long it is. */
function stretchTag(r: Route, ref: SceneRef, o: Orient): string | undefined {
  if (!ref.link) return undefined;
  const group = sceneRef(r, parentPath(ref.path), o)!.group, links = diveRuns(r, group, o).byLink.get(ref.link!.id)!.links;
  if (links.length < 2) return undefined;
  const ps = pathScene(r, group, o), via = links.slice(0, -1).map((l) => tr(`node.${ps.nodes.find((n) => n.id === l.to)!.node.id}.name`));
  const km = links.reduce((s, l) => s + (l.link.km ?? 0), 0);
  return [fill(tr('dive.stretches'), { n: links.length, via: new Intl.ListFormat(loc.lang, { type: 'conjunction' }).format(via) }),
    km ? formatKm(km, loc.lang) : ''].filter(Boolean).join(' · ');
}

/** The scale of where you are (issue #20), from the links' km and the hops' owners: how far the whole trip goes, how
 *  many companies a group's packets pass through, whose box a stop is and how far from you, how long a link is. */
function scaleTag(r: Route, key: string, km: number, owners: string[] = []): string | undefined {
  if (!km && !owners.length) return undefined;
  const vars = { km: formatKm(km, loc.lang), light: formatLight(km, loc.lang), n: owners.length };
  const parts = key === 'hop' ? owners.map((o) => trl(`owner.${o}.name`)) : [];
  if (km) parts.push(fill(trl(`trip.${key}`), vars));
  return parts.join(' · ') || undefined;
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
    return {
      title: sceneTitle(r, path, o),
      tag: stretchTag(r, ref, o),
      body: trFirst([`scene.${ref.dive}.${diveSubject(ref)}`, `scene.${ref.dive}`], lv),
      hint: tr('hint.zoomOut'),
      doors: carriedBy(r, ref, o).map((u) => ({ kind: 'up', id: u.path.join('/'), name: trl(`layer.${u.layer}.name`), path: u.path })),
      links: learnMore([...(c.scenes[ref.dive!]?.learnMore ?? []), ...((ref.link ? ref.link.link.tech : ref.node!.node).learnMore ?? [])]),
    };
  }
  const ps = pathScene(r, ref.group, o);
  const n = stop ? ps.nodes.find((k) => k.id === stop) : null;
  const l = stop && !n ? ps.links.find((k) => k.id === stop) : null;
  const doors = captionDoors(r, ps, o, path.length === 0, n || l ? stop : null);
  if (n) return {
    title: tr(`node.${n.node.id}.name`),
    tag: n.kind === 'group' ? undefined : scaleTag(r, 'hop', kmTo(r, n.hop.index), n.hop.owner ? [n.hop.owner] : []),
    body: trFirst([...routeKeys(`stop.${n.id}`), `node.${n.node.id}`], lv),
    hint: tr(n.kind === 'group' ? 'hint.expand' : nodeDive(n) ? 'hint.dive' : 'hint.step'),
    doors,
    links: learnMore([...(n.node.learnMore ?? []), ...((n.kind !== 'group' && n.hop.owner && c.owners[n.hop.owner]?.learnMore) || [])]),
  };
  if (l) return {
    title: tr(`tech.${l.link.tech.id}.name`),
    tag: scaleTag(r, 'link', l.link.km ?? 0),
    body: trFirst([...routeKeys(`stop.${l.id}`), `tech.${l.link.tech.id}`], lv),
    hint: tr(l.dive ? 'hint.dive' : 'hint.step'),
    doors,
    links: learnMore(l.link.tech.learnMore ?? []),
  };
  if (ref.group) {
    const g = r.hops[ref.group];
    const owners = ownersOf(r, false, g.id);
    return {
      title: sceneTitle(r, path, o),
      tag: owners.length > 1 ? scaleTag(r, 'group', groupKm(r, g.id), owners) : undefined,
      body: trFirst([...routeKeys(`inside.${g.id}`), `node.${g.node.id}.inside`], lv),
      hint: tr('hint.group'),
      doors,
      links: learnMore(g.node.learnMore ?? []),
    };
  }
  const places = r.slots.map((s) => c.places[s.place]);
  return {
    title: sceneTitle(r, [], o),
    tag: scaleTag(r, 'trip', tripKm(r)),
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
