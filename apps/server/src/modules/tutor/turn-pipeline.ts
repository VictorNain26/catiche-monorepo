/**
 * A turn of the tutor, once the service has opened it (the student, their session locked, the
 * quota read): the student's message filtered (moderation and distress), understood (the
 * analysis), anchored (the exercise's sheet), decided (diagnosis and level, by the code), written,
 * checked, then stored with the record of what was decided. Its dependencies are passed.
 */

import type { Logger } from 'pino';
import { detectDistress, DISTRESS_REPLY, type DistressSource } from '../../domain/distress';
import type { Ai } from '../../platform/ai/client';
import type { InputModeration, Moderation } from '../../platform/ai/moderation';
import type { StudentDirectory } from '../household';
import { analyseTurn, turnInstruction, type TurnAnalysis } from './core/analysis';
import { assembleChatPrompt, replayable, type HistoryTurn } from './core/assembler';
import { writeChecked } from './core/controlled-turn';
import { drawsSheet, prepareExerciseTurn } from './core/exercise-turn';
import { hintOf } from './core/ladder';
import type { OutputCheckContext } from './core/output-check';
import { photoText, readPhoto, saidWith, type Photo } from './core/photo';
import { studentBlock, subjectBlock, systemPrompt } from './core/prompt';
import { routeReasoningEffort } from './core/reasoning';
import { exerciseBlock, SHEET_PROMPT_VERSION } from './core/sheet';
import { RECENT_MESSAGES, SUMMARY_BACKLOG, summarize } from './core/summary';
import { titleFor } from './core/title';
import { TURN_PROMPT_VERSION } from './core/version';
import type { TutorRepository } from './repository';

/** The messages after the summary the tutor reads back: room for one summary late or failed, so that none falls between it and the window. */
const WINDOW = 2 * SUMMARY_BACKLOG;

export interface TurnInput {
  /** What the student typed; empty when a photo comes alone. */
  text: string;
  inputMode: 'text' | 'voice';
  /** A photo of the homework, read at the start of the turn and never kept. */
  image?: Photo;
}

/** The student's message as the conversation keeps it: their words, and the text of their photo. */
interface Sent {
  studentText: string;
  photoText: string | null;
}

/** What the student is told while they wait: reading their message, preparing a new exercise, writing. */
export type TurnStep = 'reading' | 'exercise' | 'writing';

/** The turn's reply, and what runs after it, once the session is free. */
export interface TurnReply {
  text: string;
  after: (() => Promise<void>) | null;
}

export type Student = NonNullable<Awaited<ReturnType<StudentDirectory['find']>>>;

/** A turn opened by the service: the student, their session as the lock read it, and when the turn started. */
export interface OpenTurn {
  student: Student;
  session: {
    id: string;
    title: string | null;
    subject: TurnAnalysis['subject'] | null;
    summary: string | null;
    summaryUntil: number | null;
    closedAt: Date | null;
    turnStartedAt: Date;
  };
  /** A distress already seen past the quota: the turn answers it, and nothing else. */
  distress: { source: DistressSource; flagged: string[] | null } | null;
}

interface Deps {
  repository: TutorRepository;
  ai: Ai;
  moderation: Moderation;
  logger: Logger;
  /** The learner memory of the exercise's notions, from the exercises before `before`; null while it is not active. */
  memoryOf: (learner: Student, notions: readonly string[], before: number | null) => Promise<string | null>;
}

const analysisRecord = ({ error, ...analysis }: TurnAnalysis) => (error === undefined ? analysis : null);

/** The student's message moderated; null when moderation could not answer, the rules then judging distress alone. */
export const moderateInput = (
  { moderation, logger }: { moderation: Moderation; logger: Logger },
  lastTutorText: string | null,
  text: string,
): Promise<InputModeration | null> =>
  moderation.studentTurn(lastTutorText, text).catch((err: unknown) => {
    logger.error({ err }, 'Input moderation unavailable, distress judged by the rules alone');
    return null;
  });

