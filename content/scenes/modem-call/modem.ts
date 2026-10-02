// A dial-up call, kept free of Svelte so it can be tested: the handshake's steps in time, the waves they put on the
// line, the short sound of it (Web Audio, only played with sound on) and how slowly a photo came in.

/** The handshake, in seconds from the moment the reader arrives: dial, ring, the answer tone, the modems' training
 *  screech, then online for good. */
export const STEPS = [
  { id: 'dial', at: 0 },
  { id: 'ring', at: 1.45 },
  { id: 'answer', at: 2.4 },
  { id: 'train', at: 3.3 },
  { id: 'online', at: 5.4 },
] as const;
export type Step = (typeof STEPS)[number]['id'];
export const ONLINE_AT = STEPS[STEPS.length - 1].at;

/** The step `s` seconds after arriving. */
export function stepAt(s: number): Step {
  let out: Step = STEPS[0].id;
  for (const st of STEPS) if (s >= st.at) out = st.id;
  return out;
}

/** The number the modem dials (a made-up one), and the touch-tone pair of each key (Hz: row, column). */
export const NUMBER = '5550123';
const ROW = [697, 770, 852, 941], COL = [1209, 1336, 1477];
export function dtmf(key: string): [number, number] {
  const k = '1234567890'.indexOf(key);
  if (k < 0) throw new Error(`no touch tone for "${key}"`);
  return k === 9 ? [ROW[3], COL[1]] : [ROW[Math.floor(k / 3)], COL[k % 3]];
}
const KEY = { from: 0.05, on: 0.12, gap: 0.07 };
/** How many digits have been dialled `s` seconds in. */
export const dialled = (s: number) => Math.max(0, Math.min(NUMBER.length, Math.floor((s - KEY.from) / (KEY.on + KEY.gap)) + 1));

/** One sound: a chord of sine tones, or band-passed hiss round f[0]; `warble` swaps between f's two pitches. */
export interface Note { at: number; dur: number; kind: 'tone' | 'hiss'; f: number[]; gain: number; warble?: number }

/** The sound of the handshake: under six seconds, the way the modem's little speaker played it. */
export function handshake(): Note[] {
  const notes: Note[] = [...NUMBER].map((k, i) => ({ at: KEY.from + i * (KEY.on + KEY.gap), dur: KEY.on, kind: 'tone', f: dtmf(k), gain: 0.5 }));
  notes.push({ at: 1.5, dur: 0.8, kind: 'tone', f: [425], gain: 0.4 });
  notes.push({ at: 2.45, dur: 0.8, kind: 'tone', f: [2100], gain: 0.35 });
  for (let i = 0; i < 4; i++) notes.push({ at: 3.3 + i * 0.13, dur: 0.11, kind: 'tone', f: [i % 2 ? 2400 : 1200], gain: 0.35 });
  notes.push({ at: 3.85, dur: 1.45, kind: 'hiss', f: [1800], gain: 0.6 });
  notes.push({ at: 3.85, dur: 1.45, kind: 'tone', f: [1650, 980], gain: 0.2, warble: 0.09 });
  return notes;
}

/** Where a scene may play: the audio context and the node to play into. */
export interface Out { ctx: AudioContext; dest: AudioNode }
/** Plays the notes now; returns a stop (leaving the scene cuts the sound off). */
export function play({ ctx, dest }: Out, notes: Note[]): () => void {
  const t0 = ctx.currentTime + 0.05;
  const bus = ctx.createGain();
  bus.connect(dest);
  let noise: AudioBuffer | null = null;
  for (const n of notes) {
    const g = ctx.createGain(), a = t0 + n.at, b = a + n.dur;
    g.gain.setValueAtTime(0.0001, a);
    g.gain.exponentialRampToValueAtTime(n.gain, a + 0.01);
    g.gain.setValueAtTime(n.gain, b - 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, b);
    g.connect(bus);
    if (n.kind === 'hiss') {
      if (!noise) {
        noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter();
      src.buffer = noise; bp.type = 'bandpass'; bp.frequency.value = n.f[0]; bp.Q.value = 0.9;
      src.connect(bp).connect(g); src.start(a); src.stop(b + 0.02);
      continue;
    }
    for (const f of n.warble ? [n.f[0]] : n.f) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(f, a);
      if (n.warble) for (let t = a + n.warble, k = 1; t < b; t += n.warble, k++) o.frequency.setValueAtTime(n.f[k % 2], t);
      o.connect(g); o.start(a); o.stop(b + 0.02);
    }
  }
  return () => { bus.gain.cancelScheduledValues(ctx.currentTime); bus.gain.setValueAtTime(0, ctx.currentTime); bus.disconnect(); };
}

