/**
 * A turn of Tom, once the service has opened it (the student, their session locked, the quota
 * read): the student's message moderated and checked for distress, then Tom with the evening, then
 * his reply checked before anything reaches the student (`docs/tuteur.md` § 4), then both stored.
 * Its dependencies are passed.
 */

import { convertToModelMessages, pruneMessages, validateUIMessages, type ModelMessage } from 'ai';
import type { Logger } from 'pino';
import { detectDistress, DISTRESS_REPLY, type DistressSource } from '../../domain/distress';
import { findLeakForm } from '../../domain/leak';
import { EVENING_TAG, PROMPT_TAG, stripPromptTags } from '../../domain/prompt-tags';
import { eveningDay } from '../../domain/school-calendar';
import type { InputModeration, Moderation } from '../../platform/ai/moderation';
import type { StudentDirectory } from '../household';
import type { Tom } from './agent';
import { eveningText } from './core/evening';
import { DISCLOSURE, FALLBACK_REPLY } from './core/instructions';
import { metadataSchema, textOf, type TomMessage, type TurnOutcome } from './core/message';
import type { NewMessage, TutorRepository } from './repository';

/** The messages Tom reads back: the evening's state comes from the tables, not from them. */
const WINDOW = 20;

/** What the student is told while they wait: reading their message, then writing. */
export type TurnStep = 'reading' | 'writing';

type Student = NonNullable<Awaited<ReturnType<StudentDirectory['find']>>>;

/** A turn opened by the service: the student, their session as the lock read it, and when the turn started. */
export interface OpenTurn {
  student: Student;
  session: { id: string; closedAt: Date | null; createdAt: Date; turnStartedAt: Date };
  /** A distress already seen past the quota: the turn answers it, and nothing else. */
  distress: { source: DistressSource } | null;
}

interface Deps {
  repository: TutorRepository;
  tom: Tom;
  moderation: Moderation;
  logger: Logger;
}

const said = (text: string): NewMessage => ({ role: 'user', parts: [{ type: 'text', text }] });
const answered = (text: string, outcome: TurnOutcome, reasoning: string | null = null): NewMessage => ({
  role: 'assistant',
  parts: [...(reasoning ? [{ type: 'reasoning' as const, text: reasoning }] : []), { type: 'text', text }],
  metadata: { outcome },
});

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

export function createTurn({ repository, tom, moderation, logger }: Deps) {
  /** The fixed reply to a distress, the event recorded and the session closed; no failure to store it keeps the reply from the student. */
  async function answerDistress(studentId: string, sessionId: string, text: string, source: DistressSource) {
    await repository.closeForDistress(studentId, sessionId, source, [said(text), answered(DISTRESS_REPLY, 'distress')]).catch((err: unknown) => {
      logger.error({ err }, 'Distress not stored');
    });
    return DISTRESS_REPLY;
  }

  /** Whether the reply may reach the student; it may not when the check cannot be made. */
  async function passes(reply: string, studentText: string, history: readonly TomMessage[], calculated: readonly string[]) {
    if (!reply.trim() || PROMPT_TAG.test(reply)) return false;
    // A result Tom calculated that the student has not written yet would give the answer away.
    const written = [studentText, ...history.filter((each) => each.role === 'user').map(textOf)];
    const unwritten = calculated.filter((result) => !written.some((text) => findLeakForm(text, [result])));
    if (findLeakForm(reply, unwritten)) return false;
    try {
      return (await moderation.reply(studentText, reply)).length === 0;
    } catch (err) {
      logger.error({ err }, 'Output moderation unavailable, reply held back');
      return false;
    }
  }

  return async function turn({ student, session, distress }: OpenTurn, text: string, onStep: (step: TurnStep) => void): Promise<string> {
    // The conversation stopped at a distress: any later message gets the fixed reply again.
    if (session.closedAt) {
      await repository.saveExchange(session.id, [said(text), answered(DISTRESS_REPLY, 'closed')]).catch((err: unknown) => {
        logger.error({ err }, 'Closed session turn not stored');
      });
      return DISTRESS_REPLY;
    }
    if (distress) return answerDistress(student.id, session.id, text, distress.source);

    const stored = await repository.history(session.id, WINDOW);
    // The window opens on the student's message: an assistant's first would not follow one.
    const window = stored.at(0)?.role === 'assistant' ? stored.slice(1) : stored;
    // Validated as the persistence guide reads stored messages back; the AI SDK refuses an empty list.
    const history = window.length === 0 ? [] : await validateUIMessages<TomMessage>({ messages: window, metadataSchema });
    const lastTutor = history.findLast((each) => each.role === 'assistant');
    onStep('reading');
    const moderated = await moderateInput({ moderation, logger }, lastTutor ? textOf(lastTutor) : null, text);
    const source = detectDistress(text, moderated?.flagged.includes('selfharm') ?? false);
    if (source) return answerDistress(student.id, session.id, text, source);

    const today = eveningDay(session.createdAt);
    const eveningId = await repository.openEvening(student.id, today);
    const state = await repository.eveningState(student.id, eveningId, today);
    const block = eveningText({ firstName: student.name, today, ...state });
    const messages: ModelMessage[] = [
      // The reasoning of Tom's last reply only, as Mistral's reasoning models expect it back.
      ...pruneMessages({ messages: await convertToModelMessages(history), reasoning: 'before-last-message', emptyMessages: 'remove' }),
      {
        role: 'user',
        content: [
          { type: 'text', text: `<${EVENING_TAG}>\n${block}\n</${EVENING_TAG}>` },
          { type: 'text', text: stripPromptTags(text) },
        ],
      },
    ];

    onStep('writing');
    const reply = await tom.reply({ studentId: student.id, firstName: student.name, level: student.level, eveningId, today }, session.id, messages);
    const passed = await passes(reply.text, text, history, reply.calculated);
    const checked = passed ? reply.text : FALLBACK_REPLY;
    // Tom says he is an AI in the first reply of a session, whatever the model wrote.
    const shown = history.length === 0 && !checked.includes('intelligence artificielle') ? `${DISCLOSURE}\n\n${checked}` : checked;
    // The reasoning behind a reply held back is never replayed.
    await repository.saveExchange(session.id, [said(text), answered(shown, passed ? 'passed' : 'fallback', passed ? reply.reasoning : null)]);
    return shown;
  };
}
