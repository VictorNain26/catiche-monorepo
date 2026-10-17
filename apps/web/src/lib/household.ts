/** The guardian's household, as `/api/household` serves it: its students and their devices. */

import { queryOptions } from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from 'hono/client';
import { z } from './zod';
import { api, isProblem, parseResponse } from './api';

const students = api.household.students;

export type Student = InferResponseType<typeof students.$get, 200>[number];
export type Level = InferRequestType<typeof students.$post>['json']['level'];

/** Every level the server takes, in school order: a level it adds fails the typecheck here. */
export const LEVEL_LABELS: Record<Level, string> = {
  sixieme: 'Sixième',
  cinquieme: 'Cinquième',
  quatrieme: 'Quatrième',
  troisieme: 'Troisième',
};

export const isLevel = (value: unknown): value is Level => typeof value === 'string' && Object.hasOwn(LEVEL_LABELS, value);

export const studentsQuery = queryOptions({
  queryKey: ['students'],
  queryFn: () => parseResponse(students.$get()),
});

export const devicesQuery = (studentId: string) =>
  queryOptions({
    queryKey: ['students', studentId, 'devices'],
    queryFn: () => parseResponse(students[':id'].devices.$get({ param: { id: studentId } })),
  });

/** A failed household request, in words a parent reads; the server's own message never shows. */
export function householdMessage(error: unknown, invalid = 'Vérifiez ce que vous avez saisi.'): string {
  if (isProblem(error, 'INVALID_REQUEST')) return invalid;
  if (isProblem(error, 'NOT_FOUND')) return 'Cet enfant ou cet appareil n’est plus dans votre foyer.';
  if (isProblem(error, 'RATE_LIMITED')) return 'Trop d’essais. Patientez une minute avant de réessayer.';
  return 'Une erreur est survenue. Réessayez dans un instant.';
}

const name = z.string().trim().min(1, 'Son prénom.').max(50, '50 caractères au plus.');
const level = z.custom<Level>(isLevel, 'Sa classe.');

export const studentSchema = z.object({ name, level });

// The ages the server takes (modules/household/routes.ts), in UTC as it counts them: a contract
// the server does not export as a value, and no test holds the two together.
const MIN_AGE_YEARS = 5;
const MAX_AGE_YEARS = 20;

/** The years a child of 5 to 20 was born in, the youngest last. */
export const birthYears = (now = new Date()) =>
  Array.from({ length: MAX_AGE_YEARS - MIN_AGE_YEARS + 1 }, (_, index) => String(now.getUTCFullYear() - MAX_AGE_YEARS + index));

/** A new child as the adding asks it, month and year in two menus, as the server takes it. */
export const newChildSchema = (now = new Date()) =>
  studentSchema
    .extend({
      month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Son mois.'),
      year: z.string().regex(/^\d{4}$/, 'Son année.'),
      memoryProposed: z.boolean(),
    })
    .refine(
      ({ month, year }) => {
        const birth = `${year}-${month}`;
        const youngest = `${String(now.getUTCFullYear() - MIN_AGE_YEARS)}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
        const oldest = `${String(now.getUTCFullYear() - MAX_AGE_YEARS)}-01`;
        return birth >= oldest && birth <= youngest;
      },
      { path: ['year'], message: 'Votre enfant a entre 5 et 20 ans : vérifiez son année.' },
    )
    .transform(({ month, year, ...child }) => ({ ...child, birthMonth: `${year}-${month}` }));

/** What the guardian reads of the learner memory of their child. */
export function memoryStatus({ name, memory }: Pick<Student, 'name' | 'memory'>): string {
  if (memory.state === 'active') return `${name} l’a acceptée : Tom retient les notions de ses exercices et ce qui a résisté.`;
  if (memory.decidesAlone) return `À partir de 15 ans, c’est ${name} qui décide${memory.state === 'asked' ? ' : la question lui est posée' : ''}.`;
  if (memory.state === 'asked') return `Proposée : ${name} répondra à sa prochaine visite.`;
  return memory.proposed ? `${name} l’a refusée.` : 'Pas proposée : Tom ne retient rien d’une séance à l’autre.';
}
