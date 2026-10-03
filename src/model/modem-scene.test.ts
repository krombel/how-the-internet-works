import { describe, expect, it } from 'vitest';
import { LINE, NUMBER, ONLINE_AT, PHOTO, SLOT, STEPS, dialled, dtmf, handshake, photoIn, ripples, seconds, stepAt } from '../../content/scenes/modem-call/modem';
import { HDLC_TALKS, TALKS, TALK_S, loopS, momentAt } from '../../content/scenes/ppp-hello/ppp';
import { content } from './registry';

describe('the dial-up call (modem-call)', () => {
  it('walks the handshake in order and stays online', () => {
    for (let i = 1; i < STEPS.length; i++) expect(STEPS[i].at).toBeGreaterThan(STEPS[i - 1].at);
    expect(stepAt(-1)).toBe('dial');
    expect(STEPS.map((s) => stepAt(s.at))).toEqual(STEPS.map((s) => s.id));
    expect(stepAt(ONLINE_AT + 600)).toBe('online');
  });

  it('dials with real touch tones, one key at a time', () => {
    expect(dtmf('1')).toEqual([697, 1209]);
    expect(dtmf('5')).toEqual([770, 1336]);
    expect(dtmf('0')).toEqual([941, 1336]);
    expect(() => dtmf('#x')).toThrow();
    expect(dialled(0)).toBe(0);
    expect(dialled(STEPS[1].at)).toBe(NUMBER.length);
    for (let s = 0; s < STEPS[1].at; s += 0.05) expect(dialled(s + 0.05)).toBeGreaterThanOrEqual(dialled(s));
  });

  it('keeps the sound short: the whole handshake is over before it says online, and under six seconds', () => {
    const notes = handshake();
    const end = Math.max(...notes.map((n) => n.at + n.dur));
    expect(end).toBeLessThan(6);
    expect(end).toBeLessThanOrEqual(ONLINE_AT);
    for (const n of notes) expect(n.gain).toBeLessThanOrEqual(1);
    // the answer tone is the 2100 Hz one, and it comes after the ringing
    expect(notes.find((n) => n.f[0] === 2100)!.at).toBeGreaterThanOrEqual(STEPS[2].at);
    // V.8's warble, then the 1200/2400 Hz line probing, then the training hiss (#134)
    const at = (p: (n: (typeof notes)[number]) => boolean) => notes.filter(p).map((n) => n.at);
    const warble = at((n) => !!n.warble), probe = at((n) => n.f[0] === 1200 || n.f[0] === 2400), hiss = at((n) => n.kind === 'hiss');
    expect(Math.min(...warble)).toBeGreaterThanOrEqual(STEPS[3].at);
    expect(Math.max(...warble)).toBeLessThan(Math.min(...probe));
    expect(Math.max(...probe)).toBeLessThan(Math.min(...hiss));
  });

  it('puts something on the line at every step, inside the line', () => {
    for (const s of [0.3, 1.8, 2.8, 4, 8]) {
      const rs = ripples(s, s, (LINE.x0 + LINE.x1) / 2);
      expect(rs.length, `${s}`).toBeGreaterThan(0);
      for (const r of rs) {
        const xs = [...r.d.matchAll(/(-?[\d.]+),/g)].map((m) => +m[1]);
        expect(Math.min(...xs)).toBeGreaterThanOrEqual(LINE.x0 - 0.1);
        expect(Math.max(...xs)).toBeLessThanOrEqual(LINE.x1 + 0.1);
      }
    }
  });

  it('brings a photo in slowly, once online, at 1995’s V.34 speed (the dial-up line’s rate, #59)', () => {
    expect(PHOTO.kbit * 1000).toBe(content.technologies.dialup.rate.down);
    expect(seconds(PHOTO.kB, PHOTO.kbit)).toBeCloseTo(8.33, 2);
    expect(photoIn(ONLINE_AT - 0.1, false)).toBe(0);
    expect(photoIn(ONLINE_AT + 4.2, false)).toBeCloseTo(0.5, 1);
    expect(photoIn(ONLINE_AT + 8.34, false)).toBe(1);
    expect(photoIn(0, true)).toBeGreaterThan(0);
    // the call's own timeslot is a voice one: not 0 (framing) or 16 (signalling) on an E1
    expect([0, 16]).not.toContain(SLOT);
  });
});

describe('the PPP hello (ppp-hello)', () => {
  it('runs the three talks in order, then online, and loops', () => {
    expect(TALKS.map((t) => t.id)).toEqual(['lcp', 'chap', 'ipcp']);
    expect(TALKS.map((_, i) => momentAt(i * TALK_S + 0.1).ix)).toEqual([0, 1, 2]);
    expect(momentAt(TALKS.length * TALK_S + 0.5)).toEqual({ ix: TALKS.length, answered: true, at: null });
    expect(momentAt(loopS(TALKS) + 0.1)).toEqual(momentAt(0.1));
  });

  it('sends each question from whoever starts the talk, and the answer back', () => {
    for (const [i, t] of TALKS.entries()) {
      const ask = momentAt(i * TALK_S + 0.2), answer = momentAt(i * TALK_S + TALK_S / 2 + 0.2);
      const leaves = t.first === 'you' ? 0 : 1;
      expect(ask.answered).toBe(false);
      expect(Math.abs(ask.at! - leaves)).toBeLessThan(0.2);
      expect(answer.answered).toBe(true);
      expect(Math.abs(answer.at! - (1 - leaves))).toBeLessThan(0.2);
    }
    // between crossings the envelope rests
    expect(momentAt(TALK_S / 2 - 0.1).at).toBeNull();
  });

  it('plays a rented line’s keepalives the same way, the far router sending the second', () => {
    expect(HDLC_TALKS.map((_, i) => momentAt(i * TALK_S + 0.1, HDLC_TALKS).ix)).toEqual([0, 1, 2]);
    expect(momentAt(TALK_S + 0.2, HDLC_TALKS).at).toBeGreaterThan(0.8);
    expect(momentAt(loopS(HDLC_TALKS) + 0.1, HDLC_TALKS)).toEqual(momentAt(0.1, HDLC_TALKS));
  });
});
