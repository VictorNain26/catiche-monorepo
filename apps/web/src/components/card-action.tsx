import { Card } from '@repo/ui';
import { cn } from '@repo/ui/classes';
import type { ComponentProps } from 'react';

/**
 * A card the whole of which is a link or a button (`render`): the accent under the pointer, its
 * secondary words lifted by `group-hover`; disabled, the disabled's colours.
 */
export function CardAction({ className, ...card }: ComponentProps<typeof Card>) {
  return (
    <Card
      {...card}
      className={cn(
        'group transition-colors duration-fast ease-standard hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:bg-disabled disabled:text-disabled-foreground',
        className,
      )}
    />
  );
}
