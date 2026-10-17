import { Banner, Button } from '@repo/ui';
import { Link, createFileRoute } from '@tanstack/react-router';
import { Page } from '../components/page';

/** Where better-auth sends an error of its own (`onAPIError.errorURL`): its page has an inline style the CSP blocks. */
export const Route = createFileRoute('/erreur-connexion')({ component: AuthError });

function AuthError() {
  return (
    <Page title="La connexion n’a pas abouti">
      <Banner tone="error" title="Une erreur est survenue">
        Recommencez depuis la connexion : un nouveau code vous sera envoyé.
      </Banner>
      <Button render={<Link to="/connexion" />} variant="link">
        Aller à la connexion
      </Button>
    </Page>
  );
}
