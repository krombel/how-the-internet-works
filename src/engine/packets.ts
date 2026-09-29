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

const memo = new WeakMap<PathScene, PacketSpec[]>();
export function specsFor(ps: PathScene, flows: FlowDef[]): PacketSpec[] {
  let s = memo.get(ps);
  if (s) return s;
  const g = ps.group !== null;
  s = flows.flatMap((f) => f.packets.map((p) => {
    const route = p.dir === 'up' ? ps.route : [...ps.route].reverse();
    const duration = p.pace * route.length * (g ? GROUP_PACE : 1);
    return {
      flow: f.id, kind: p.kind, dir: p.dir, colour: p.colour, route, duration,
      every: p.every ? p.every * (g ? GROUP_EVERY : 1) : duration, offset: (p.offset ?? 0) * (g ? 2 : 1),
    };
  }));
  memo.set(ps, s);
  return s;
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
