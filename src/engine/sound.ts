// Kid-friendly sound effects synthesised with the Web Audio API – no audio files, so no licences.
// On by default, but a browser lets no audio start before the reader's first tap or key: the AudioContext is only
// created (or resumed) inside that gesture (`wakeOnGesture`), so nothing plays, and nothing warns, before it.
export interface Timbre {
  /** Oscillator for blips/pops. */
  wave: OscillatorType;
  /** Base pitch (Hz) of the arrival blip. */
  blip: number;
  /** Band-pass centre (Hz) and Q of the noise used for whooshes. */
  noise: { freq: number; q: number };
  /** Overall level 0..1. */
  gain: number;
  /** A second, detuned voice for a richer tone (cents), 0 = off. */
  detune: number;
  /** Decay of the percussive sounds in seconds. */
  decay: number;
}

const DEFAULT_TIMBRE: Timbre = { wave: 'sine', blip: 880, noise: { freq: 900, q: 0.8 }, gain: 0.5, detune: 0, decay: 0.18 };
/** The level of everything, into the speakers. */
const MASTER = 0.35;
/** The level of an arrival you only watch (`blip(false)`; #189): about 7 dB under the quietest tap sound, the swish,
 *  measured as K-weighted loudness over 100 ms (it was 0.12, level with the swish). */
const QUIET = 0.05;

/** Whether sound is on as the page loads: `?sound=on|off` wins for this load, then the reader's stored choice
 *  (`'off'` once they muted), else on. */
export const soundOnLoad = (asked: string | null, stored: string | null) => (asked === 'on' || asked === 'off' ? asked : stored) !== 'off';

/** The events in which a browser may count a tap or a key as the user's gesture (a touch's pointerdown doesn't, its
 *  pointerup and touchend do; Esc doesn't). */
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'keydown'] as const;
/** Calls `wake` once, early in (capturing) the first of them that gives the page user activation, so the tap's own
 *  sound can play. */
export function wakeOnGesture(target: EventTarget, wake: () => void, active = () => navigator.userActivation?.isActive ?? true) {
  const on = () => {
    if (!active()) return;
    for (const t of GESTURES) target.removeEventListener(t, on, { capture: true });
    wake();
  };
  for (const t of GESTURES) target.addEventListener(t, on, { capture: true });
}

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private lastQuiet = -Infinity;
  /** The reader's choice. */
  private on = false;
  /** A gesture has let audio start. */
  private woken = false;
  timbre: Timbre = DEFAULT_TIMBRE;

  constructor(private make = () => new AudioContext(), private now = () => performance.now()) {}

  setEnabled(on: boolean) { this.on = on; this.sync(); }
  /** The reader's first tap or key: audio may start now. */
  wake() { this.woken = true; this.sync(); }

  /** On (and woken): a context, created inside the gesture, with a master into its speakers. Off: the master is cut
   *  loose, so whatever still plays (a scene's sound too) stops at once, and the context is suspended. */
  private sync() {
    const live = this.on && this.woken;
    if (live && !this.ctx) {
      this.ctx = this.make();
      const n = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, n, n);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    const ctx = this.ctx;
    if (!ctx) return;
    if (live && !this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = MASTER;
      this.master.connect(ctx.destination);
    } else if (!live && this.master) {
      this.master.disconnect();
      this.master = null;
    }
    void (live ? ctx.resume() : ctx.suspend());
  }

  private ready() { return this.master && this.ctx?.state === 'running' ? this.ctx : null; }

  private tone(freq: number, dur: number, level: number, bend = 1, delay = 0) {
    const ctx = this.ready(); if (!ctx) return;
    const t0 = ctx.currentTime + delay, T = this.timbre;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(level * T.gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    g.connect(this.master!);
    for (const cents of T.detune ? [-T.detune, T.detune] : [0]) {
      const o = ctx.createOscillator();
      o.type = T.wave; o.detune.value = cents;
      o.frequency.setValueAtTime(freq, t0);
      o.frequency.exponentialRampToValueAtTime(freq * bend, t0 + dur);
      o.connect(g); o.start(t0); o.stop(t0 + dur + 0.02);
    }
  }

  private noise(dur: number, level: number, f0: number, f1: number) {
    const ctx = this.ready(); if (!ctx || !this.noiseBuf) return;
    const t0 = ctx.currentTime, T = this.timbre;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = T.noise.q;
    bp.frequency.setValueAtTime(f0, t0);
    bp.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(level * T.gain, t0 + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp).connect(g).connect(this.master!);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  /** Zooming in (up = true) or out. */
  whoosh(up: boolean, durMs = 900) {
    const f = this.timbre.noise.freq, d = Math.min(1.4, durMs / 1000);
    this.noise(d, 0.9, up ? f * 0.5 : f * 2, up ? f * 2.2 : f * 0.45);
  }
  /** Stepping sideways. */
  swish() { const f = this.timbre.noise.freq; this.noise(0.28, 0.6, f * 1.6, f * 0.8); }
  /** A tap on something. */
  pop() { this.tone(this.timbre.blip * 0.5, this.timbre.decay * 0.7, 0.7, 1.8); }
  /** Arrival: loud for the packet you follow or step; quiet (and at most one every 1.8 s, so a busy scene doesn't
   *  chatter) for one you only watch arrive. */
  blip(loud: boolean, dir: 'up' | 'down' = 'down') {
    if (!loud) {
      const t = this.now();
      if (t - this.lastQuiet < 1800) return;
      this.lastQuiet = t;
    }
    const f = this.timbre.blip * (dir === 'up' ? 1.26 : 1);
    this.tone(f, this.timbre.decay, loud ? 0.9 : QUIET);
    if (loud) this.tone(f * 1.5, this.timbre.decay * 1.4, 0.7, 1, 0.09);
  }
  /** Where a scene may play a short sound of its own (the dial-up modem's handshake), or null while there's no sound. */
  out() { return this.ctx && this.master ? { ctx: this.ctx, dest: this.master as AudioNode } : null; }
  /** Reached the end of a row of stops. */
  bump() { this.tone(this.timbre.blip * 0.25, 0.16, 0.6, 0.7); }
}

export const sfx = new Sfx();
