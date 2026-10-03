// How long it takes (#59): how fast a route carries bits (its slowest link, each way), how long the thing the reader
// waits for takes to arrive at that rate, and how much slower the parcels are drawn on a slow route.
import type { ActivityDef } from '../define';
import type { Link, Route } from './resolve';

export type Dir = 'up' | 'down';

/** The route's bottleneck one way: its slowest link (side branches aside; on a tie, the first). */
export const bottleneck = (r: Route, dir: Dir): Link => r.links.reduce((a, b) => (b.rate[dir] < a.rate[dir] ? b : a));

/** The thing an activity's reader waits for: the kind going down that has a size (one at most, validation). */
export const waitedFor = (a: ActivityDef) => a.flows.flatMap((f) => f.packets).find((p) => p.dir === 'down' && p.size);

/** Seconds for `bytes` at `bps` bit/s (the bits alone: no handshakes, headers or waiting). */
export const transferSecs = (bytes: number, bps: number) => (bytes * 8) / bps;

export interface HowLong {
  /** The slowest link on the way down, and its rate in bit/s. */
  link: Link;
  bps: number;
  bytes: number;
  secs: number;
  /** Seconds it plays for, if it's watched as it comes. */
  plays?: number;
  /** Today's thing (the base activity's) at this route's rate: like with like across the eras. */
  now: { bytes: number; secs: number };
}

/** How long the route's activity takes to arrive, or null if it has nothing sized. */
export function howLong(r: Route): HowLong | null {
  const it = waitedFor(r.activity);
  if (!it?.size) return null;
  const link = bottleneck(r, 'down'), bps = link.rate.down;
  const now = waitedFor(r.content.activities[r.activity.variantOf ?? r.activity.id])?.size ?? it.size;
  return { link, bps, bytes: it.size, secs: transferSecs(it.size, bps), plays: it.plays, now: { bytes: now, secs: transferSecs(now, bps) } };
}

/** How much slower the parcels are drawn on a route this fast (bit/s): fast, medium or slow. Gentle and bounded, not
 *  to scale (1995's modem was about 35,000 times slower than today's fibre); the caption's line says the real
 *  difference. Every parcel's trip and spacing stretch alike, so as many are on screen at once. Both ways go at the
 *  pace of the way down, the one the reader waits for. */
export const PACE = [
  { from: 100e6, slow: 1 },
  { from: 1e6, slow: 1.6 },
  { from: 0, slow: 2.5 },
] as const;
export const slowFor = (bps: number): number => PACE.find((p) => bps >= p.from)!.slow;
/** How much slower this route's parcels go. */
export const paceOf = (r: Route): number => slowFor(bottleneck(r, 'down').rate.down);

const num = (lang: string, digits: number, o: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat(lang, { maximumSignificantDigits: digits, ...o });

/** A time for people, in seconds, minutes or hours (up to 99 of each), to `digits` significant digits. */
export function formatDuration(secs: number, lang: string, digits: number): string {
  const [n, unit] = secs < 99.5 ? [secs, 'second'] : secs < 5970 ? [secs / 60, 'minute'] : [secs / 3600, 'hour'];
  return num(lang, digits, { style: 'unit', unit, unitDisplay: 'long' }).format(n);
}
/** `n` in thousands, millions or billions, and which (0–2). */
const scale = (n: number): [number, 0 | 1 | 2] => (n >= 1e9 ? [n / 1e9, 2] : n >= 1e6 ? [n / 1e6, 1] : [n / 1e3, 0]);
/** A rate for people: 28.8 kbit/s, 20 Mbit/s, 1 Gbit/s. */
export function formatRate(bps: number, lang: string): string {
  const [n, k] = scale(bps);
  return `${num(lang, 3).format(n)}\u00a0${'kMG'[k]}bit/s`;
}
/** A size for people, in kB, MB or GB (of 1000). */
export function formatBytes(bytes: number, lang: string): string {
  const [n, k] = scale(bytes);
  return num(lang, 3, { style: 'unit', unit: `${['kilo', 'mega', 'giga'][k]}byte` }).format(n);
}
/** A plain number of times, to `digits` significant digits. */
export const formatTimes = (x: number, lang: string, digits: number): string => num(lang, digits).format(x);
