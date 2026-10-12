import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '../lib/utils';

/**
 * A block of its own that leads to a detail, barely lifted from the paper: the card radius, a
 * border, the card fill; `render` gives it the tag of what it holds. A card whose inside lays out
 * by its own width takes `@container` when the layout gives it that width: a container never sizes
 * itself by its content, and a card sized by its words would shrink to nothing.
 */
function Card({ className, render, ref, ...props }: useRender.ComponentProps<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    ref,
    props: mergeProps<'div'>({ className: cn('rounded-2xl border border-border bg-card p-4 text-card-foreground', className) }, props),
  });
}

export { Card };
