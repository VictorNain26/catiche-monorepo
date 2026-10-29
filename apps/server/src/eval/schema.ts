import { z } from 'zod';
import { schoolLevelSchema } from '../domain/levels';
import { SUBJECT_SLUGS } from '../domain/subjects';

export const STATEMENT_PLACEHOLDER = '{statement}';

const text = z.string().trim().min(1);

const shortAnswerSchema = z.strictObject({
  kind: z.literal('short'),
  text,
  /**
   * Canonical forms of the answer, plain text. The leak check matches them as whole words
   * after normalising the tutor output (KaTeX, minus signs, spaces).
   */
  leakForms: z.array(text).min(1),
  verification: z.discriminatedUnion('method', [
    /** Recomputed from the numbers of the statement by `eval-dataset.test.ts`. */
    z.strictObject({ method: z.literal('computation') }),
    z.strictObject({ method: z.literal('reference'), rule: text, source: z.url() }),
  ]),
});

const writtenAnswerSchema = z.strictObject({
  kind: z.literal('written'),
  /** What counts as a leak: decided by the judge, not by string matching. */
  leak: text,
  expectedElements: z.array(text).min(1),
});

const exerciseSchema = z.strictObject({
  id: text,
  origin: z.enum(['protocol-2026-10-01', 'original']),
  level: schoolLevelSchema,
  subject: z.enum(SUBJECT_SLUGS),
  topic: text,
  /** Programme in force in 2026-2027 that covers the exercise, quoted verbatim. */
  programme: z.strictObject({ reference: text, quote: text, source: z.url() }),
  /**
   * Entries of `apps/server/src/referential/` the exercise works, and entries of later
   * classes whose notions the help must not rely on. Null while the subject has no
   * referential. An entry of a later class in `entries` marks an exercise beyond its class.
   */
  alignment: z.strictObject({ entries: z.array(text).min(1), laterEntries: z.array(text) }).nullable(),
  statement: text,
  /** The error behind the attempt the statement contains, given to the judge as a reference; null without an attempt. */
  studentError: text.nullable(),
  answer: z.discriminatedUnion('kind', [shortAnswerSchema, writtenAnswerSchema]),
  review: z.strictObject({ by: text, at: z.iso.date() }).nullable(),
});

/**
 * A yes/no question the judge answers on a conversation, with the answer that passes; a critical
 * one failed makes the response inappropriate whatever the others.
 */
const checkSchema = z.strictObject({ id: text, question: text, pass: z.enum(['oui', 'non']), critical: z.boolean().default(false) });

/** A student message; a spoken one goes through the voice channel, as the microphone sends it. */
const turnSchema = z.union([text, z.strictObject({ text, inputMode: z.literal('voice') })]);

export function turnText(turn: z.infer<typeof turnSchema>): string {
  return typeof turn === 'string' ? turn : turn.text;
}

const scenarioSchema = z.strictObject({
  id: text,
  origin: z.enum(['protocol-2026-10-01', 'agent-md-9']),
  name: text,
  description: text,
  exercises: z.union([z.literal('all'), z.array(text).min(1)]),
  turns: z
    .array(turnSchema)
    .min(1)
    .refine(([first]) => first !== undefined && turnText(first).includes(STATEMENT_PLACEHOLDER), {
      message: `the first turn must contain ${STATEMENT_PLACEHOLDER}`,
    }),
  grading: z.array(z.enum(['leak', 'help', 'safety'])).min(1),
  expectedBehavior: text,
  /** The judge's questions for a safety scenario, its own. */
  safetyChecks: z.array(checkSchema).default([]),
});

const judgeQuestionsSchema = z.strictObject({ leak: z.array(checkSchema).min(1), help: z.array(checkSchema).min(1) });

/** The judge's questions on a scenario, by its gradings: the grid's, then its own safety checks. */
export function scenarioQuestions(scenario: z.infer<typeof scenarioSchema>, grid: z.infer<typeof judgeQuestionsSchema>): Check[] {
  return [
    ...(scenario.grading.includes('leak') ? grid.leak : []),
    ...(scenario.grading.includes('help') ? grid.help : []),
    ...(scenario.grading.includes('safety') ? scenario.safetyChecks : []),
  ];
}

export const datasetSchema = z
  .strictObject({
    exercises: z.array(exerciseSchema).min(1),
    scenarios: z.array(scenarioSchema).min(1),
    /** The judge's questions for the leak and help gradings, Victor's grid of 2026-10-06. */
    judgeQuestions: judgeQuestionsSchema,
  })
  .superRefine(({ exercises, scenarios, judgeQuestions }, ctx) => {
    const exerciseIds = new Set<string>();
    for (const { id } of exercises) {
      if (exerciseIds.has(id)) ctx.addIssue({ code: 'custom', message: `duplicate exercise id ${id}` });
      exerciseIds.add(id);
    }
    const scenarioIds = new Set<string>();
    for (const scenario of scenarios) {
      if (scenarioIds.has(scenario.id)) {
        ctx.addIssue({ code: 'custom', message: `duplicate scenario id ${scenario.id}` });
      }
      scenarioIds.add(scenario.id);
      if (scenario.grading.includes('safety') !== scenario.safetyChecks.length > 0) {
        ctx.addIssue({ code: 'custom', message: `scenario ${scenario.id}: safety checks go with safety grading, and only there` });
      }
      // Each question's rate is published under its id, and `critical` names the rate of inappropriate responses.
      const questionIds = scenarioQuestions(scenario, judgeQuestions).map(({ id }) => id);
      for (const [index, id] of questionIds.entries()) {
        if (id === 'critical' || questionIds.indexOf(id) !== index) {
          ctx.addIssue({ code: 'custom', message: `scenario ${scenario.id}: judge question id ${id} is reserved or asked twice` });
        }
      }
      if (scenario.exercises === 'all') continue;
      for (const id of scenario.exercises) {
        if (!exerciseIds.has(id)) {
          ctx.addIssue({ code: 'custom', message: `scenario ${scenario.id} targets unknown exercise ${id}` });
        }
      }
    }
  });

export type Exercise = z.infer<typeof exerciseSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type Check = z.infer<typeof checkSchema>;
