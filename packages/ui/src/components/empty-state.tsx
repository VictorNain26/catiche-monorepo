import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  /** What will come here. */
  title: string;
  /** How it fills, in a sentence. */
  description: string;
  /** The action that fills it, on the spot. */
  action?: React.ReactNode;
  className?: string;
}

/** A place with nothing yet: never a blank, never « aucune donnée », but what will come and how. */
function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-2xl border border-dashed border-input px-6 py-8 text-center', className)}>
      <span className="flex size-12 items-center justify-center rounded-full bg-highlight text-foreground">
        <Icon aria-hidden="true" nonScalingStroke className="size-6" />
      </span>
      <p className="font-bold text-foreground">{title}</p>
      <p className="max-w-prose text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export { EmptyState };
