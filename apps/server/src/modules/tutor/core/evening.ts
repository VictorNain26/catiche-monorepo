/**
 * The evening of homework as Tom leads it (`docs/methode.md`, « Les gestes d'une soirée »): its
 * steps, the tools each allows, and what Tom reads of it at every turn, from the tables, never from
 * the conversation.
 */

import type { EveningSubject } from '../../../domain/subjects';

/** Noter, ordonner, faire étape par étape, préparer le cartable, finir (`app-cible.md`, E5). */
export const EVENING_PHASES = ['note', 'order', 'steps', 'bag', 'done'] as const;
export type EveningPhase = (typeof EVENING_PHASES)[number];

export const HOMEWORK_STATES = ['todo', 'done'] as const;
export type HomeworkState = (typeof HOMEWORK_STATES)[number];

export const TOOL_NAMES = ['note_homework', 'update_homework', 'reorder', 'note_test', 'finish_step', 'programme', 'calculate'] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

/**
 * The tools of each step. While noting, nothing on the content: the inventory comes first (E1);
 * the content waits for the steps.
 */
export const PHASE_TOOLS: Record<EveningPhase, ToolName[]> = {
  note: ['note_homework', 'update_homework', 'note_test', 'finish_step'],
  order: ['note_homework', 'update_homework', 'note_test', 'reorder', 'finish_step'],
  steps: [...TOOL_NAMES],
  bag: ['update_homework', 'note_test', 'finish_step'],
  done: ['note_homework', 'note_test', 'finish_step'],
};

const PHASE_WORDS: Record<EveningPhase, string> = { note: 'noter', order: 'ordre', steps: 'étapes', bag: 'cartable', done: 'fin' };

export interface EveningState {
  /** Typed by the parent: data, never an instruction. */
  firstName: string;
  /** The evening's day, YYYY-MM-DD. */
  today: string;
  phase: EveningPhase;
  /** Tonight's plan, ranked, and the homework left to do. */
  homework: { id: string; subject: EveningSubject; task: string; dueOn: string | null; rank: number | null; state: HomeworkState }[];
  /** From today on. */
  tests: { subject: EveningSubject; day: string; topic: string | null }[];
}

// The day is read at noon UTC: the same day everywhere.
const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' });

const due = (dueOn: string | null) => (dueOn === null ? 'pour : à demander' : `pour ${dueOn}`);

/** What Tom reads of the evening, at the head of the student's message: the server's truth. */
export function eveningText({ firstName, today, phase, homework, tests }: EveningState): string {
  const plan = homework.filter((each) => each.rank !== null).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  const others = homework.filter((each) => each.rank === null && each.state === 'todo');
  const lines = [
    `Prénom : ${firstName}`,
    `Aujourd’hui : ${weekday.format(new Date(`${today}T12:00:00Z`))} ${today}`,
    `Étape : ${PHASE_WORDS[phase]}`,
  ];
  if (plan.length > 0) {
    lines.push(
      'Plan de ce soir :',
      ...plan.map(
        (each, index) =>
          `${String(index + 1)}. [${each.id}] ${each.subject} : ${each.task}, ${due(each.dueOn)}, ${each.state === 'done' ? 'fait' : 'à faire'}`,
      ),
    );
  }
  if (others.length > 0)
    lines.push('Autres devoirs à faire :', ...others.map((each) => `- [${each.id}] ${each.subject} : ${each.task}, ${due(each.dueOn)}`));
  if (tests.length > 0) {
    lines.push('Contrôles à venir :', ...tests.map(({ subject, day, topic }) => `- ${subject} le ${day}${topic ? ` : ${topic}` : ''}`));
  }
  if (homework.length === 0 && tests.length === 0) lines.push('Rien de noté pour l’instant.');
  return lines.join('\n');
}
