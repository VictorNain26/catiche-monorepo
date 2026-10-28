import { cn } from '@repo/ui/classes';

/** A first name's initial in the fur's light chip, beside the name, which says it: hidden from a screen reader. C2 and A5. */
export function InitialChip({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-12 shrink-0 items-center justify-center rounded-full bg-chip font-heading text-xl font-extrabold text-chip-foreground',
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
