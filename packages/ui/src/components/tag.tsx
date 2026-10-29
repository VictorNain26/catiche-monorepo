import { CheckIcon, CircleAlertIcon, ClockIcon, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

type Tone = 'done' | 'todo' | 'neutral';

// Each tone with its icon: the state never rests on the color alone.
const TONES: Record<Tone, { icon: LucideIcon; colors: string }> = {
  done: { icon: CheckIcon, colors: 'bg-tag-done text-tag-done-foreground' },
  todo: { icon: CircleAlertIcon, colors: 'bg-tag-todo text-tag-todo-foreground' },
  neutral: { icon: ClockIcon, colors: 'bg-tag-neutral text-tag-neutral-foreground' },
};

/** A state in a few words, on a card: done, to do, or neither (`docs/charte.md`, « Le registre de l'adulte »). */
function Tag({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  const { icon: Icon, colors } = TONES[tone];
  return (
    <span className={cn('inline-flex min-h-8 items-center gap-1.5 self-start rounded-control px-2.5 py-0.5 text-sm font-bold', colors, className)}>
      <Icon aria-hidden="true" nonScalingStroke className="size-5 shrink-0" />
      {children}
    </span>
  );
}

export { Tag };
