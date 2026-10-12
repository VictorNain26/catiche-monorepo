import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { VariantProps } from 'class-variance-authority';
import { buttonVariants } from '../lib/button-variants';
import { cn } from '../lib/utils';

// `render` takes the element to draw as a button, a link for instance
// (https://base-ui.com/react/utils/use-render).
type ButtonProps = useRender.ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, render, ref, ...props }: ButtonProps) {
  return useRender({
    defaultTagName: 'button',
    render,
    ref,
    props: mergeProps<'button'>({ className: cn(buttonVariants({ variant, size, className })) }, props),
  });
}

export { Button };
