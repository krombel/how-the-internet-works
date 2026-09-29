// Envelope layers (issue #5): every layer is a content folder (layer.ts + Layer.svelte + locales), reused at every hop
// where it applies. This computes, for a packet on one link, the stack of layers (the link's lower layers + the flow's
// upper ones) and the context each layer component gets, so it can decide what to show: sealed or open for the
// device that reads it next, addresses as rewritten by NATs so far, TTL, direction…
import type { Level, Role } from '../define';
import type { Hop, Link, Route } from './resolve';

export interface LayerCtx {
  flow: string;
  /** Packet kind (from the activity's flow), e.g. "request". */
  kind: string;
  /** up = client → server. */
  dir: 'up' | 'down';
  link: Link;
  /** In the direction of travel: `to` reads the packet next. */
  from: Hop;
  to: Hop;
  /** The role of `to`. */
  role: Role;
  client: Hop;
  server: Hop;
  /** IP addresses as they are on this link. */
  src: string;
  dst: string;
  /** When `to` is a NAT: the client's address on its inside and outside. */
  nat: { inside: string; outside: string } | null;
  ttl: number;
  level: Level;
}

export interface StackEntry { id: string; open: boolean }

/** The client's address as seen on chain link `i` (after every NAT it has passed). */
function clientAddrAt(r: Route, i: number): string {
  let a = r.chain[0].addr ?? '';
  for (let k = 1; k <= i && k < r.chain.length; k++) if (r.chain[k].natTo) a = r.chain[k].natTo!;
  return a;
}

const forwards = (h: Hop) => h.role === 'router' || h.role === 'nat';

export function layerCtx(r: Route, link: Link, flow: string, kind: string, dir: 'up' | 'down', level: Level): LayerCtx {
  const a = r.hops[link.from], b = r.hops[link.to];
  const from = dir === 'up' ? a : b, to = dir === 'up' ? b : a;
  const client = r.chain[0], server = r.chain[r.chain.length - 1];
  const i = Math.max(0, link.index);
  const visible = clientAddrAt(r, i), srv = server.addr ?? '';
  const passed = dir === 'up' ? r.chain.slice(1, i + 1) : r.chain.slice(i + 1, -1);
  const nat = to.natTo ? { inside: clientAddrAt(r, to.index - 1), outside: to.natTo } : null;
  return {
    flow, kind, dir, link, from, to, role: to.role, client, server,
    src: dir === 'up' ? visible : srv, dst: dir === 'up' ? srv : visible,
    nat, ttl: 64 - passed.filter(forwards).length, level,
  };
}

/** Whether a device with this role opens (reads) a layer, or sees it sealed. */
export function opens(r: Route, layer: string, role: Role): boolean {
  const openAt = r.content.layers[layer]?.openAt;
  return !openAt || openAt.includes(role);
}

/** Layers on a link, outermost first, each open or sealed for the device that reads it next. */
export function stackOf(r: Route, link: Link, flowStack: string[], role: Role): StackEntry[] {
  return [...link.stack, ...flowStack].map((id) => ({ id, open: opens(r, id, role) }));
}

/** A stable, made-up MAC address for an instance (locally administered range). */
export function fakeMac(id: string): string {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const b = [0x02, (h >>> 24) & 255, (h >>> 16) & 255, (h >>> 8) & 255, h & 255, id.length * 37 & 255];
  return b.map((x) => x.toString(16).padStart(2, '0')).join(':');
}
