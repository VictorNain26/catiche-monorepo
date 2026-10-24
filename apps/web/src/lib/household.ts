/** The guardian's household, as `/api/household` serves it: its students, their devices and codes. */

import { isStudentBirthMonth, STUDENT_AGE_YEARS } from '@repo/server/student-age';
import { queryOptions } from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from 'hono/client';
import { ticked, z } from './zod';
import { api, isProblem, parseResponse } from './api';
import { FAILED, TOO_MANY_TRIES } from './auth';
import { listWords } from './words';

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

/** The levels as a menu lists them, in school order. */
export const LEVEL_OPTIONS = Object.entries(LEVEL_LABELS);

/**
 * The months as a menu lists them, from January: a list, since an object with « 10 » for a key
 * would put October first (integer-like keys come first in JavaScript).
 */
export const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map(
  (label, index) => [String(index + 1).padStart(2, '0'), label] as const,
);

export const isLevel = (value: unknown): value is Level => typeof value === 'string' && Object.hasOwn(LEVEL_LABELS, value);

export const studentsQuery = queryOptions({
  queryKey: ['students'],
  queryFn: () => parseResponse(students.$get()),
});

export const studentDevicesQuery = (studentId: string) =>
  queryOptions({
    queryKey: ['students', studentId, 'devices'],
    queryFn: () => parseResponse(students[':id'].devices.$get({ param: { id: studentId } })),
  });

/** What the guardian changes of the household, each request as the server takes it. */
export const addStudent = (json: InferRequestType<typeof students.$post>['json']) => parseResponse(students.$post({ json }));

export const updateStudent = (id: string, json: InferRequestType<(typeof students)[':id']['$patch']>['json']) =>
  parseResponse(students[':id'].$patch({ param: { id }, json }));

export const deleteStudent = (id: string) => parseResponse(students[':id'].$delete({ param: { id } }));

/** The adult confirms holding parental authority over a child linked to them before the declaration existed. */
export const declareGuardian = (id: string) => parseResponse(students[':id'].declaration.$post({ param: { id }, json: { declaredGuardian: true } }));

export type ActivationReason = InferRequestType<(typeof students)[':id']['activation-code']['$post']>['json']['reason'];

/** A one-time code that puts the child's profile on a new device, or lets them choose a new code. */
export const activationCode = (id: string, reason: ActivationReason) =>
  parseResponse(students[':id']['activation-code'].$post({ param: { id }, json: { reason } }));

/** The child's tries on the device start again. */
export const unblockDevice = (id: string, deviceId: string) =>
  parseResponse(students[':id'].devices[':deviceId'].unblock.$post({ param: { id, deviceId } }));

/** The device no longer holds the child's profile, and their sessions there close. */
export const removeDevice = (id: string, deviceId: string) =>
  parseResponse(students[':id'].devices[':deviceId'].$delete({ param: { id, deviceId } }));

/** For a parent: the other adults of the child, and the invitations still waiting. */
export const adultsQuery = (studentId: string) =>
  queryOptions({
    queryKey: ['students', studentId, 'adults'],
    queryFn: () => parseResponse(students[':id'].adults.$get({ param: { id: studentId } })),
  });

export type InvitationInput = InferRequestType<(typeof students)[':id']['invitations']['$post']>['json'];
export type AdultRole = InvitationInput['role'];

/** A parent invites an adult for the child; the adult receives an email, the other parents are told. */
export const inviteAdult = (id: string, json: InvitationInput) => parseResponse(students[':id'].invitations.$post({ param: { id }, json }));

/** A parent removes a relative, or a relative themselves. */
export const removeAdult = (id: string, adultId: string) => parseResponse(students[':id'].adults[':adultId'].$delete({ param: { id, adultId } }));

/** A parent withdraws an invitation still waiting. */
export const withdrawInvitation = (id: string, invitationId: string) =>
  parseResponse(students[':id'].invitations[':invitationId'].$delete({ param: { id, invitationId } }));

/** The role as a list of adults says it. */
export const ROLE_LABELS: Record<AdultRole, string> = { guardian: 'parent', relative: 'proche' };

const isRole = (value: unknown): value is AdultRole => typeof value === 'string' && Object.hasOwn(ROLE_LABELS, value);

