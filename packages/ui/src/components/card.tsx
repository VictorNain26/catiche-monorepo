import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '../lib/utils';

/**
 * A block of its own that leads to a detail, barely lifted from the paper: the card radius, a
 * border, the card fill; `render` gives it the tag of what it holds. Its inside lays out by its own
 * width (`@container`), the viewport deciding only the shell.
 */
function Card({ className, render, ref, ...props }: useRender.ComponentProps<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    ref,
    props: mergeProps<'div'>({ className: cn('@container rounded-2xl border border-border bg-card p-4 text-card-foreground', className) }, props),
  });
}

export { Card };
