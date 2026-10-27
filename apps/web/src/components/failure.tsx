import { Button } from '@repo/ui';
import { Link, useRouter } from '@tanstack/react-router';

/**
 * C1, a screen that failed to load: what happened, without a pronoun, for the child and the adult
 * alike, a retry and the way home; never the error itself. A card in the middle on a computer.
 */
export function Failure() {
  const router = useRouter();
  return (
    <div className="flex min-h-dvh lg:items-center lg:justify-center">
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-4 pt-8 lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-10 lg:text-card-foreground lg:shadow-control">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl lg:text-4xl">La page ne s’est pas affichée</h1>
          <p className="text-muted-foreground">Internet a peut-être coupé.</p>
        </header>
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-6">
          <Button size="lg" onClick={() => void router.invalidate()}>
            Réessayer
          </Button>
          <Button render={<Link to="/" reloadDocument />} variant="link">
            Revenir à l’accueil
          </Button>
        </div>
      </main>
    </div>
  );
}
