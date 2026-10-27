import tom from '@repo/ui/assets/tom.png';
import tomHead from '@repo/ui/assets/tom-tete.png';
import { cn } from '@repo/ui/classes';

/** Tom's head, beside what he says: decorative, his name is read with it. Its source is 128 px: small sizes only. */
export function TomHead({ className }: { className?: string }) {
  return <img src={tomHead} alt="" width={128} height={128} className={className} />;
}

/**
 * Tom whole, standing on the student's stage, provisional until his redesign (`docs/charte.md`, « Tom »):
 * decorative, outside a session he says nothing; his size comes from `className`.
 */
export function TomFigure({ className }: { className?: string }) {
  return <img src={tom} alt="" width={768} height={768} className={cn('shrink-0 object-contain', className)} />;
}