/** The two roles a parent chooses from, named with the child's first name (A8). */
export const roleChoices = (name: string) =>
  [
    ['guardian', `Parent ou tuteur de ${name}`],
    ['relative', 'Un proche : beau-parent, grand-parent, assistante familiale…'],
  ] as const satisfies readonly (readonly [AdultRole, string])[];

/** The invitation of an adult, as the server takes it. */
export const inviteSchema = z.object({
  email: z.string().trim().pipe(z.email('Écrivez son adresse e-mail, par exemple nom@exemple.fr.')),
  role: z.custom<AdultRole>(isRole, 'Choisissez : parent ou proche.'),
});

/** A failed household request, in words a parent reads; the server's own message never shows. */
export function householdMessage(error: unknown, invalid = 'Vérifiez ce que vous avez saisi.'): string {
  if (isProblem(error, 'INVALID_REQUEST')) return invalid;
  if (isProblem(error, 'NOT_FOUND')) return 'Cet enfant ou cet appareil n’est plus dans votre foyer.';
  if (isProblem(error, 'RATE_LIMITED')) return TOO_MANY_TRIES;
  return FAILED;
}

/** The declaration of parental authority, the box's own words, and what it means under it, wherever the adult ticks it. */
export const GUARDIAN_LABEL = 'J’exerce l’autorité parentale sur cet enfant, ou sa tutelle.';
export const GUARDIAN_HINT =
  'Votre accord suffit pour qu’il utilise Catiche. Un autre parent pourra s’y opposer, depuis son compte ou en écrivant à contact@catiche.fr.';

/** A first name as the server takes it, a child's or an adult's; `missing`: what to do when it is empty. */
export const firstName = (missing: string) => z.string().trim().min(1, missing).max(50, '50 caractères au plus.');

const name = firstName('Écrivez son prénom.');
const level = z.custom<Level>(isLevel, 'Choisissez sa classe.');

export const studentSchema = z.object({ name, level });

const { min, max } = STUDENT_AGE_YEARS;

/** The ages the server takes, as a parent reads them. */
export const CHILD_AGES = `entre ${String(min)} et ${String(max)} ans`;

/**
 * The years with a month the server takes, the youngest last: a child of 20 may be born 21 years
 * ago. The months taken run unbroken over years, so a year has one when its January or December is.
 */
export const birthYears = (now = new Date()) =>
  Array.from({ length: max - min + 2 }, (_, index) => String(now.getUTCFullYear() - max - 1 + index)).filter(
    (year) => isStudentBirthMonth(`${year}-01`, now) || isStudentBirthMonth(`${year}-12`, now),
  );

/** A new child as the adding asks it, month and year in two menus, as the server takes it. */
export const newChildSchema = (now = new Date()) =>
  studentSchema
    .extend({
      month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Choisissez son mois de naissance.'),
      year: z.string().regex(/^\d{4}$/, 'Choisissez son année de naissance.'),
      declaredGuardian: ticked,
    })
    .refine(({ month, year }) => isStudentBirthMonth(`${year}-${month}`, now), {
      path: ['year'],
      message: `Votre enfant a ${CHILD_AGES} : vérifiez son mois et son année.`,
    })
    .transform(({ month, year, ...child }) => ({ ...child, birthMonth: `${year}-${month}` }));

/** The head of « Gérer » for a parent (A7): who decides for the child with them. */
export const decidesWith = (name: string, parents: readonly string[]) =>
  parents.length === 0 ? `Vous décidez pour ${name}.` : `Vous décidez pour ${name}, avec ${listWords(parents)}.`;

/** For a relative, who adds no device (`app-cible.md`, question tranchée 3): the parents to ask. */
export const askParents = (parents: readonly string[]) => `Pour ajouter un appareil, demandez un code de départ à ${listWords(parents, ' ou à ')}.`;

/** What the guardian reads of the learner memory of their child. */
export function memoryStatus({ name, memory }: Pick<Student, 'name' | 'memory'>): string {
  if (memory.state === 'active') return `${name} l’a acceptée : Tom retient les notions de ses exercices et ce qui a résisté.`;
  if (memory.decidesAlone) return `À partir de 15 ans, c’est ${name} qui décide${memory.state === 'asked' ? ' : la question lui est posée' : ''}.`;
  if (memory.state === 'asked') return `Proposée : ${name} répondra à sa prochaine visite.`;
  return memory.proposed ? `${name} l’a refusée.` : 'Pas proposée : Tom ne retient rien d’une séance à l’autre.';
}
