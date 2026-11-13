/**
 * /api/sessions: a signed-in student's sessions with the tutor, their messages, and a turn. A
 * turn answers as the AI SDK's UI message stream, which the web's useChat reads; what refuses it
 * (no session, someone else's, a turn already running) stays a problem response, before the stream.
 */

import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { Logger } from 'pino';
import { z } from 'zod';
import type { Auth } from '../../platform/auth/auth';
import { requireSession, type SessionEnv } from '../../platform/auth/session';
import { Problem } from '../../platform/http/problem';
import { jsonBody, uuidParam } from '../../platform/http/validate';
import type { TutorService } from './service';

// The calls of a turn can leave the connection silent past Bun's idle timeout (30 s, main.ts).
const KEEP_ALIVE_MS = 10_000;
const MAX_CHARS = 4000;
// Four bytes a character at most, and the JSON around: past it, 413 before any parsing.
const MAX_BODY_BYTES = 4 * MAX_CHARS + 1024;

const tooLarge = (): never => {
  throw new Problem('PAYLOAD_TOO_LARGE', 'Le message dépasse 4 000 caractères.');
};

/** The text without NUL, the C0 controls and DEL, which Postgres' jsonb refuses: tabs and line breaks stay. */
function sanitize(text: string): string {
  return Array.from(text)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code === 0x09 || code === 0x0a || code === 0x0d || (code >= 0x20 && code !== 0x7f);
    })
    .join('');
}

const turnBody = z.object({ text: z.string().transform(sanitize).pipe(z.string().trim().min(1).max(MAX_CHARS)) });

export function tutorRoutes({ auth, service, logger }: { auth: Auth; service: TutorService; logger: Logger }) {
  return new Hono<SessionEnv>()
    .use(requireSession(auth))
    .post('/', async (c) => c.json(await service.startSession(c.var.userId), 201))
    .get('/', async (c) => c.json(await service.listSessions(c.var.userId)))
    .get('/:id/messages', uuidParam('id'), async (c) => c.json(await service.listMessages(c.var.userId, c.req.valid('param').id)))
    .post('/:id/messages', bodyLimit({ maxSize: MAX_BODY_BYTES, onError: tooLarge }), uuidParam('id'), jsonBody(turnBody), async (c) => {
      const { text: input } = c.req.valid('json');
      const opened = await service.openTurn(c.var.userId, c.req.valid('param').id, input);
      return createUIMessageStreamResponse({
        keepAliveMs: KEEP_ALIVE_MS,
        stream: createUIMessageStream({
          execute: async ({ writer }) => {
            // Transient: the student reads it while waiting, the conversation never keeps it.
            const text = await service.runTurn(opened, input, (step) => {
              writer.write({ type: 'data-step', data: step, transient: true });
            });
            writer.write({ type: 'text-start', id: 'reply' });
            writer.write({ type: 'text-delta', id: 'reply', delta: text });
            writer.write({ type: 'text-end', id: 'reply' });
          },
          // The internal message never reaches the student.
          onError: (err) => {
            logger.error({ err }, 'Tutor turn failed');
            return "Tom n'a pas pu répondre. Réessaie dans un instant.";
          },
        }),
      });
    });
}

/**
 * /api/summary: the summary of the week (`docs/tuteur.md` § 8), the signed-in student's
 * own, or a student's for an adult linked to them; the same for both.
 */
export function summaryRoutes({ auth, service }: { auth: Auth; service: TutorService }) {
  return new Hono<SessionEnv>()
    .use(requireSession(auth))
    .get('/', async (c) => c.json(await service.summary(c.var.userId)))
    .get('/:studentId', async (c) => c.json(await service.summaryFor(c.var.userId, c.req.param('studentId'))));
}
