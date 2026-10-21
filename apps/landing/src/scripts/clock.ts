// The clock of the evening that does not start (sections/problem.astro): while its title is scrolled, the hour moves a
// minute at a time from 17:30 to 18:00, and never goes back. Pure, so that it is tested.
import { spokenHour } from '@/lib/hours';
import type { View } from './scenes';

/** The minutes that pass, from 17:30 to 18:00. */
export const CLOCK_MINUTES = 30;

const START = { hour: 17, minutes: 30 };

/** The minutes passed for where the title lies against the window (its top, from the window's top): none while it is
 * below the line where a block plays (two thirds of the window, src/scripts/reveal.ts), all of them once it reaches the
 * header; never fewer than those already `reached`. */
export function clockMinute(top: number, view: View, reached: number): number {
  const start = (view.height * 2) / 3;
  const travel = start - view.offset;
  const progress = travel <= 0 ? Number(top <= start) : Math.min(1, Math.max(0, (start - top) / travel));
  return Math.max(reached, Math.floor(progress * CLOCK_MINUTES));
}

/** The hour reached, written the French way (« 17 h 31 », « 18 h »). */
export function clockTime(minute: number): string {
  const passed = START.minutes + Math.min(CLOCK_MINUTES, Math.max(0, minute));
  const hour = START.hour + Math.floor(passed / 60);
  return spokenHour(`${String(hour)}:${String(passed % 60).padStart(2, '0')}`);
}
