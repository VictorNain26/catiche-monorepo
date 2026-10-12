import * as React from 'react';
import { Slot, Slottable } from '@radix-ui/react-slot';
import { ChevronRightIcon } from 'lucide-react';
import { cn } from '../lib/utils';

/** Things alike, to compare at a glance (sessions, notions, devices): one sheet, a line each. */
function List({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      className={cn('flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card text-card-foreground', className)}
      {...props}
    />
  );
}

interface ListItemProps {
  title: React.ReactNode;
  /** What tells this item from the others: a date, a subject. */
  meta?: React.ReactNode;
  /** The line is the link it holds, an empty anchor or the router's: the whole line leads to the detail. */
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function ListItem({ title, meta, asChild = false, className, children }: ListItemProps) {
  const Row = asChild ? Slot : 'div';
  return (
    <li>
      <Row
        className={cn(
          'flex min-h-14 items-center gap-3 px-4 py-3',
          asChild && 'transition-colors duration-fast ease-standard hover:bg-accent focus-visible:ring-inset focus-visible:ring-offset-0',
          className,
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-bold">{title}</span>
          {meta !== undefined && <span className="text-sm text-muted-foreground">{meta}</span>}
        </span>
        <Slottable>{children}</Slottable>
        {asChild && <ChevronRightIcon aria-hidden="true" nonScalingStroke className="size-6 shrink-0 text-muted-foreground" />}
      </Row>
    </li>
  );
}

export { List, ListItem };
