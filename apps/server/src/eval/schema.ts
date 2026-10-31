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

const scenarioFields = {
  id: text,
  origin: z.enum(['protocol-2026-10-01', 'agent-md-9', 'methode-2026-10-20']),
  name: text,
  description: text,
  grading: z.array(z.enum(['leak', 'help', 'safety', 'evening'])).min(1),
  expectedBehavior: text,
  /** The judge's questions of a safety scenario or an evening, its own. */
  checks: z.array(checkSchema).default([]),
};

/** An exercise played with turns written in advance. */
const writtenScenarioSchema = z.strictObject({
  ...scenarioFields,
  exercises: z.union([z.literal('all'), z.array(text).min(1)]),
  turns: z
    .array(turnSchema)
    .min(1)
    .refine(([first]) => first !== undefined && turnText(first).includes(STATEMENT_PLACEHOLDER), {
      message: `the first turn must contain ${STATEMENT_PLACEHOLDER}`,
    }),
});

/** An evening at a class, without an exercise: a simulated student (student.ts) writes each message. */
const simulatedScenarioSchema = z.strictObject({
  ...scenarioFields,
  level: schoolLevelSchema,
  student: z.strictObject({ persona: text, goal: text, maxTurns: z.number().int().min(1).max(12) }),
});

const scenarioSchema = z.union([writtenScenarioSchema, simulatedScenarioSchema]);

const judgeQuestionsSchema = z.strictObject({ leak: z.array(checkSchema).min(1), help: z.array(checkSchema).min(1) });

const OWN_CHECKS = ['safety', 'evening'] as const;
const hasOwnChecks = (scenario: Scenario) => OWN_CHECKS.some((grading) => scenario.grading.includes(grading));

export const isSimulated = (scenario: Scenario): scenario is SimulatedScenario => 'student' in scenario;

/** The judge's questions on a scenario, by its gradings: the grid's, then its own checks. */
export function scenarioQuestions(scenario: Scenario, grid: z.infer<typeof judgeQuestionsSchema>): Check[] {
  return [
    ...(scenario.grading.includes('leak') ? grid.leak : []),
    ...(scenario.grading.includes('help') ? grid.help : []),
    ...(hasOwnChecks(scenario) ? scenario.checks : []),
  ];
}

export const datasetSchema = z
  .strictObject({
    exercises: z.array(exerciseSchema).min(1),
    scenarios: z.array(scenarioSchema).min(1),
    /** The judge's questions for the leak and help gradings, Victor's grid of 2026-10-06 and the later notion of the A/B. */
    judgeQuestions: judgeQuestionsSchema,
  })
  .superRefine(({ exercises, scenarios, judgeQuestions }, ctx) => {
    const exerciseIds = new Set<string>();
    for (const { id } of exercises) {
      if (exerciseIds.has(id)) ctx.addIssue({ code: 'custom', message: `duplicate exercise id ${id}` });
      exerciseIds.add(id);
    }
    const scenarioIds = new Set<string>();
    // Langfuse holds a question under its id, its wording as the description (langfuse.ts).
    const wordings = new Map<string, string>();
    for (const scenario of scenarios) {
      for (const { id, question } of scenarioQuestions(scenario, judgeQuestions)) {
        if ((wordings.get(id) ?? question) !== question) {
          ctx.addIssue({ code: 'custom', message: `judge question id ${id} has two wordings` });
        }
        wordings.set(id, question);
      }
      if (scenarioIds.has(scenario.id)) {
        ctx.addIssue({ code: 'custom', message: `duplicate scenario id ${scenario.id}` });
      }
      scenarioIds.add(scenario.id);
      if (hasOwnChecks(scenario) !== scenario.checks.length > 0) {
        ctx.addIssue({ code: 'custom', message: `scenario ${scenario.id}: own checks go with the safety or evening grading, and only there` });
      }
      // The grid of the leak and the help reads an exercise, which an evening does not have.
      if (isSimulated(scenario) && (scenario.grading.includes('leak') || scenario.grading.includes('help'))) {
        ctx.addIssue({ code: 'custom', message: `scenario ${scenario.id}: an evening grades neither the leak nor the help` });
      }
      // Each question's rate is published under its id, and `critical` names the rate of inappropriate responses.
      const questionIds = scenarioQuestions(scenario, judgeQuestions).map(({ id }) => id);
      for (const [index, id] of questionIds.entries()) {
        if (id === 'critical' || questionIds.indexOf(id) !== index) {
          ctx.addIssue({ code: 'custom', message: `scenario ${scenario.id}: judge question id ${id} is reserved or asked twice` });
        }
      }
      if (isSimulated(scenario) || scenario.exercises === 'all') continue;
      for (const id of scenario.exercises) {
        if (!exerciseIds.has(id)) {
          ctx.addIssue({ code: 'custom', message: `scenario ${scenario.id} targets unknown exercise ${id}` });
        }
      }
    }
  });

export type Exercise = z.infer<typeof exerciseSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type WrittenScenario = z.infer<typeof writtenScenarioSchema>;
export type SimulatedScenario = z.infer<typeof simulatedScenarioSchema>;
export type Check = z.infer<typeof checkSchema>;
