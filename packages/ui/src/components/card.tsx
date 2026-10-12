import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../lib/utils';

type CardProps = React.ComponentProps<'div'> & { asChild?: boolean };

/**
 * A block of its own that leads to a detail, barely lifted from the paper: the card radius, a
 * border, the card fill; it takes the tag of what it holds. Its inside lays out by its own width
 * (`@container`), the viewport deciding only the shell.
 */
function Card({ className, asChild = false, ...props }: CardProps) {
  const Comp = asChild ? Slot : 'div';
  return <Comp className={cn('@container rounded-2xl border border-border bg-card p-4 text-card-foreground', className)} {...props} />;
}

export { Card };
