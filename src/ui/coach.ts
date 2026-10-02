// First-run coach marks (issue #21): on a reader's very first visit, a short, skippable sequence that shows them the
// doors (#19) once. Here: which visits get it. Which marks it shows and where each card goes is coach-marks.ts, and
// CoachMarks.svelte draws them: both are a lazy chunk, loaded only on a visit that gets them.

/** The localStorage key remembering that the marks were shown. */
export const COACHED = 'coached';

/** Whether this visit gets the marks: they were never shown, and it starts at the top (the overview, at no stop). A
 *  link straight into a scene or a stop was shared to show that, so it gets none (and the next visit that starts at
 *  the top does). */
export const firstRun = (stored: string | null, at: { path: string[]; stop: string | null }) => stored === null && !at.path.length && !at.stop;
