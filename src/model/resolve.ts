// The resolver: (activity + chosen places) → a Route (the chain of hops and links a packet travels), and the
// recursive scene tree on top of it (root path scene → group sub-paths → dives). Pure and content-id free.
import type { ActivityDef, HopDef, LinkDef, NodeDef, PlaceDef, Role, SegmentDef, TechDef } from '../define';
import { activityIds, content as defaultContent, placeIds, type Content, type WithId } from './registry';

export interface Choice { activity: string; places: string[] }

/** Where a hop or link was defined: "place.home" or "segment.isp-to-cdn" (also its string namespace). */
export type Source = string;

export interface Hop {
  id: string;
  node: WithId<NodeDef>;
  /** The group node it lives inside, or null at the top level. */
  group: string | null;
  role: Role;
  addr?: string;
  /** NAT: the client's outside address, and its outside port if the NAT rewrites the port too. */
  natTo?: string;
  natPort?: number;
  /** Who runs it (an owner id). */
  owner?: string;
  source: Source;
  /** Index of the place slot it came from (null for fixed segments and groups). */
  slot: number | null;
  /** Position in the chain (-1 for side branches and group nodes). */
  index: number;
}

export interface Link {
  /** "<from>-<to>" instance ids. */
  id: string;
  from: string; to: string;
  tech: WithId<TechDef>;
  /** Lower layers for this link, outermost first. */
  stack: string[];
  dive: string | null;
  /** Roughly how long it is, in km. */
  km?: number;
  source: Source;
  slot: number | null;
  /** Joins chain[index] → chain[index + 1]; -1 for side branches. */
  index: number;
  aside: boolean;
}

interface Slot { name: string; options: string[]; place: string }

export interface Route {
  key: string;
  activity: WithId<ActivityDef>;
  slots: Slot[];
  /** Segment-like sources in route order (places and segments), for layout and strings. */
  sources: { id: Source; def: SegmentDef }[];
  chain: Hop[];
  links: Link[];
  asides: { hop: Hop; link: Link }[];
  groups: Hop[];
  /** Every hop by instance id (chain, asides and groups). */
  hops: Record<string, Hop>;
  /** Group → the node standing for "where you came from" when it's expanded. */
  entry: Record<string, { id: string; node: WithId<NodeDef>; hop: Hop }>;
  content: Content;
}

export const isLink = (h: HopDef | LinkDef): h is LinkDef => 'link' in h;

/** Options for each place slot of an activity (restricted by `only`, sorted by the places' order). */
function slotsOf(activity: ActivityDef, c: Content = defaultContent) {
  const all = placeIds(c);
  return activity.route.flatMap((s) => ('place' in s ? [{ name: s.place, options: s.only ? all.filter((p) => s.only!.includes(p)) : all, default: s.default }] : []));
}

/** Fill in missing or unknown places with each slot's default. */
export function normaliseChoice(choice: Choice, c: Content = defaultContent): Choice {
  const aid = c.activities[choice.activity] ? choice.activity : activityIds(c)[0];
  const activity = c.activities[aid];
  const places = slotsOf(activity, c).map((s, i) => {
    const p = choice.places[i];
    return p && s.options.includes(p) ? p : s.default && s.options.includes(s.default) ? s.default : s.options[0];
  });
  return { activity: aid, places };
}

const cache = new Map<string, Route>();

export function resolveRoute(choice: Choice, c: Content = defaultContent): Route {
  const ch = normaliseChoice(choice, c);
  const key = `${ch.activity}/${ch.places.join('+')}`;
  const hit = c === defaultContent ? cache.get(key) : undefined;
  if (hit) return hit;

  const activity = c.activities[ch.activity];
  const slots: Slot[] = slotsOf(activity, c).map((s, i) => ({ name: s.name, options: s.options, place: ch.places[i] }));
  const sources: { id: Source; def: SegmentDef | PlaceDef; slot: number | null }[] = [];
  let si = 0;
  for (const step of activity.route) {
    if ('place' in step) { const p = ch.places[si]; sources.push({ id: `place.${p}`, def: c.places[p], slot: si++ }); }
    else sources.push({ id: `segment.${step.segment}`, def: c.segments[step.segment], slot: null });
  }

  const chain: Hop[] = [], links: Link[] = [], hops: Record<string, Hop> = {};
  const mkHop = (h: HopDef, source: Source, slot: number | null, index: number): Hop => {
    const node = c.nodes[h.node ?? h.at];
    const [natTo, port] = h.natTo?.split(':') ?? [];
    return {
      id: h.at, node, group: h.in ?? null, role: h.role ?? node.role ?? 'router', addr: h.addr, natTo, natPort: port ? Number(port) : undefined,
      owner: h.owner, source, slot, index,
    };
  };
  const mkLink = (l: LinkDef, from: string, to: string, source: Source, slot: number | null, index: number, aside = false): Link => {
    const tech = c.technologies[l.link];
    const dive = l.dive === false ? null : l.dive ?? tech.dive ?? null;
    return { id: `${from}-${to}`, from, to, tech, stack: l.stack ?? tech.stack, dive, km: l.km, source, slot, index, aside };
  };

  let pending: { def: LinkDef; source: Source; slot: number | null } | null = null;
  for (const src of sources) {
    for (const item of src.def.hops) {
      if (isLink(item)) { pending = { def: item, source: src.id, slot: src.slot }; continue; }
      const hop = mkHop(item, src.id, src.slot, chain.length);
      if (pending) {
        const prev = chain[chain.length - 1];
        links.push(mkLink(pending.def, prev.id, hop.id, pending.source, pending.slot, chain.length - 1));
        pending = null;
      }
      chain.push(hop);
      hops[hop.id] = hop;
    }
  }

  const asides: Route['asides'] = [];
  for (const src of sources) {
    for (const a of src.def.aside ?? []) {
      const hop = mkHop(a, src.id, src.slot, -1);
      hops[hop.id] = hop;
      asides.push({ hop, link: mkLink({ link: a.link }, a.from, a.at, src.id, src.slot, -1, true) });
    }
  }

  const groups: Hop[] = (activity.groups ?? []).map((g) => {
    const node = c.nodes[g];
    return { id: g, node, group: null, role: node.role ?? 'router', source: `activity.${ch.activity}`, slot: null, index: -1 };
  });
  for (const g of groups) hops[g.id] = g;

  const entry: Route['entry'] = {};
  for (const g of groups) {
    const first = chain.findIndex((h) => h.group === g.id);
    if (first <= 0) continue;
    const before = chain[first - 1];
    // the segment that leads into the group may name a stand-in (e.g. the whole house instead of the router)
    const named = sources.find((s) => s.id === before.source)?.def.entry?.[g.id];
    const node = named ? c.nodes[named] : before.node;
    entry[g.id] = { id: named ?? before.id, node, hop: before };
  }

  const route: Route = {
    key, activity, slots, sources: sources.map(({ id, def }) => ({ id, def })),
    chain, links, asides, groups, hops, entry, content: c,
  };
  if (c === defaultContent) cache.set(key, route);
  return route;
}

/** String namespaces for captions, most specific first: the places, the segments, then the activity. */
export function stringSources(r: Route): Source[] {
  const places = r.sources.filter((s) => s.id.startsWith('place.')).map((s) => s.id);
  const segments = r.sources.filter((s) => s.id.startsWith('segment.')).map((s) => s.id);
  return [...places, ...segments, `activity.${r.activity.id}`];
}
