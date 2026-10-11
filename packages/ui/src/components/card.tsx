import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../lib/utils';

type CardProps = React.ComponentProps<'div'> & { asChild?: boolean };

/** A sheet barely lifted from the paper: the card radius, a border, the card fill; it takes the tag of what it holds. */
function Card({ className, asChild = false, ...props }: CardProps) {
  const Comp = asChild ? Slot : 'div';
  return <Comp className={cn('rounded-2xl border border-border bg-card p-4 text-card-foreground', className)} {...props} />;
}

export { Card };
