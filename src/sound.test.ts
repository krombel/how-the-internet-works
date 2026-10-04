// The sound setting (#189) as the app wires it: on by default, a mute remembered, `?sound=` winning for one load, and
// no audio until the first tap or key.
import { describe, expect, it, vi } from 'vitest';
import { stubBrowser } from './test/stub-browser';

let made = 0;
/** Load the app's state afresh, with this query and this stored choice; `win` gets the page's gesture listeners. */
async function load(query: string, stored: Record<string, string>) {
  vi.resetModules();
  stubBrowser();
  const url = new URL(`http://localhost/${query}`);
  const store = new Map(Object.entries(stored));
  const win = new EventTarget();
  vi.stubGlobal('location', url);
  vi.stubGlobal('history', { state: null, replaceState: (_: unknown, __: string, u: string) => { url.href = new URL(u, url).href; } });
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) });
  vi.stubGlobal('window', win);
  made = 0;
  vi.stubGlobal('AudioContext', class {
    state = 'running'; sampleRate = 8; currentTime = 0; destination = {};
    constructor() { made++; }
    createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
    createGain() { return { gain: { value: 0 }, connect() {}, disconnect() {} }; }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
  });
  const state = await import('./state.svelte');
  return { state, url, store, win };
}

describe('sound (#189)', () => {
  it('is on by default, but makes no AudioContext and gives scenes no output until a tap or key', async () => {
    const { state, win } = await load('', {});
    expect(state.settings.sound).toBe(true);
    expect(made).toBe(0);
    expect(state.soundOut()).toBeNull();
    win.dispatchEvent(new Event('pointermove'));
    expect(made).toBe(0);
    win.dispatchEvent(new Event('keydown'));
    expect(made).toBe(1);
    expect(state.soundOut()).not.toBeNull();
  });

  it('remembers a mute, and forgets it when sound is turned back on', async () => {
    const { state, store, win } = await load('', { sound: 'off' });
    expect(state.settings.sound).toBe(false);
    win.dispatchEvent(new Event('pointerdown'));
    expect(made).toBe(0);
    expect(state.soundOut()).toBeNull();
    state.setSound(true);
    expect(store.has('sound')).toBe(false);
    expect(made).toBe(1);
    state.setSound(false);
    expect(store.get('sound')).toBe('off');
    expect(state.soundOut()).toBeNull();
  });

  it('lets ?sound= win for the load without storing it, and keeps it in step with the reader\'s choice', async () => {
    let { state, store, url } = await load('?sound=on', { sound: 'off' });
    expect(state.settings.sound).toBe(true);
    expect(store.get('sound')).toBe('off');
    state.setSound(false);
    expect(url.searchParams.get('sound')).toBe('off');

    ({ state, store, url } = await load('?sound=off', {}));
    expect(state.settings.sound).toBe(false);
    expect(store.has('sound')).toBe(false);
    state.setSound(true);
    expect(url.searchParams.get('sound')).toBe('on');
  });
});
