import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '../lib/utils';

type FoldProps = Omit<React.ComponentProps<'details'>, 'title'> & { title: string };

/** What a screen does not lead with: its title in a line, its content a tap away. */
function Fold({ title, className, children, ...props }: FoldProps) {
  return (
    <details className={cn('group border-t border-border', className)} {...props}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 font-bold text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDownIcon aria-hidden="true" nonScalingStroke className="size-6 shrink-0 group-open:rotate-180" />
      </summary>
      {/* The flex column on a div: WebKit does not lay out a details element as flex. */}
      <div className="flex flex-col gap-3 pb-3">{children}</div>
    </details>
  );
}

export { Fold };
