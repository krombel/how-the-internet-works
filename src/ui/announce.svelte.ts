// What a screen reader hears when something changes without focus moving there (#53): one polite status line
// (Announcer.svelte), set on arrival in a scene and at each hop of a caught packet. Short on purpose: the caption and
// the peek panel are there to read on.
import { spoken } from '../engine/speech';

export const announcer = $state({ text: '' });
let timer = 0;

/** Say `text`. The line is emptied first, so the same words twice are said twice. */
export function announce(text: string) {
  clearTimeout(timer);
  announcer.text = '';
  timer = window.setTimeout(() => (announcer.text = text), 60);
}

/** The first sentence of `text`, in language `lang`. */
export function firstSentence(text: string, lang: string) {
  const first = new Intl.Segmenter(lang, { granularity: 'sentence' }).segment(text)[Symbol.iterator]().next();
  return first.done ? '' : first.value.segment.trim();
}

/** What an arrival says: the scene's title (leave it out where focus went to it, which says it), what lies below it
 *  ("3 doors lead further down"), and what the picture shows: its description, or where it has none (a stop along
 *  the way) the first sentence of its caption. */
export const arrival = (a: { title: string; below?: string; describe: string; body: string }, lang: string) =>
  spoken(a.title, a.below ?? '', a.describe || firstSentence(a.body, lang));
