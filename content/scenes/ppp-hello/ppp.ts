// PPP's hello, as a loop: three little talks (agree how to talk, log in, get an address), each a question and an
// answer carried across the call in the PPP envelope. The internet company starts the login (CHAP's challenge).

export const TALKS = [
  { id: 'lcp', first: 'you' },
  { id: 'chap', first: 'isp' },
  { id: 'ipcp', first: 'you' },
] as const;

/** Seconds per talk: the question crosses, then the answer comes back. */
export const TALK_S = 4;
const CROSS = 1.4;
/** One loop: the three talks, then a moment online. */
export const LOOP_S = TALKS.length * TALK_S + 3;

export interface Moment {
  /** The talk under way (TALKS.length once they're all done). */
  ix: number;
  answered: boolean;
  /** The envelope on the line: 0 at your computer, 1 at the internet company; null when it's resting. */
  at: number | null;
}

export function momentAt(t: number): Moment {
  const s = ((t % LOOP_S) + LOOP_S) % LOOP_S;
  const ix = Math.floor(s / TALK_S);
  if (ix >= TALKS.length) return { ix: TALKS.length, answered: true, at: null };
  const u = s - ix * TALK_S, half = TALK_S / 2;
  const answered = u >= half;
  const k = (answered ? u - half : u) / CROSS;
  // who's sending now: the talk's starter asks, the other end answers
  const fromYou = (TALKS[ix].first === 'you') !== answered;
  return { ix, answered, at: k > 1 ? null : fromYou ? k : 1 - k };
}
