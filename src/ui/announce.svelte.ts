// What a screen reader hears when something changes without focus moving there (#53): one polite status line
// (Announcer.svelte), set on arrival in a scene and at each hop of a caught packet. Short on purpose: the caption and
// the peek panel are there to read on.
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

/** What an arrival says: the scene's title and the first sentence of its caption. */
export const arrival = (title: string, body: string, lang: string) => [title, firstSentence(body, lang)].filter(Boolean).join('. ');
