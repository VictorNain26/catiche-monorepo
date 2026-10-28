import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

type Tone = 'done' | 'todo' | 'neutral';

const TONES: Record<Tone, string> = {
  done: 'bg-tag-done text-tag-done-foreground',
  todo: 'bg-tag-todo text-tag-todo-foreground',
  neutral: 'bg-tag-neutral text-tag-neutral-foreground',
};

interface TagProps {
  tone: Tone;
  /** Beside the words, never in their place: the tone never rests on the color alone. */
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

/** A state in a few words, on a card: done, to do, or neither (`docs/charte.md`, « Le registre de l'adulte »). */
function Tag({ tone, icon: Icon, children, className }: TagProps) {
  return (
    <span
      className={cn('inline-flex min-h-8 items-center gap-1.5 self-start rounded-control px-2.5 py-0.5 text-sm font-bold', TONES[tone], className)}
    >
      {Icon && <Icon aria-hidden="true" nonScalingStroke className="size-5 shrink-0" />}
      {children}
    </span>
  );
}

export { Tag };
