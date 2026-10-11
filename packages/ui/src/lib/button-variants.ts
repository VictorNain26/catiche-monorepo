import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold ring-offset-background transition-all duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:border-transparent disabled:bg-disabled disabled:text-disabled-foreground disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-control hover:bg-primary/90 hover:shadow-control-hover active:scale-[0.98]',
        outline: 'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
      },
      size: {
        default: 'h-11 px-6 text-sm rounded-control',
        sm: 'h-11 px-4 text-sm rounded-control',
        lg: 'h-12 px-8 text-base rounded-control [&_svg]:size-5',
        icon: 'size-11 rounded-control',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
