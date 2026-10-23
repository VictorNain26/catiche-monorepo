import { Button } from '@repo/ui';
import { Navigate, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Page } from '../components/page';
import { invitationFromFragment } from '../lib/entry';
import { useFragment } from '../lib/use-fragment';

/**
 * Where the invitation email's button leads: better-auth's link after the `#`, which no server
 * sees, wiped from the address bar as the page opens. Nothing happens until « Accepter
 * l'invitation » is touched: a mail filter that opens every link of an email spends nothing.
 * The button goes on to better-auth's link, which creates the account and leads to /bienvenue.
 */
export const Route = createFileRoute('/invitation')({ component: Invitation });

function Invitation() {
  const hash = useFragment();
  const [link] = useState(() => invitationFromFragment(hash));
  // Cut on its way: the page that says a link no longer works, and how to get another.
  if (!link) return <Navigate to="/entrer" replace />;
  return (
    <Page title="Bienvenue sur Catiche">
      <p className="text-foreground">Votre invitation vous attend. Elle sert une seule fois.</p>
      <Button
        onClick={() => {
          window.location.assign(`/api/auth/magic-link/verify?${link}`);
        }}
      >
        Accepter l’invitation
      </Button>
    </Page>
  );
}
