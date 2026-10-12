import * as React from 'react';
import { cn } from '../lib/utils';

/**
 * The shape of what loads: hidden for the wait under which nothing shows, then a slow pulse,
 * still under reduced motion (`--animate-skeleton` in theme.css). Its words for a screen reader
 * are the caller's.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-skeleton=""
      aria-hidden="true"
      className={cn('animate-skeleton rounded-control bg-muted motion-reduce:animate-skeleton-still', className)}
      {...props}
    />
  );
}

export { Skeleton };
