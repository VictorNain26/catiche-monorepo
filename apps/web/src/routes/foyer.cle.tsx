import { Button } from '@repo/ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Page } from '../components/page';
import { PasskeyCreate } from '../components/passkey-create';

/**
 * The passkey, offered once after the first name, on a screen of its own that a reload keeps.
 * Later is fine: « Mon compte » makes one too.
 */
export const Route = createFileRoute('/foyer/cle')({ component: PasskeyOffer });

function PasskeyOffer() {
  const navigate = useNavigate();
  const home = () => navigate({ to: '/foyer' });

  return (
    <Page title="Entrer plus vite la prochaine fois" announce>
      <p className="text-foreground">
        Une clé d’accès vous fait entrer par le verrouillage de votre téléphone ou de votre ordinateur, sans code par e-mail. Vous la retrouvez dans «
        Mon compte ».
      </p>
      <PasskeyCreate label="Créer ma clé d’accès" onCreated={home} />
      <Button variant="outline" onClick={() => void home()}>
        Plus tard
      </Button>
    </Page>
  );
}
