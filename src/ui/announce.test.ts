import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { announce, announcer, arrival, firstSentence } from './announce.svelte';

describe('announce', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('window', globalThis); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('empties the line, then says the text', () => {
    announce('Wi‑Fi');
    expect(announcer.text).toBe('');
    vi.runAllTimers();
    expect(announcer.text).toBe('Wi‑Fi');
  });

  it('says the same text again, and only the last of two quick ones', () => {
    announce('Router');
    vi.runAllTimers();
    announce('Router');
    expect(announcer.text).toBe('');
    vi.runAllTimers();
    expect(announcer.text).toBe('Router');
    announce('One');
    announce('Two');
    vi.runAllTimers();
    expect(announcer.text).toBe('Two');
  });
});

describe('arrival', () => {
  it('is the title and the first sentence', () => {
    expect(firstSentence('Your phone talks by radio. Big wiggles are ones.', 'en')).toBe('Your phone talks by radio.');
    expect(firstSentence('Din telefon taler med radio! Store bølger er et-taller.', 'da')).toBe('Din telefon taler med radio!');
    expect(arrival('Wi‑Fi', 'Your phone talks by radio. Big wiggles are ones.', 'en')).toBe('Wi‑Fi. Your phone talks by radio.');
  });

  it('copes with no punctuation and no text', () => {
    expect(firstSentence('just one line', 'en')).toBe('just one line');
    expect(arrival('Home', '', 'en')).toBe('Home');
  });
});
