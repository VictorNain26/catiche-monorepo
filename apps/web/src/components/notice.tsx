import { Card } from '@repo/ui';
import type { ReactNode } from 'react';

/** A message of the form as a whole: an error read out at once, or a confirmation. */
export function Notice({ tone, children }: { tone: 'error' | 'info'; children: ReactNode }) {
  return tone === 'error' ? (
    <Card render={<p role="alert" />} className="border-destructive bg-transparent text-sm text-destructive">
      {children}
    </Card>
  ) : (
    <Card render={<p role="status" />} className="text-sm">
      {children}
    </Card>
  );
}