export function createTurnPipeline({ repository, ai, moderation, logger, memoryOf }: Deps) {
  const fixed = { model: ai.model, promptVersion: TURN_PROMPT_VERSION, newExercise: false, findings: [] };
  const fixedReply = (sent: Sent) => ({ ...sent, tutorText: DISTRESS_REPLY, replay: null });

  /** The fixed reply to a distress, the event recorded and the session closed; no failure to store it keeps the reply from the student. */
  async function answerDistress(studentId: string, sessionId: string, sent: Sent, distress: NonNullable<OpenTurn['distress']>) {
    await repository
      .closeForDistress(studentId, sessionId, distress.source, fixedReply(sent), {
        ...fixed,
        inputFlagged: distress.flagged,
        outcome: 'distress',
      })
      .catch((err: unknown) => {
        logger.error({ err }, 'Distress not stored');
      });
    return DISTRESS_REPLY;
  }

  /** After the reply: the title of the session's first turn, and the summary once enough messages wait. */
  async function afterTurn(
    studentId: string,
    session: OpenTurn['session'],
    turn: { studentText: string; tutorText: string; check: OutputCheckContext; first: boolean },
  ) {
    try {
      // The first turn only: a title held back is not asked again of every later turn.
      if (!session.title && turn.first) {
        const title = await titleFor({ ai, moderation, logger }, { studentId, ...turn });
        if (title) await repository.setTitle(session.id, title);
      }
      if ((await repository.countAfter(session.id, session.summaryUntil)) < SUMMARY_BACKLOG) return;
      const covered = (await repository.messagesAfter(session.id, session.summaryUntil)).slice(0, -RECENT_MESSAGES);
      const last = covered.at(-1);
      if (!last) return;
      const summary = await summarize({ ai, logger }, { studentId, previous: session.summary, messages: covered });
      if (summary) await repository.replaceSummary(session.id, session.summaryUntil, summary, last.position);
    } catch (err) {
      logger.error({ err }, 'After the turn: title or summary not stored');
    }
  }

  return async function turn(
    { student: learner, session, distress }: OpenTurn,
    input: TurnInput,
    onStep: (step: TurnStep) => void,
  ): Promise<TurnReply> {
    const studentText = input.text;
    // Before a distress, the photo is not read: the conversation keeps that one came.
    const unread: Sent = { studentText, photoText: input.image ? photoText(null) : null };

    // The conversation stopped at a distress: any later message gets the fixed reply again.
    if (session.closedAt) {
      await repository
        .saveTurn(session.id, {
          exchange: fixedReply(unread),
          subject: null,
          newExercise: null,
          exerciseId: null,
          progress: null,
          record: { ...fixed, outcome: 'closed' },
        })
        .catch((err: unknown) => {
          logger.error({ err }, 'Closed session turn not stored');
        });
      return { text: DISTRESS_REPLY, after: null };
    }

    if (distress) return { text: await answerDistress(learner.id, session.id, unread, distress), after: null };

    const [history, current] = await Promise.all([
      repository.window(session.id, WINDOW, session.summaryUntil),
      repository.currentExercise(learner.id, session.id),
    ]);
    const lastTutorText = history.findLast((row) => row.role === 'tutor')?.text ?? null;
    onStep('reading');
    // The photo first: its text is part of what the student says, for the analysis and the
    // diagnosis; the sheet and the writer read it fenced, the next turns with its message. The
    // photo itself goes no further.
    const photo = input.image ? photoText(await readPhoto({ ai, logger }, { studentId: learner.id, image: input.image })) : null;
    const sent: Sent = { studentText, photoText: photo };
    const said = saidWith(studentText, photo);
    // Started together; the distress waits for the moderation only, and drops the analysis.
    const analysed = analyseTurn(
      { ai, logger },
      { studentId: learner.id, studentText: said, lastTutorText, currentStatement: current?.sheet?.statement ?? null },
    );
    // The student's own words only: a text of the homework on the photo, a poem in the first
    // person, is no distress of theirs.
    const inputModeration = studentText ? await moderateInput({ moderation, logger }, lastTutorText, studentText) : null;

    // Distress before anything else: no sheet, no tutor, the fixed reply.
    const source = detectDistress(studentText, inputModeration?.flagged.includes('selfharm') ?? false);
    if (source)
      return {
        text: await answerDistress(learner.id, session.id, sent, { source, flagged: inputModeration?.flagged ?? null }),
        after: null,
      };
    const analysis = await analysed;

    // The detected subject, else the session's: the first one named stays the session's.
    const detected = analysis.subject === 'general' ? null : analysis.subject;
    const subject = detected ?? session.subject ?? undefined;

    if (drawsSheet({ analysis, current: current ?? null, studentText, photoText: photo })) onStep('exercise');
    const exerciseTurn = await prepareExerciseTurn(
      { ai, logger },
      {
        studentId: learner.id,
        level: learner.level,
        subject,
        analysis,
        current: current ?? null,
        studentText,
        lastTutorText,
        photoText: photo,
        now: new Date(),
      },
    );
    const { exercise, diagnosis, contract, change, hintLevel } = exerciseTurn;
    // From the exercises before this one: the same block at every turn of it, in the cache.
    const memory = exercise?.sheet ? await memoryOf(learner, exercise.sheet.entries, exerciseTurn.isNew ? null : (current?.position ?? null)) : null;

    const system = systemPrompt(learner.level);
    const instruction = contract ?? turnInstruction(analysis);
    const window = history.map((row): HistoryTurn => {
      const modelMessages = row.role === 'tutor' ? replayable(row.modelMessages) : undefined;
      return {
        role: row.role === 'student' ? 'user' : 'assistant',
        content: row.text,
        photoText: row.photoText,
        ...(modelMessages && { modelMessages }),
      };
    });
    const messages = (extra: string | null) =>
      assembleChatPrompt({
        systemPrompt: system,
        studentBlock: studentBlock(learner.name),
        exerciseBlock: exercise?.sheet ? exerciseBlock(exercise.sheet, memory) : null,
        conversationSummary: session.summary,
        history: window,
        subjectBlock: subjectBlock(subject),
        turnInstruction: [instruction, extra].filter((block): block is string => block !== null).join('\n\n') || null,
        inputMode: input.inputMode,
        photoText: photo,
        studentText,
      }).messages;
    const reasoningEffort = routeReasoningEffort({ schoolLevel: learner.level, subject, analysis, contracted: contract !== null });
    const check: OutputCheckContext = {
      sheet: exercise?.sheet ?? null,
      uncertain: exercise?.uncertain ?? false,
      drawnForms: exercise?.drawnForms ?? [],
      diagnosis,
      studentText: said,
      pastStudentTexts: history.filter((row) => row.role === 'student').map((row) => saidWith(row.text, row.photoText)),
    };

    onStep('writing');
    const reply = await writeChecked(
      { ai, moderation, logger },
      { studentId: learner.id, sessionId: session.id, system, messages, reasoningEffort },
      check,
    );

    // A fixed reply gave none of the help the level allowed: the exercise does not move.
    const helped = reply.outcome !== 'fallback';
    const first = history.length === 0;
    await repository.saveTurn(session.id, {
      exchange: { ...sent, tutorText: reply.text, replay: reply.replay },
      subject: session.subject ? null : detected,
      newExercise:
        exerciseTurn.isNew && exercise
          ? {
              sheet: exercise.sheet,
              uncertain: exercise.uncertain,
              drawnForms: exercise.drawnForms,
              mathCheck: exerciseTurn.mathCheck ?? 'not-applicable',
              promptVersion: SHEET_PROMPT_VERSION,
            }
          : null,
      exerciseId: exerciseTurn.isNew ? null : (current?.id ?? null),
      progress: helped && change && hintLevel !== null ? { ...change, hint: hintOf(hintLevel, reply.text) } : null,
      record: {
        analysis: analysisRecord(analysis),
        inputFlagged: inputModeration?.flagged ?? null,
        newExercise: exerciseTurn.isNew,
        hintLevel,
        verdict: diagnosis?.verdict ?? null,
        errorType: diagnosis?.errorType ?? null,
        decidedBy: diagnosis?.decidedBy ?? null,
        reasoningEffort,
        model: ai.model,
        promptVersion: TURN_PROMPT_VERSION,
        findings: reply.findings.map((finding) => finding.kind),
        outcome: reply.outcome,
      },
    });
    return {
      text: reply.text,
      // The title from what the student said, the photo's text included.
      after: () => afterTurn(learner.id, session, { studentText: said, tutorText: reply.text, check, first }),
    };
  };
}
