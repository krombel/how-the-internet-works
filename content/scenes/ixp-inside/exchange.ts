// Pure geometry and timing for the internet exchange dive: BGP notes use the route server, while packets cross the
// shared peering LAN directly from one member port to another.
import { along, type Orient } from '$core/api';
import type { Box, ExchangeLayout, Flow, FlowSpec, Member, Note, Parcel, Pt, Tag } from './types';

export const PERIOD = 8;
export const MEMBERS: Member[] = ['before', 'other1', 'other2', 'other3', 'other4', 'after'];

export const OTHER_FLOWS: FlowSpec[] = [
  { from: 'other1', to: 'other4', phase: 0.06, still: 0.58, colour: 'var(--teal)' },
  { from: 'other2', to: 'after', phase: 0.28, still: 0.68, colour: 'var(--orange)' },
  { from: 'before', to: 'other3', phase: 0.50, still: 0.78, colour: 'var(--berry)' },
  { from: 'other4', to: 'other2', phase: 0.72, still: 0.88, colour: 'var(--leaf)' },
];

const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
export const centre = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
export const around = (p: Pt, w: number, h: number): Box => box(p.x - w / 2, p.y - h / 2, w, h);
const tag = (x: number, y: number, anchor: Tag['anchor'] = 'middle'): Tag => ({ x, y, anchor });
const OTHERS: Member[] = MEMBERS.filter((m) => m !== 'before' && m !== 'after');

function memberBoxes(members: Record<Member, Pt>, nodeSize: number, w: number, h: number) {
  return Object.fromEntries(MEMBERS.map((m) => [m, OTHERS.includes(m) ? around(members[m], w, h) : around(members[m], nodeSize, nodeSize)])) as Record<Member, Box>;
}

/** The exchange's floor plan. Short landscape keeps the same plan with bigger, fewer words. Landscape: the fabric runs
 *  left to right between your ISP's router and the video company's, the route server hangs above it on its own cable
 *  and the other members plug in from below. Portrait: the fabric stands up the middle, your parcel rises through it,
 *  the route server plugs in from the left and the other members from the right. */
export function exchangeLayout(o: Orient): ExchangeLayout {
  if (o === 'portrait') {
    const fabric = box(360, 520, 150, 800), cx = 435, right = fabric.x + fabric.w;
    const ys = [620, 820, 1020, 1220];
    const members = { before: { x: cx, y: 1420 }, after: { x: cx, y: 260 }, ...Object.fromEntries(OTHERS.map((m, i) => [m, { x: 720, y: ys[i] }])) } as Record<Member, Pt>;
    const routeServer = box(50, 600, 250, 100);
    return {
      fabric, vertical: true, routeServer, serverCable: [{ x: 300, y: 650 }, { x: fabric.x, y: 650 }],
      members, memberBoxes: memberBoxes(members, 150, 150, 90),
      ports: { before: { x: cx, y: fabric.y + fabric.h }, after: { x: cx, y: fabric.y }, ...Object.fromEntries(OTHERS.map((m, i) => [m, { x: right, y: ys[i] }])) } as Record<Member, Pt>,
      inPort: { x: cx, y: 1590 }, outPort: { x: cx, y: 30 }, nodeSize: 150, still: 0.45,
      fabricLabel: tag(150, 1010), straightTag: tag(330, 1130),
      serverLabel: tag(175, 578), serverLine: tag(175, 742),
      inLabel: tag(530, 1432, 'start'), outLabel: tag(530, 272, 'start'),
      inTech: tag(410, 1560, 'end'), outTech: tag(410, 100, 'end'),
      othersLabel: tag(720, 1325),
    };
  }
  const fabric = box(260, 440, 1080, 110), cy = 495, bottom = fabric.y + fabric.h;
  const xs = [430, 660, 940, 1170];
  const members = { before: { x: 130, y: cy }, after: { x: 1470, y: cy }, ...Object.fromEntries(OTHERS.map((m, i) => [m, { x: xs[i], y: 720 }])) } as Record<Member, Pt>;
  const routeServer = box(650, 170, 300, 110);
  return {
    fabric, vertical: false, routeServer, serverCable: [{ x: 800, y: routeServer.y + routeServer.h }, { x: 800, y: fabric.y }],
    members, memberBoxes: memberBoxes(members, 160, 170, 108),
    ports: { before: { x: fabric.x, y: cy }, after: { x: fabric.x + fabric.w, y: cy }, ...Object.fromEntries(OTHERS.map((m, i) => [m, { x: xs[i], y: bottom }])) } as Record<Member, Pt>,
    inPort: { x: 45, y: cy }, outPort: { x: 1555, y: cy }, nodeSize: 160, still: 0.62,
    fabricLabel: tag(1325, 420, 'end'), straightTag: tag(530, 420),
    serverLabel: tag(975, 222, 'start'), serverLine: tag(975, 256, 'start'),
    inLabel: tag(130, 628), outLabel: tag(1470, 628),
    inTech: tag(130, 392), outTech: tag(1470, 392),
    othersLabel: tag(800, 818),
  };
}

