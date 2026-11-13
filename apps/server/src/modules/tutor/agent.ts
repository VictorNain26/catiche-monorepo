/**
 * Tom: the AI SDK's tool loop (`platform/ai/client.ts`, `runAgent`) with the evening's tools. Each
 * tool is built for one turn, its student and evening held by the server: no input of the model
 * names a student or an evening, and every write checks the student in its own query
 * (`repository.ts`; OWASP LLM01). A refused input reaches the model as the tool's error, in words
 * it reads, and the loop goes on.
 */

import { tool, type ModelMessage } from 'ai';
import { z } from 'zod';
import type { SchoolLevel } from '../../domain/levels';
import { schoolYearOf } from '../../domain/school-calendar';
import { EVENING_SUBJECTS } from '../../domain/subjects';
import type { Ai } from '../../platform/ai/client';
import { calculate } from './core/calculate';
import { EVENING_PHASES, eveningText, HOMEWORK_STATES, PHASE_TOOLS, type ToolName } from './core/evening';
import { instructions } from './core/instructions';
import { programmeText, type NotionsFor } from './core/programme';
import { MAX_STEPS } from './core/turn-deadline';
import type { TutorRepository } from './repository';

/** Who and what a turn's tools act on, from the server alone. */
export interface Scope {
  studentId: string;
  firstName: string;
  level: SchoolLevel;
  eveningId: string;
  /** The evening's day, YYYY-MM-DD. */
  today: string;
}

const day = z.iso.date();
const task = z.string().trim().min(1).max(200);
const subject = z.enum(EVENING_SUBJECTS);

function tomTools({ repository, notions }: { repository: TutorRepository; notions: NotionsFor }, scope: Scope) {
  const { studentId, eveningId, today } = scope;
  /** The evening after a write, as the next step reads it. */
  const evening = async () => eveningText({ firstName: scope.firstName, today, ...(await repository.eveningState(studentId, eveningId, today)) });
  const notPast = (date: string | null) => {
    if (date !== null && date < today) throw new Error(`Le ${date} est passé : demande le bon jour à l'élève.`);
  };

  return {
    note_homework: tool({
      description: 'Note un devoir de l’élève, avec ses mots. dueOn : le jour où il est à rendre, null tant que l’élève ne l’a pas dit.',
      inputSchema: z.object({ subject, task, dueOn: day.nullable() }),
      execute: async (noted) => {
        notPast(noted.dueOn);
        await repository.noteHomework(studentId, noted);
        return evening();
      },
    }),
    update_homework: tool({
      description: 'Change un devoir déjà noté, par son id du bloc soirée : ses mots, son échéance, ou le marque fait.',
      inputSchema: z
        .object({ id: z.uuid(), task: task.optional(), dueOn: day.nullable().optional(), state: z.enum(HOMEWORK_STATES).optional() })
        .refine((patch) => patch.task !== undefined || patch.dueOn !== undefined || patch.state !== undefined, 'au moins un changement'),
      execute: async ({ id, ...patch }) => {
        notPast(patch.dueOn ?? null);
        if (!(await repository.updateHomework(studentId, eveningId, id, patch)))
          throw new Error(`Aucun devoir ${id} : reprends un id du bloc soirée.`);
        return evening();
      },
    }),
    reorder: tool({
      description: 'Enregistre l’ordre de ce soir : les ids des devoirs à faire, le premier d’abord.',
      inputSchema: z.object({ ids: z.array(z.uuid()).min(1).max(20) }),
      execute: async ({ ids }) => {
        if (!(await repository.reorder(studentId, eveningId, ids)))
          throw new Error('Aucun devoir à faire pour l’un de ces ids : reprends ceux du bloc soirée.');
        return evening();
      },
    }),
    note_test: tool({
      description: 'Note un contrôle annoncé : sa matière, son jour, et ce qu’il porte si l’élève le sait.',
      inputSchema: z.object({ subject, day, topic: z.string().trim().max(200).nullable() }),
      execute: async (noted) => {
        notPast(noted.day);
        await repository.noteTest(studentId, noted);
        return evening();
      },
    }),
    finish_step: tool({
      description: 'Passe à une autre étape de la soirée : note, order, steps, bag, done.',
      inputSchema: z.object({ next: z.enum(EVENING_PHASES) }),
      execute: async ({ next }) => {
        await repository.setPhase(studentId, eveningId, next);
        return evening();
      },
    }),
    programme: tool({
      description: 'Le programme officiel de la classe de l’élève : sans theme, ses thèmes ; avec un theme, ce qu’il contient.',
      inputSchema: z.object({ subject: z.enum(['mathematiques', 'francais']), theme: z.string().trim().max(120).nullable() }),
      execute: ({ subject: asked, theme }) =>
        programmeText(notions, { level: scope.level, subject: asked, schoolYear: schoolYearOf(new Date(`${today}T12:00:00Z`)), theme }),
    }),
    calculate: tool({
      description: 'Calcule une expression arithmétique : nombres, + - * / ^ %, parenthèses, sqrt.',
      inputSchema: z.object({ expression: z.string().max(200) }),
      execute: ({ expression }) => calculate(expression),
    }),
  } satisfies Record<ToolName, unknown>;
}

export function createTom({ ai, repository, notions }: { ai: Ai; repository: TutorRepository; notions: NotionsFor }) {
  return {
    /** Tom's reply to `messages`, the student's last, with what his calculator gave on the way. */
    async reply(scope: Scope, sessionId: string, messages: ModelMessage[]) {
      const reply = await ai.runAgent({
        operation: 'tom',
        owner: { studentId: scope.studentId },
        instructions: instructions({ level: scope.level, today: scope.today }),
        messages,
        tools: tomTools({ repository, notions }, scope),
        maxSteps: MAX_STEPS,
        // Read again at each step: finish_step changes the tools of the next.
        activeTools: async () => PHASE_TOOLS[await repository.eveningPhase(scope.studentId, scope.eveningId)],
        promptCacheKey: sessionId,
      });
      return {
        text: reply.text,
        reasoning: reply.reasoning,
        calculated: reply.toolResults.flatMap(({ toolName, output }) => (toolName === 'calculate' && typeof output === 'string' ? [output] : [])),
      };
    },
  };
}

export type Tom = ReturnType<typeof createTom>;
