import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold ring-offset-background transition-all duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:text-disabled-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-control hover:bg-primary/90 hover:shadow-control-hover active:scale-[0.98] disabled:bg-disabled disabled:shadow-none',
        outline: 'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
        // A gesture that takes something away for good, drawn as an outline in the destructive's red;
        // disabled, it is an outline like the others.
        'outline-destructive':
          'border border-destructive bg-transparent text-destructive hover:bg-accent hover:text-accent-foreground active:scale-[0.98] disabled:border-border',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
        // A way out of the screen, in its words: underlined text, the line's height a finger's.
        link: 'justify-start whitespace-normal text-left font-normal text-primary underline underline-offset-4',
      },
      size: {
        default: 'h-11 px-6 text-sm rounded-control',
        sm: 'h-11 px-4 text-sm rounded-control',
        lg: 'h-12 px-8 text-base rounded-control',
        icon: 'size-11 rounded-control',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto min-h-11 px-0 py-3 text-sm' }],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
