// Envelope layers (issue #5): every layer is a content folder (layer.ts + locales), reused at every hop where it
// applies. This is the context a layer dive gets for a packet on one link: who reads it next, addresses and ports as
// rewritten by NATs so far, TTL, direction. The full per-field picture is the packet model (./packet.ts).
import type { Level, Role } from '../define';
import { carriesMac, clientAt, frameEnds, opensLayer, ttlAt } from './packet';
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
  /** Ports as they are on this link (when the flow has them). */
  sport?: number;
  dport?: number;
  /** When `to` is a NAT: the client's address and port on its inside and outside. */
  nat: { inside: string; outside: string; insidePort?: number; outsidePort?: number } | null;
  ttl: number;
  /** The link frame arriving on `link` (the packet model's): the hops whose MAC addresses it carries, where it was
   *  written and where it ends. Bridges pass frames on, so these can lie beyond `from` and `to`. */
  frame: { src: Hop; dst: Hop };
  /** The next hop that reads the packet above the link layer: where the frame `to` sends on ends (the hop a router
   *  ARPs for). Null at the end of the route. */
  next: Hop | null;
  /** Whether the links either side of `to` carry MAC addresses at all (a phone line's PPP doesn't). */
  macs: boolean;
  level: Level;
}

export function layerCtx(r: Route, link: Link, flowId: string, kind: string, dir: 'up' | 'down', level: Level): LayerCtx {
  const flow = r.activity.flows.find((f) => f.id === flowId) ?? r.activity.flows[0];
  const a = r.hops[link.from], b = r.hops[link.to];
  const from = dir === 'up' ? a : b, to = dir === 'up' ? b : a;
  const client = r.chain[0], server = r.chain[r.chain.length - 1];
  const i = Math.max(0, link.index);
  const c = clientAt(r, i, flow), srv = server.addr ?? '', sp = flow.ports?.server;
  const inside = to.natTo ? clientAt(r, to.index - 1, flow) : null;
  const outside = to.natTo ? clientAt(r, to.index, flow) : null;
  const out = r.links[dir === 'up' ? to.index : to.index - 1];
  return {
    flow: flow.id, kind, dir, link, from, to, role: to.role, client, server,
    src: dir === 'up' ? c.addr.text : srv, dst: dir === 'up' ? srv : c.addr.text,
    sport: dir === 'up' ? c.port : sp, dport: dir === 'up' ? sp : c.port,
    nat: inside && outside ? { inside: inside.addr.text, outside: outside.addr.text, insidePort: inside.port, outsidePort: outside.port } : null,
    ttl: ttlAt(r, i, dir),
    frame: frameEnds(r, i, dir), next: out ? frameEnds(r, out.index, dir).dst : null,
    macs: [link, out].some((l) => l && carriesMac(r, l)), level,
  };
}

/** Whether a device with this role opens (reads) a layer, or sees it sealed. */
export const opens = (r: Route, layer: string, role: Role) => opensLayer(r.content.layers[layer], role);
