/**
 * The HTTP calls of a client, as the web makes them: a guardian invited and in by the code their
 * address received, a student created, a device recognised by the guardian's code and the student
 * in by their own, a turn read from its UI message stream. The tests and the harness
 * (src/evaluate.ts) both play through it, so it throws on a refused step rather than asserting:
 * no `bun:test` here.
 */

import { parseJsonEventStream, readUIMessageStream, uiMessageChunkSchema, type UIMessage, type UIMessageChunk } from 'ai';
import { invite } from '../platform/auth/invitation';
import type { Db } from '../platform/db/client';
import type { memoryMailer } from './mailer';

export const ORIGIN = 'http://localhost:3002';

/**
 * The birth month of a child exactly this old all year, up to 20: December of the year before,
 * since a birthday counts once its month is over (domain/student-age.ts). A fixed year would
 * leave the accepted ages one day.
 */
export const birthMonthAged = (years: number, now = new Date()) => `${String(now.getUTCFullYear() - years - 1)}-12`;

interface App {
  request: (input: string, init?: RequestInit) => Response | Promise<Response>;
}

export interface Student {
  id: string;
  name: string;
  level: string;
  birthMonth: string;
}

/** The code every student of the client chooses: six digits no rule refuses. */
export const STUDENT_CODE = '482917';

interface Device {
  id: string;
  createdAt: string;
  lastUsedAt: string | null;
  userAgent: string | null;
  shared: boolean;
  blocked: boolean;
}

interface Profiles {
  shared: boolean;
  profiles: { id: string; name: string; state: string }[];
}

/**
 * The session cookie a response sets, as `name=value`; empty if it sets none. Over https,
 * better-auth prefixes its name `__Secure-` (`createCookieGetter`, better-auth/dist/cookies).
 */
const cookieOf = (res: Response) =>
  res.headers
    .getSetCookie()
    .find((cookie) => /^(__Secure-)?better-auth\.session_token=/.test(cookie))
    ?.split(';')[0] ?? '';

/** The response, once its status is the one the step expects; an error naming the step otherwise. */
async function expectStatus(response: Response | Promise<Response>, status: number, step: string): Promise<Response> {
  const res = await response;
  if (res.status !== status) throw new Error(`${step}: HTTP ${String(res.status)} ${await res.text()}`);
  return res;
}

/**
 * A turn's UI message stream as the web reads it: the chunks in their order, parsed by the AI SDK,
 * and the reply the student reads, built by its `readUIMessageStream`; with the stream's error, if
 * any, and the raw body.
 */
async function readTurn(res: Response) {
  const body = await res.text();
  const chunks: UIMessageChunk[] = [];
  let error: string | undefined;
  const stream = parseJsonEventStream({ stream: new Response(body).body ?? new ReadableStream(), schema: uiMessageChunkSchema }).pipeThrough(
    new TransformStream<{ success: true; value: UIMessageChunk } | { success: false; error: Error }, UIMessageChunk>({
      transform(part, controller) {
        if (!part.success) throw part.error;
        chunks.push(part.value);
        controller.enqueue(part.value);
      },
    }),
  );
  let last: UIMessage | undefined;
  for await (const message of readUIMessageStream({
    stream,
    onError: (caught) => {
      error = caught instanceof Error ? caught.message : String(caught);
    },
  })) {
    last = message;
  }
  const reply = (last?.parts ?? []).flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('');
  return { status: res.status, chunks, reply, error, body };
}

