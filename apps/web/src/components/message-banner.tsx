import { Banner } from '@repo/ui';
import type { CodeMessage } from '../lib/student';

/** A failure said to the student: what happened, then what to do. */
export function MessageBanner({ message }: { message: CodeMessage }) {
  return (
    <Banner tone="error" title={message.title}>
      {message.detail}
    </Banner>
  );
}
