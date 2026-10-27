import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-base font-bold ring-offset-background transition-all duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:text-disabled-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-control hover:bg-primary/90 hover:shadow-control-hover active:scale-[0.98] disabled:bg-disabled disabled:shadow-none',
        // The secondary action, filled in the light water: it reads as a button without competing
        // with the one primary of the screen.
        tonal: 'bg-tonal text-tonal-foreground hover:bg-tonal-hover active:scale-[0.98] disabled:bg-disabled',
        // An outline, kept for what belongs with a field (a key of the code pad, the photo beside the
        // message) and for the gesture that opens a grave one (delete, remove); its border is a
        // field's, at 3:1.
        outline: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
        // A gesture that takes something away for good, drawn as an outline in the destructive's red;
        // disabled, it is an outline like the others.
        'outline-destructive':
          'border border-destructive bg-transparent text-destructive hover:bg-accent hover:text-accent-foreground active:scale-[0.98] disabled:border-border',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
        // A way out of the screen, in its words: underlined text, the line's height a finger's.
        link: 'justify-start whitespace-normal text-left font-normal text-primary underline underline-offset-4',
      },
      size: {
        default: 'h-11 px-6 rounded-control',
        sm: 'h-11 px-4 rounded-control',
        lg: 'h-12 px-8 rounded-control',
        icon: 'size-11 rounded-control',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto min-h-11 px-0 py-3' }],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
