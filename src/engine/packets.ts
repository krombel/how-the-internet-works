// Packet schedule + kinematics, shared by every style. Each activity flow sends packets along a path scene's route
// (up = client → server); a theme's Packet art receives a `Pose` and decides how to draw it.
import type { FlowDef } from '../define';
import type { PathScene, SLink } from '../model/layout';
import { bezier, bezierAngle } from './geometry';
import { easeInOutCubic } from './motion';

export interface PacketSpec { flow: string; kind: string; dir: 'up' | 'down'; colour?: string; route: string[]; duration: number; every: number; offset: number }
export interface Pose {
  x: number; y: number;
  /** Direction of travel (radians, screen-y down). */
  angle: number;
  /** The scene link it is on, its index in the route, and whether it travels the link backwards. */
  link: SLink; seg: number; reverse: boolean;
}
export interface LivePacket { id: string; kind: string; flow: string; dir: 'up' | 'down'; colour?: string; age: number; spec: PacketSpec; pose: Pose }

/** Inside an expanded group the hops are closer together: packets hop a little faster and a little less often. */
const GROUP_PACE = 0.85, GROUP_EVERY = 1.23;

const memo = new WeakMap<PathScene, { slow: number; specs: PacketSpec[] }>();
/** The packets a path scene sends, `slow` times slower than their pace on a slow route (#59). Their spacing stretches
 *  too, so as many are on their way at once. */
export function specsFor(ps: PathScene, flows: FlowDef[], slow = 1): PacketSpec[] {
  const m = memo.get(ps);
  if (m?.slow === slow) return m.specs;
  const g = ps.group !== null;
  const s = flows.flatMap((f) => f.packets.map((p) => {
    const route = p.dir === 'up' ? ps.route : [...ps.route].reverse();
    const duration = p.pace * route.length * (g ? GROUP_PACE : 1) * slow;
    const every = p.every ? p.every * (g ? GROUP_EVERY : 1) * slow : duration;
    return {
      flow: f.id, kind: p.kind, dir: p.dir, colour: p.colour, route, duration,
      every, offset: (p.offset ?? 0) * (g ? 2 : 1) * slow,
    };
  }));
  memo.set(ps, { slow, specs: s });
  return s;
}

/** A packet at `t` along a scene link (0–1 in the link's own, upward direction). */
export function poseOn(ps: PathScene, link: SLink, t: number, dir: 'up' | 'down'): Pose {
  const p = bezier(link, t), reverse = dir === 'down';
  return { x: p.x, y: p.y, angle: bezierAngle(link, t) + (reverse ? Math.PI : 0), link, seg: Math.max(0, ps.route.indexOf(link.id)), reverse };
}

const NEAR = 0.96;
/** Where a caught packet waits at chain hop `hop`: just before it on the link it arrives on (or just after it on the
 *  link it leaves by, at the start). Null if the scene draws neither. */
export function caughtSpot(ps: PathScene, hop: number, dir: 'up' | 'down'): { link: SLink; t: number } | null {
  const up = dir === 'up', on = (i: number) => ps.links.find((l) => l.link.index === i && ps.route.includes(l.id));
  const arrive = on(up ? hop - 1 : hop);
  if (arrive) return { link: arrive, t: up ? NEAR : 1 - NEAR };
  const leave = on(up ? hop : hop - 1);
  return leave ? { link: leave, t: up ? 1 - NEAR : NEAR } : null;
}
function pose(spec: PacketSpec, links: Map<string, SLink>, age: number): Pose | null {
  const f = age / spec.duration;
  if (f < 0 || f >= 1) return null;
  const n = spec.route.length;
  const seg = Math.min(n - 1, Math.floor(f * n));
  const u = f * n - seg;
  const link = links.get(spec.route[seg]);
  if (!link) return null;
  const reverse = spec.dir === 'down';
  // glide along each link: mostly eased, with a little constant speed so packets never quite stop at a node
  const s = u * 0.35 + easeInOutCubic(u) * 0.65;
  const t = reverse ? 1 - s : s;
  const p = bezier(link, t);
  return { x: p.x, y: p.y, angle: bezierAngle(link, t) + (reverse ? Math.PI : 0), link, seg, reverse };
}

/** All packets on their way at `time` in a path scene, with poses. */
export function livePackets(specs: PacketSpec[], links: SLink[], time: number, prefix: string): LivePacket[] {
  const byId = new Map(links.map((l) => [l.id, l]));
  const out: LivePacket[] = [];
  for (const [si, spec] of specs.entries()) {
    if (!spec.route.length) continue;
    const k0 = Math.floor((time - spec.offset - spec.duration) / spec.every);
    const k1 = Math.floor((time - spec.offset) / spec.every);
    for (let k = Math.max(0, k0); k <= k1; k++) {
      const age = time - spec.offset - k * spec.every;
      const p = age >= 0 && age < spec.duration ? pose(spec, byId, age) : null;
      if (p) out.push({ id: `${prefix}:${si}-${k}`, kind: spec.kind, flow: spec.flow, dir: spec.dir, colour: spec.colour, age, spec, pose: p });
    }
  }
  return out;
}

/** The packet nearest a tap (`dist` from a pose, within `r`), each tested where it is and where it was `lag` ago (in
 *  scene time): a finger lands a moment behind a moving packet, so the hit area trails it (#122). */
export function packetNear(packets: LivePacket[], links: SLink[], lag: number, dist: (p: Pose) => number, r: number): LivePacket | null {
  const byId = new Map(links.map((l) => [l.id, l]));
  let best: { p: LivePacket; d: number } | null = null;
  for (const p of packets) {
    const was = pose(p.spec, byId, p.age - lag);
    const d = Math.min(dist(p.pose), was ? dist(was) : Infinity);
    if (d < r && (!best || d < best.d)) best = { p, d };
  }
  return best?.p ?? null;
}

/** Which ways packets are going on a link right now. */
export const trafficOn = (packets: LivePacket[], link: string | undefined) => ({
  up: packets.some((p) => p.dir === 'up' && p.pose.link.id === link),
  down: packets.some((p) => p.dir === 'down' && p.pose.link.id === link),
});
