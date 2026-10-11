import { Card } from '@repo/ui';
import type { ReactNode } from 'react';

/** A message of the form as a whole: an error read out at once, or a confirmation. */
export function Notice({ tone, children }: { tone: 'error' | 'info'; children: ReactNode }) {
  return tone === 'error' ? (
    <Card asChild className="border-destructive bg-transparent text-sm text-destructive">
      <p role="alert">{children}</p>
    </Card>
  ) : (
    <Card asChild className="text-sm">
      <p role="status">{children}</p>
    </Card>
  );
}
