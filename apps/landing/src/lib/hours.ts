// An hour of running text, the French way: « 17 h 30 », « 18 h » (the application's screens keep « 17:30 »). The spaces
// do not break, so the hour stays on one line.
const HOUR = /^(?<hour>\d{1,2}):(?<minutes>\d{2})$/u;
const NO_BREAK_SPACE = String.fromCodePoint(0xa0);

export function spokenHour(time: string): string {
  const groups = HOUR.exec(time)?.groups;
  if (!groups?.['hour'] || !groups['minutes']) return time;
  const hour = `${String(Number(groups['hour']))}${NO_BREAK_SPACE}h`;
  return groups['minutes'] === '00' ? hour : `${hour}${NO_BREAK_SPACE}${groups['minutes']}`;
}
