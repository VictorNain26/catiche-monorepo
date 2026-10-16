/** The emails a test's app (or the harness's) sends, kept in memory, and a wait for the next one to an address. */

import type { Email, Mailer } from '../platform/email/mailer';

/** `waitMs`: longer than any send in the background, shorter than a test's own timeout. */
export function memoryMailer({ waitMs = 4_000 }: { waitMs?: number } = {}) {
  const sent: Email[] = [];
  const waiting: { to: string; resolve: (email: Email) => void }[] = [];
  const mailer: Mailer = (email) => {
    sent.push(email);
    for (const waiter of waiting.filter(({ to }) => to === email.to)) {
      waiting.splice(waiting.indexOf(waiter), 1);
      waiter.resolve(email);
    }
    return Promise.resolve();
  };

  /**
   * The next email to `to`, sent after this call: wait for it before the request that sends it,
   * since the auth sends in the background, once its answer is out. An email that never comes
   * fails the wait, which would otherwise hang the harness.
   */
  const next = (to: string) =>
    new Promise<Email>((resolve, reject) => {
      const waiter = { to, resolve };
      waiting.push(waiter);
      setTimeout(() => {
        if (!waiting.includes(waiter)) return;
        waiting.splice(waiting.indexOf(waiter), 1);
        reject(new Error(`No email to ${to}`));
      }, waitMs).unref();
    });

  /** The sign-in code an email carries in its text. */
  const codeIn = ({ subject, text }: Email) => {
    const code = /\b\d{6}\b/.exec(text)?.[0];
    if (!code) throw new Error(`No code in "${subject}"`);
    return code;
  };

  return { mailer, sent, next, codeIn };
}