export const wire = (a: Pt, b: Pt) => `M${a.x} ${a.y} L${b.x} ${b.y}`;
export const serverPoint = (L: ExchangeLayout): Pt => centre(L.routeServer);
export const portLink = (L: ExchangeLayout, m: Member): [Pt, Pt] => [L.members[m], L.ports[m]];
export const parcelPath = (L: ExchangeLayout): Pt[] => [L.inPort, L.members.before, L.ports.before, L.ports.after, L.members.after, L.outPort];
export const flowPath = (L: ExchangeLayout, f: FlowSpec): Pt[] => [L.members[f.from], L.ports[f.from], L.ports[f.to], L.members[f.to]];
/** A route note rides the member's cable to the fabric, across it to the route server's port, and up its cable. */
export function notePath(L: ExchangeLayout, member: Member, direction: 'up' | 'down'): Pt[] {
  const up = [L.members[member], L.ports[member], L.serverCable[1], L.serverCable[0], serverPoint(L)];
  return direction === 'up' ? up : up.reverse();
}

function fade(f: number, peak = 1) { return Math.min(peak, f / 0.08, (1 - f) / 0.08); }
function windowed(u: number, start: number, end: number) {
  if (u < start || u > end) return null;
  return (u - start) / (end - start);
}

export function parcelAt(t: number, still: boolean, L: ExchangeLayout): Parcel {
  const f = still ? L.still : Math.max(0, Math.min(1, (((t / PERIOD) % 1) - 0.50) / 0.45));
  const hidden = !still && ((t / PERIOD) % 1) < 0.50;
  const { p, seg } = along(parcelPath(L), f);
  const stage = seg <= 1 ? 'in' : seg >= 3 ? 'out' : 'fabric';
  return { p, stage, alpha: hidden ? 0 : fade(f), from: 'before', to: 'after' };
}

export function notesAt(t: number, still: boolean, L: ExchangeLayout): Note[] {
  if (still) return [];
  const phase = ((t / PERIOD) % 1 + 1) % 1;
  return MEMBERS.flatMap((member, i) => {
    const stagger = i * 0.014;
    const up = windowed(phase, 0.04 + stagger, 0.28 + stagger);
    const down = windowed(phase, 0.27 + stagger, 0.49 + stagger);
    const notes: Note[] = [];
    if (up !== null) notes.push({ ...along(notePath(L, member, 'up'), up), alpha: fade(up, 0.85), stage: 'to-server', member, direction: 'up' });
    if (down !== null) notes.push({ ...along(notePath(L, member, 'down'), down), alpha: fade(down, 0.85), stage: 'from-server', member, direction: 'down' });
    return notes;
  });
}

export function otherFlowAt(t: number, still: boolean, L: ExchangeLayout, spec: FlowSpec): Flow {
  const f = still ? spec.still : (t / PERIOD + spec.phase) % 1;
  return { ...along(flowPath(L, spec), f), alpha: fade(f, 0.58), stage: 'fabric', from: spec.from, to: spec.to, colour: spec.colour };
}
