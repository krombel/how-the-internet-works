import { describe, expect, it } from 'vitest';
import { MASTER, Sfx, soundOnLoad, wakeOnGesture, type Timbre } from './sound';

describe('soundOnLoad', () => {
  it('is on by default', () => {
    expect(soundOnLoad(null, null)).toBe(true);
  });
  it('remembers a mute', () => {
    expect(soundOnLoad(null, 'off')).toBe(false);
    expect(soundOnLoad(null, 'something else')).toBe(true);
  });
  it('lets ?sound=on|off win for the load, and ignores anything else in the query', () => {
    expect(soundOnLoad('off', null)).toBe(false);
    expect(soundOnLoad('on', 'off')).toBe(true);
    expect(soundOnLoad('loud', 'off')).toBe(false);
    expect(soundOnLoad('', null)).toBe(true);
  });
});

describe('wakeOnGesture', () => {
  const fire = (t: EventTarget, type: string) => t.dispatchEvent(new Event(type));

  it('wakes once, on the first event that gives the page user activation', () => {
    const t = new EventTarget();
    let active = false, woken = 0;
    wakeOnGesture(t, () => woken++, () => active);
    fire(t, 'pointerdown'); // a touch's pointerdown: no activation yet
    fire(t, 'keydown'); // Esc
    expect(woken).toBe(0);
    active = true;
    fire(t, 'touchend');
    expect(woken).toBe(1);
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown']) fire(t, type);
    expect(woken).toBe(1);
  });

  it('wakes on a key, and ignores events that are no gesture', () => {
    const t = new EventTarget();
    let woken = 0;
    wakeOnGesture(t, () => woken++, () => true);
    fire(t, 'pointermove');
    fire(t, 'scroll');
    expect(woken).toBe(0);
    fire(t, 'keydown');
    expect(woken).toBe(1);
  });
});

/** A fake AudioContext: what was made, every level a gain was ramped to, and whether it runs. */
function fakeAudio() {
  const made: FakeCtx[] = [];
  class Param {
    value = 0;
    peaks: number[] = [];
    setValueAtTime() {}
    exponentialRampToValueAtTime(v: number) { if (v > 0.001) this.peaks.push(v); }
  }
  class Node {
    connected: unknown[] = [];
    connect(n: unknown) { this.connected.push(n); return n; }
    disconnect() { this.connected = []; }
  }
  class Gain extends Node { gain = new Param(); }
  class FakeCtx {
    state: AudioContextState = 'running';
    sampleRate = 100;
    currentTime = 0;
    destination = new Node();
    gains: Gain[] = [];
    constructor() { made.push(this); }
    createGain() { const g = new Gain(); this.gains.push(g); return g; }
    createOscillator() { return Object.assign(new Node(), { type: 'sine', detune: new Param(), frequency: new Param(), start() {}, stop() {} }); }
    createBufferSource() { return Object.assign(new Node(), { buffer: null, start() {}, stop() {} }); }
    createBiquadFilter() { return Object.assign(new Node(), { type: 'lowpass', Q: new Param(), frequency: new Param() }); }
    createBuffer(_: number, n: number) { const d = new Float32Array(n); return { getChannelData: () => d }; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
  }
  return { made, make: () => new FakeCtx() as unknown as AudioContext };
}
const TIMBRE: Timbre = { wave: 'triangle', blip: 660, noise: { freq: 820, q: 0.75 }, gain: 0.28, detune: 0, decay: 0.22 };
/** The peak levels the sounds played since the last call ramped to (their own gains, not the master). */
function levels(made: ReturnType<typeof fakeAudio>['made']) {
  const ctx = made[0] as unknown as { gains: { gain: { peaks: number[] } }[] };
  const peaks = ctx.gains.slice(1).flatMap((g) => g.gain.peaks).map((v) => +(v / TIMBRE.gain).toFixed(3));
  ctx.gains.length = 1;
  return peaks;
}

describe('Sfx', () => {
  it('makes no AudioContext before the first gesture, even with sound on, and plays nothing', () => {
    const { made, make } = fakeAudio();
    const s = new Sfx(make);
    s.setEnabled(true);
    s.pop(); s.whoosh(true); s.blip(false);
    expect(made).toHaveLength(0);
    expect(s.out()).toBeNull();
  });

  it('makes it at the gesture when sound is on, and the gesture\'s own sound plays', () => {
    const { made, make } = fakeAudio();
    const s = new Sfx(make);
    s.timbre = TIMBRE;
    s.setEnabled(true);
    s.wake();
    expect(made).toHaveLength(1);
    expect(s.out()).not.toBeNull();
    s.pop();
    expect(levels(made)).toEqual([0.7]);
  });

  it('plays everything through a master loud enough to hear (#191), with room to spare before clipping', () => {
    const { made, make } = fakeAudio();
    const s = new Sfx(make);
    s.setEnabled(true); s.wake();
    const ctx = made[0] as unknown as { gains: { gain: { value: number } }[] };
    expect(MASTER).toBe(0.8);
    expect(ctx.gains[0].gain.value).toBe(MASTER);
    // the loudest sound, the followed arrival's two notes, each two detuned voices in step, stays under 0.9
    expect((0.9 + 0.7) * TIMBRE.gain * 2 * MASTER).toBeLessThan(0.9);
  });

  it('makes none at the gesture while muted, only when sound is turned on later', () => {
    const { made, make } = fakeAudio();
    const s = new Sfx(make);
    s.wake();
    expect(made).toHaveLength(0);
    s.setEnabled(true);
    expect(made).toHaveLength(1);
  });

  it('turned off, cuts the master loose (a scene\'s sound stops at once), suspends, and plays nothing more', () => {
    const { made, make } = fakeAudio();
    const s = new Sfx(make);
    s.timbre = TIMBRE;
    s.setEnabled(true); s.wake();
    const ctx = made[0] as unknown as { state: string; destination: unknown; gains: { connected: unknown[] }[] };
    const master = ctx.gains[0];
    expect(master.connected).toEqual([ctx.destination]);
    s.setEnabled(false);
    expect(master.connected).toEqual([]);
    expect(ctx.state).toBe('suspended');
    expect(s.out()).toBeNull();
    s.pop();
    expect(levels(made)).toEqual([]);
    s.setEnabled(true);
    expect(made).toHaveLength(1);
    expect(ctx.state).toBe('running');
    expect(s.out()?.dest).not.toBe(master);
  });

  it('keeps the tap sounds, and plays an arrival you only watch quietly and at most every 1.8 s', () => {
    const { made, make } = fakeAudio();
    let now = 10_000;
    const s = new Sfx(make, () => now);
    s.timbre = TIMBRE;
    s.setEnabled(true); s.wake();
    s.pop(); s.bump(); s.swish(); s.whoosh(true); s.blip(true);
    expect(levels(made)).toEqual([0.7, 0.6, 0.6, 0.9, 0.9, 0.7]);
    s.blip(false);
    expect(levels(made)).toEqual([0.05]);
    now += 1700;
    s.blip(false);
    expect(levels(made)).toEqual([]);
    now += 200;
    s.blip(false);
    expect(levels(made)).toEqual([0.05]);
  });
});
