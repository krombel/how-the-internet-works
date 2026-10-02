// First-run coach marks (issue #21): on a reader's very first visit, a short, skippable sequence that shows them the
// doors (#19) once, and the time machine (#59). Here: which visits get it. Which marks it shows and where each card goes is coach-marks.ts, and
// CoachMarks.svelte draws them: both are a lazy chunk, loaded only on a visit that gets them.

/** The localStorage key remembering which marks were shown: '1' the first ones (#21), `COACH_ALL` those and the time
 *  machine's card (#59). */
export const COACHED = 'coached';
export const COACH_ALL = '2';

/** Which marks a visit gets: all of them (never shown), only the time machine's card (the first ones were shown
 *  before it came), or none. Only a visit that starts at the top (the overview, at no stop) gets any: a link straight
 *  into a scene or a stop was shared to show that, so it gets none (and the next visit that starts at the top does). */
export type CoachRun = 'all' | 'time' | null;
export const coachRun = (stored: string | null, at: { path: string[]; stop: string | null }): CoachRun =>
  at.path.length || at.stop ? null : stored === null ? 'all' : stored === '1' ? 'time' : null;
