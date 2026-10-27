import * as React from 'react';
import { cn } from '../lib/utils';

type SectionProps = Omit<React.ComponentProps<'section'>, 'title'> & {
  title: string;
  /** A line under the title, when the title alone does not say what the section holds. */
  description?: string;
  /** The section's own action, on the right of its title. */
  action?: React.ReactNode;
  level?: 2 | 3;
  /** The title's own size, where a screen draws it apart from its level. */
  titleClassName?: string;
};

/** A part of a screen, named by its title: a landmark a screen reader lists. */
function Section({ title, description, action, level = 2, titleClassName, className, children, ...props }: SectionProps) {
  const id = React.useId();
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <section aria-labelledby={id} className={cn('flex flex-col gap-3', className)} {...props}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-1">
          <Heading id={id} className={cn('text-foreground', level === 2 ? 'text-xl' : 'text-lg', titleClassName)}>
            {title}
          </Heading>
          {description !== undefined && <p className="text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export { Section };
