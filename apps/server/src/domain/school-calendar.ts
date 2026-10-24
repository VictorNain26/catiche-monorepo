/**
 * The school's time, in Paris whatever the server's zone: the school year, named after the
 * September that opens it, and the quota's day (`quota.ts`), which starts at 4 a.m. so that an
 * evening of homework past midnight is not cut in two; the clocks change between 2 and 3 a.m.,
 * never at 4.
 */

/** The hour, in Paris, the quota day starts at. */
export const QUOTA_RESET_HOUR = 4;

const PARIS = new Intl.DateTimeFormat('en', {
  timeZone: 'Europe/Paris',
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
});

function parisParts(date: Date) {
  const parts = PARIS.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => {
    const part = parts.find((each) => each.type === type);
    if (!part) throw new Error(`No ${type} in the Paris time of ${date.toISOString()}`);
    return Number(part.value);
  };
  return { year: read('year'), month: read('month'), day: read('day'), hour: read('hour'), minute: read('minute') };
}

/** The instant of a time in Paris, at Paris' offset on that day; Date.UTC carries a day 0 back to the month before. */
function parisTime(year: number, month: number, day: number, hour: number): Date {
  const asIfUtc = Date.UTC(year, month - 1, day, hour);
  // Paris' offset at that hour, read back from the same formatter.
  const there = parisParts(new Date(asIfUtc));
  const offset = Date.UTC(there.year, there.month - 1, there.day, there.hour, there.minute) - asIfUtc;
  return new Date(asIfUtc - offset);
}

/** The instant the quota day of `now` started: the last 4 a.m. in Paris. */
export function quotaDayStart(now: Date): Date {
  const paris = parisParts(now);
  // Before 4 a.m., the day is still yesterday's.
  return parisTime(paris.year, paris.month, paris.hour < QUOTA_RESET_HOUR ? paris.day - 1 : paris.day, QUOTA_RESET_HOUR);
}

/** The day of a date in Paris, as YYYY-MM-DD: a message at 0:30 is of the day it begins. */
export function parisDay(date: Date): string {
  const { year, month, day } = parisParts(date);
  return `${String(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** The school year a date belongs to, named after the September that opens it. */
export function schoolYearOf(date: Date): number {
  // In Paris: on a server in UTC, the night of 1 September would still be August.
  const { year, month } = parisParts(date);
  return month >= 9 ? year : year - 1;
}

/** The first of September that opened the school year of `now`, at midnight in Paris. */
export const schoolYearStart = (now: Date) => parisTime(schoolYearOf(now), 9, 1, 0);
