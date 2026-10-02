// Internet rush hour (issue #44): in the evening everyone streams video at once. Whether it is rush hour is the
// reader's choice in ⋯: `auto` follows their own clock (the evening peak, 19:00 to 23:00 local time), `on` and `off`
// pin it. It is not night mode: many readers use a dark screen at noon.
export type Rush = 'auto' | 'on' | 'off';
export const RUSH_CHOICES: readonly Rush[] = ['auto', 'on', 'off'];
/** The evening peak, in the reader's local hours: from `from` up to (not including) `to`. */
export const RUSH_HOURS = { from: 19, to: 23 } as const;

export function isRush(choice: Rush, now: Date): boolean {
  if (choice !== 'auto') return choice === 'on';
  const h = now.getHours();
  return h >= RUSH_HOURS.from && h < RUSH_HOURS.to;
}

/** Milliseconds from `now` until the next time `isRush(…, 'auto')` may change (the next whole hour). */
export const untilNextHour = (now: Date) => 3600_000 - ((now.getMinutes() * 60 + now.getSeconds()) * 1000 + now.getMilliseconds());
