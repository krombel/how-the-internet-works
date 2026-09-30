type Orient = 'landscape' | 'portrait';
export interface Pt { x: number; y: number }

export const trackMatrix = (o: Orient) => (o === 'portrait' ? 'matrix(0 -1 1 0 0 1600)' : '');
export const toScene = (p: Pt, o: Orient): Pt => (o === 'portrait' ? { x: p.y, y: 1600 - p.x } : p);

export const PAIRS = [
  { name: 'orange', colour: '#f28f5b', y: 144 },
  { name: 'green', colour: '#72b8a5', y: 194 },
  { name: 'blue', colour: '#4aa3cf', y: 244 },
  { name: 'brown', colour: '#9b6a46', y: 294 },
] as const;

export const COPPER = {
  fromX: 150,
  toX: 1450,
  nodeY: 220,
  cableX0: 300,
  cableX1: 1300,
  jacketY: 220,
  jacketH: 220,
  pairAmp: 15,
  twist: 145,
  speed: 185,
};

function smooth(t: number) { return t * t * (3 - 2 * t); }
function pathFor(pair: number, wire: 0 | 1) {
  const p = PAIRS[pair];
  const pts: Pt[] = [];
  const phase = wire ? Math.PI : 0;
  for (let i = 0; i <= 64; i++) {
    const x = COPPER.cableX0 + ((COPPER.cableX1 - COPPER.cableX0) * i) / 64;
    const y = p.y + Math.sin(((x - COPPER.cableX0) / COPPER.twist) * Math.PI * 2 + phase) * COPPER.pairAmp;
    pts.push({ x, y });
  }
  return 'M' + pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

export const WIRE_PATHS = PAIRS.flatMap((p, pair) => ([
  { pair, d: pathFor(pair, 0), colour: p.colour, stripe: false },
  { pair, d: pathFor(pair, 1), colour: p.colour, stripe: true },
]));

function wirePoint(pair: number, x: number, wire: 0 | 1): Pt {
  const phase = wire ? Math.PI : 0;
  return { x, y: PAIRS[pair].y + Math.sin(((x - COPPER.cableX0) / COPPER.twist) * Math.PI * 2 + phase) * COPPER.pairAmp };
}

export function copperSparks(t: number, still: boolean, nerd: boolean) {
  const tt = still ? 3.2 : t;
  const span = COPPER.cableX1 - COPPER.cableX0;
  const out = [] as { key: string; pair: number; dir: 1 | -1; head: Pt; trail: Pt[]; colour: string; alpha: number }[];
  for (let pair = 0; pair < PAIRS.length; pair++) {
    for (const dir of [1, -1] as const) {
      const f = ((tt * COPPER.speed + pair * 92 + (dir < 0 ? span * 0.47 : 0)) % span) / span;
      const x = dir > 0 ? COPPER.cableX0 + f * span : COPPER.cableX1 - f * span;
      const edge = Math.min((x - COPPER.cableX0) / 95, (COPPER.cableX1 - x) / 95, 1);
      const wire = dir > 0 ? 0 : 1;
      const trail: Pt[] = [];
      for (let i = 0; i < 7; i++) trail.push(wirePoint(pair, x - dir * i * 18, wire));
      const dim = nerd ? 1 : pair === 0 ? 1 : 0.28;
      out.push({ key: `${pair}-${dir}`, pair, dir, head: trail[0], trail, colour: dir > 0 ? PAIRS[pair].colour : '#ffcf5d', alpha: smooth(Math.max(0, edge)) * dim });
    }
  }
  return out;
}

export function squareWavePath(x: number, y: number, w: number, h: number, bits: number[]) {
  const step = w / bits.length;
  let d = `M${x} ${y + (bits[0] ? h * 0.18 : h * 0.76)}`;
  for (let i = 0; i < bits.length; i++) {
    d += ` H${(x + (i + 1) * step).toFixed(1)}`;
    if (i < bits.length - 1) d += ` V${(y + (bits[i + 1] ? h * 0.18 : h * 0.76)).toFixed(1)}`;
  }
  return d;
}

const pamLevels = [0, 2, -1, 1, -2, 0, 1, -1, 2, 0];
export const PAM_LABELS = ['+2', '+1', '0', '−1', '−2'];
export function pamPath(x: number, y: number, w: number, h: number) {
  const step = w / pamLevels.length;
  const map = (v: number) => y + h * (0.5 - v / 5);
  let d = `M${x} ${map(pamLevels[0]).toFixed(1)}`;
  for (let i = 0; i < pamLevels.length; i++) {
    d += ` H${(x + (i + 1) * step).toFixed(1)}`;
    if (i < pamLevels.length - 1) d += ` V${map(pamLevels[i + 1]).toFixed(1)}`;
  }
  return d;
}

const eyeLevels = [0.08, 0.29, 0.5, 0.71, 0.92];
function ease(t: number) { return t * t * (3 - 2 * t); }
export const EYE_PATHS = Array.from({ length: 12 }, (_, i) => {
  const gap = i % 4;
  const reverse = Math.floor(i / 4) % 2 === 1;
  const wobble = (Math.floor(i / 8) - 0.5) * 0.018;
  const a = eyeLevels[gap], b = eyeLevels[gap + 1];
  const pts: Pt[] = [];
  for (let s = 0; s <= 42; s++) {
    const u = s / 42;
    const m = ease(u);
    const y = (reverse ? b + (a - b) * m : a + (b - a) * m) + Math.sin((u * 2 + i * 0.37) * Math.PI) * wobble;
    pts.push({ x: u, y });
  }
  return pts;
});
