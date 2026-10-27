import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';
import { ChevronRightIcon } from 'lucide-react';
import { cn } from '../lib/utils';

/** Things alike, to compare at a glance (sessions, notions, devices): one sheet, a line each. */
function List({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      className={cn(
        'flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sheet',
        className,
      )}
      {...props}
    />
  );
}

interface ListItemProps {
  title: React.ReactNode;
  /** What tells this item from the others: a date, a subject. */
  meta?: React.ReactNode;
  /** The link the whole line is, an empty anchor or the router's: the line leads to the detail. */
  render?: React.ReactElement;
  className?: string;
  children?: React.ReactNode;
}

function ListItem({ title, meta, render, className, children }: ListItemProps) {
  const link = render !== undefined;
  const row = useRender({
    defaultTagName: 'div',
    render,
    props: {
      className: cn(
        'flex min-h-14 items-center gap-3 px-4 py-3',
        link &&
          'group transition-colors duration-fast ease-standard hover:bg-accent hover:text-accent-foreground focus-visible:ring-inset focus-visible:ring-offset-0',
        className,
      ),
      children: (
        <>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-bold">{title}</span>
            {meta !== undefined && <span className="text-smtext-muted-foreground group-hover:text-accent-muted-foreground">{meta}</span>}
          </span>
          {children}
          {link && <ChevronRightIcon aria-hidden="true" nonScalingStroke className="size-6 shrink-0 text-muted-foreground" />}
        </>
      ),
    },
  });
  return <li>{row}</li>;
}

export { List, ListItem };