// ------------------------------------------------------------------ the line

/** The track, drawn in landscape space (portrait turns it like the other line dives). */
export const LINE = { fromX: 150, toX: 1450, nodeY: 220, x0: 270, x1: 1330 };
const fixed = (n: number) => n.toFixed(1);

/** A wave along the line from x0 to x1: `len` its wavelength, `amp` its height, `rough` how much noise rides it. */
export function wave(x0: number, x1: number, len: number, amp: number, phase: number, rough = 0, envelope = true): string {
  const pts: string[] = [];
  const n = Math.max(8, Math.ceil(Math.abs(x1 - x0) / 5));
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = x0 + (x1 - x0) * u;
    const env = envelope ? Math.sin(u * Math.PI) ** 0.6 : 1;
    const jag = rough ? Math.sin(x * 0.37 + phase * 7.1) * Math.sin(x * 0.11 - phase * 3.3) * rough : 0;
    pts.push(`${fixed(x)},${fixed(LINE.nodeY + (Math.sin(((x - phase) / len) * Math.PI * 2) * amp + jag) * env)}`);
  }
  return 'M' + pts.join(' ');
}

export interface Ripple { key: string; d: string; tone: 'call' | 'answer' | 'data'; alpha: number }
const smooth = (t: number) => t * t * (3 - 2 * t);
/** A short burst travelling from a to b, f (0..1) of the way. */
function burst(key: string, a: number, b: number, f: number, len: number, amp: number, tone: Ripple['tone']): Ripple {
  const c = a + (b - a) * f, w = 90;
  return { key, tone, d: wave(Math.max(Math.min(a, b), c - w), Math.min(Math.max(a, b), c + w), len, amp, c * 0.6), alpha: smooth(Math.min(1, Math.min(f, 1 - f) * 6)) };
}

/** What rides the line `s` seconds after arriving, at clock t (for the steady wiggle). mid: where the exchange is. */
export function ripples(s: number, t: number, mid: number): Ripple[] {
  const { x0, x1 } = LINE;
  switch (stepAt(s)) {
    case 'dial': {
      // each key a beep running from the computer to the exchange
      const out: Ripple[] = [];
      for (let i = 0; i < dialled(s); i++) {
        const f = (s - KEY.from - i * (KEY.on + KEY.gap)) / 0.9;
        if (f < 1) out.push(burst(`key${i}`, x0, mid, f, 18, 16, 'call'));
      }
      return out;
    }
    case 'ring': return [burst('ring', mid, x1, Math.min(1, (s - STEPS[1].at) / 0.9), 46, 22, 'call')];
    case 'answer': return [{ key: 'answer', tone: 'answer', d: wave(x0, x1, 26, 16, t * 400, 0, false), alpha: 1 }];
    case 'train': return [
      { key: 'train-up', tone: 'call', d: wave(x0, x1, 34, 14, t * 300, 12, false), alpha: 1 },
      { key: 'train-down', tone: 'answer', d: wave(x0, x1, 21, 10, -t * 520, 9, false), alpha: 0.85 },
    ];
    default: {
      // online: a little data each way, slowly
      return [1, -1, -1].map((dir, i) => {
        const f = (t * 0.32 + i * 0.37) % 1;
        return burst(`data${i}`, dir > 0 ? x0 : x1, dir > 0 ? x1 : x0, f, dir > 0 ? 30 : 22, 12, dir > 0 ? 'call' : 'data');
      });
    }
  }
}

// ------------------------------------------------------------------ how slow

/** A photo of this many kB, at this many kbit/s, in seconds. */
export const seconds = (kB: number, kbit: number) => (kB * 8) / kbit;
/** The photo on the speed card: 100 kB at a real 50 kbit/s. */
export const PHOTO = { kB: 100, kbit: 50 };

/** How much of the photo is in (0..1), `s` seconds after arriving: it starts once online, then again after a pause. */
export function photoIn(s: number, still: boolean): number {
  if (still) return 0.55;
  const took = seconds(PHOTO.kB, PHOTO.kbit), u = s - ONLINE_AT;
  if (u <= 0) return 0;
  return Math.min(1, (u % (took + 3)) / took);
}

/** The call's timeslot on a 32-slot trunk (an E1; slots 0 and 16 carry framing and signalling). */
export const SLOT = 7;
