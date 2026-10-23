/**
 * Sending an email: one function, passed to whoever sends. Scaleway Transactional Email in
 * production (docs/architecture.md, « Hébergement »), through Scaleway's own SDK; in
 * development, the email is logged so that its sign-in code can be read; the tests pass their own.
 */

import { createClient } from '@scaleway/sdk-client';
import { Temv1alpha1 } from '@scaleway/sdk-tem';
import type { Logger } from 'pino';

export interface Email {
  to: string;
  subject: string;
  text: string;
}

export type Mailer = (email: Email) => Promise<void>;

export interface ScalewayMail {
  accessKey: string;
  secretKey: string;
  projectId: string;
  from: string;
  /** Scaleway's API by default; the tests point it at their own server. */
  apiURL?: string | undefined;
}

/** A line that is a label, then an address: the HTML part shows the label, which opens the address. */
const LINK_LINE = /^(.+) : (https?:\/\/\S+)$/;

/**
 * The SDK requires an HTML part: the same text, escaped, one paragraph per line, and a line
 * « Entrer dans Catiche : https://… » a link named by its label. No template: the text says it all.
 */
function htmlOf(text: string) {
  return text
    .split('\n')
    .map((line) => {
      const link = LINK_LINE.exec(line);
      const html = link ? `<a href="${Bun.escapeHTML(link[2] ?? '')}">${Bun.escapeHTML(link[1] ?? '')}</a>` : Bun.escapeHTML(line);
      return `<p>${html}</p>`;
    })
    .join('');
}

// Past it, the email is abandoned and reported, instead of holding a background task.
const SEND_TIMEOUT_MS = 10_000;

export function scalewayMailer({ accessKey, secretKey, projectId, from, apiURL }: ScalewayMail): Mailer {
  const client = createClient({
    accessKey,
    secretKey,
    defaultProjectId: projectId,
    defaultRegion: 'fr-par',
    ...(apiURL === undefined ? {} : { apiURL }),
  });
  const tem = new Temv1alpha1.API(client);
  return async ({ to, subject, text }) => {
    await tem.createEmail(
      {
        from: { email: from, name: 'Catiche' },
        to: [{ email: to }],
        subject,
        text,
        html: htmlOf(text),
      },
      { signal: AbortSignal.timeout(SEND_TIMEOUT_MS) },
    );
  };
}

/** Development only: the email in the log, its code to type by hand. */
export function logMailer(logger: Logger): Mailer {
  return (email) => {
    logger.info({ email }, 'Email not sent (development)');
    return Promise.resolve();
  };
}