export function httpClient(app: App, mail: ReturnType<typeof memoryMailer>, db: Db, origin = ORIGIN) {
  const request = (
    method: string,
    path: string,
    { cookie, body, headers }: { cookie?: string | undefined; body?: unknown; headers?: Record<string, string> } = {},
  ) =>
    app.request(`${origin}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        'User-Agent': 'test-device',
        ...(cookie === undefined ? {} : { Cookie: cookie }),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  /**
   * The email of a code, waited for before the request that sends it (the auth sends in the
   * background). Awaited together, a refused request fails the step at once, and the wait
   * rejecting later is not left unhandled.
   */
  const codeSent = async (email: string, send: () => Response | Promise<Response>) =>
    (await Promise.all([mail.next(email), expectStatus(send(), 200, 'code')]))[0];

  const api = {
    request,
    /** Invited, then in by the code their address received: the session it opens. */
    async guardian(email: string) {
      await invite(db, email);
      return api.signIn(email);
    },
    /** In by the code the address receives, named on a first sign-in: the session cookie. */
    async signIn(email: string) {
      const received = await codeSent(email, () =>
        request('POST', '/api/auth/email-otp/send-verification-otp', { body: { email, type: 'sign-in' } }),
      );
      const res = await expectStatus(
        request('POST', '/api/auth/sign-in/email-otp', { body: { email, otp: mail.codeIn(received), name: 'Parent' } }),
        200,
        'sign-in',
      );
      return cookieOf(res);
    },
    async student(cookie: string, overrides: Partial<Omit<Student, 'id'>> = {}) {
      const res = await expectStatus(
        request('POST', '/api/household/students', {
          cookie,
          body: { name: 'Léa', level: 'cinquieme', birthMonth: birthMonthAged(12), ...overrides },
        }),
        201,
        'student',
      );
      return (await res.json()) as Student;
    },
    /** A guardian's code for a new device of the student, or for a code they forgot. */
    async activationCode(cookie: string, studentId: string, reason: 'device' | 'forgotten' = 'device') {
      const res = await expectStatus(
        request('POST', `/api/household/students/${studentId}/activation-code`, { cookie, body: { reason } }),
        201,
        'activation code',
      );
      return ((await res.json()) as { code: string; expiresAt: string }).code;
    },
    /**
     * A new device of the student's own, recognised by a guardian's code, the student then in by
     * the code they choose, or by the one they chose before: that device's cookies.
     */
    async pair(cookie: string, studentId: string) {
      const device = api.device();
      await expectStatus(device.activate(await api.activationCode(cookie, studentId)), 200, 'activation');
      const { profiles } = await device.profiles();
      const state = profiles.find(({ id }) => id === studentId)?.state;
      await expectStatus(
        state === 'choose' ? device.chooseCode(studentId, STUDENT_CODE, true) : device.enter(studentId, STUDENT_CODE),
        200,
        'student code',
      );
      return device.cookie();
    },
    /** A session the student opens: its id. */
    async session(cookie: string) {
      const res = await expectStatus(request('POST', '/api/sessions', { cookie }), 201, 'session');
      return ((await res.json()) as { id: string }).id;
    },
    /** One turn through the route, read from its UI message stream. */
    async turn(cookie: string, sessionId: string, body: Record<string, unknown>) {
      return readTurn(await request('POST', `/api/sessions/${sessionId}/messages`, { cookie, body }));
    },
    async sessionUser(cookie: string) {
      const res = await request('GET', '/api/auth/get-session', { cookie });
      return ((await res.json()) as { user: { id: string } } | null)?.user;
    },
    /** The student's devices, as their guardian reads them, and the state of their code. */
    async devices(cookie: string, studentId: string) {
      const res = await expectStatus(request('GET', `/api/household/students/${studentId}/devices`, { cookie }), 200, 'devices');
      return (await res.json()) as { devices: Device[]; code: { chosen: boolean; locked: boolean } };
    },
    /** One device's browser: every cookie its responses set, kept for its next requests, and dropped once expired. */
    device() {
      const jar = new Map<string, string>();
      const cookie = () => [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
      const send = async (method: string, path: string, body?: unknown) => {
        const res = await request(method, path, { cookie: cookie(), body });
        for (const line of res.headers.getSetCookie()) {
          const [pair = '', ...attributes] = line.split(';');
          const name = pair.slice(0, pair.indexOf('='));
          const value = pair.slice(pair.indexOf('=') + 1);
          if (value === '' || attributes.some((attribute) => /^\s*max-age=0\s*$/i.test(attribute))) jar.delete(name);
          else jar.set(name, value);
        }
        return res;
      };
      return {
        cookie,
        send,
        /** The guardian in by the code their address received, on this device. */
        async signIn(email: string) {
          const received = await codeSent(email, () => send('POST', '/api/auth/email-otp/send-verification-otp', { email, type: 'sign-in' }));
          return send('POST', '/api/auth/sign-in/email-otp', { email, otp: mail.codeIn(received) });
        },
        /** A guardian's code, which recognises this device for the student. */
        activate: (code: string) => send('POST', '/api/auth/student/activate', { code }),
        /** The profiles this device holds. */
        async profiles() {
          return (await (await expectStatus(send('GET', '/api/auth/student/profiles'), 200, 'profiles')).json()) as Profiles;
        },
        chooseCode: (studentId: string, code: string, ownDevice: boolean) =>
          send('POST', '/api/auth/student/choose-code', { studentId, code, ownDevice }),
        /** The student in by their own code. */
        enter: (studentId: string, code: string) => send('POST', '/api/auth/student/sign-in', { studentId, code }),
        /** The guardian adds their children to this device, a family computer. */
        addProfiles: (studentIds: string[]) => send('POST', '/api/auth/student/add-profiles', { studentIds }),
      };
    },
  };
  return api;
}
