/** The summary of the week (`/api/summary`), which the guardian and the student read alike. */

import { queryOptions } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { api, parseResponse } from './api';
import { listWords } from './household';

export type WeekSummary = InferResponseType<typeof api.summary.$get, 200>;
type SubjectFamily = WeekSummary['subjects'][number]['subject'];

/** The signed-in student's own summary. */
export const ownSummaryQuery = queryOptions({
  queryKey: ['summary'],
  queryFn: () => parseResponse(api.summary.$get()),
});

/** A student's summary, for a guardian of their household. */
export const summaryQuery = (studentId: string) =>
  queryOptions({
    queryKey: ['summary', studentId],
    queryFn: () => parseResponse(api.summary[':studentId'].$get({ param: { studentId } })),
  });

/** The time of the week, rounded to five minutes by the server: never « 0 min ». */
export function minutesText(minutes: number): string {
  if (minutes === 0) return 'moins de 5 min';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `environ ${String(rest)} min`;
  return rest === 0 ? `environ ${String(hours)} h` : `environ ${String(hours)} h ${String(rest)}`;
}

// The server dates a day in Paris (YYYY-MM-DD): read at noon UTC, it is the same day everywhere.
const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' });

/**
 * The evenings of the week in a line, for every adult of the child: the days, without a time nor a
 * subject (`docs/plans/app-cible.md`, A5).
 */
export function eveningsLine(name: string, days: readonly string[]): string {
  if (days.length === 0) return `${name} n’a pas travaillé ces sept derniers jours.`;
  return `Cette semaine, ${name} a travaillé ${listWords(days.map((day) => weekday.format(new Date(`${day}T12:00:00Z`))))}.`;
}

const SUBJECTS: Record<SubjectFamily, string> = {
  mathematiques: 'Maths',
  francais: 'Français',
  langues: 'Langues',
  sciences: 'Sciences',
  'histoire-geo': 'Histoire-géo',
  general: 'Autre',
};

export const subjectLabel = (subject: SubjectFamily) => SUBJECTS[subject];

/**
 * A question for the parent, from a notion that resists: the child shows, the parent listens,
 * nothing to know of the subject. Said to the parent,
 * or to the child, never the adult's sentence to a pupil.
 */
export function questionFor(reader: 'guardian' | 'student', name: string, notion: string): string {
  return reader === 'guardian'
    ? `Demandez à ${name} de vous montrer un exercice sur « ${notion} », et où ça coince.`
    : `Ton parent peut te demander de lui montrer un exercice sur « ${notion} », et où ça coince.`;
}
