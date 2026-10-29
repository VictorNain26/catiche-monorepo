import tom from '@repo/ui/assets/tom.png?w=320;720&format=webp&as=picture';
import tomHead from '@repo/ui/assets/tom-tete.png?w=64&format=webp';
import { cn } from '@repo/ui/classes';

/**
 * Tom's head, beside what he says and on the adult's band: decorative, his name is read with it.
 * Shown at 32 px (`size-8`) wherever it stands, so served in webp at twice that.
 */
export function TomHead({ className }: { className?: string }) {
  return <img src={tomHead} alt="" width={64} height={64} className={cn('size-8 shrink-0', className)} />;
}

/**
 * Tom whole, standing on the student's stage, provisional until his redesign (`docs/charte.md`, « Tom »):
 * decorative, outside a session he says nothing; his size comes from `className`. In webp, at
 * twice the sizes he is shown at, `size-28`, `xs:size-40` and `lg:size-90` (`page.tsx`; `xs:size-32` on the adult's
 * way in, which the 160 px of `sizes` covers), as the landing serves him.
 */
export function TomFigure({ className }: { className?: string }) {
  return (
    <img
      src={tom.img.src}
      srcSet={tom.sources.webp}
      sizes="(min-width: 64rem) 360px, (min-width: 22.5rem) 160px, 112px"
      alt=""
      width={768}
      height={768}
      className={cn('shrink-0 object-contain', className)}
    />
  );
}
