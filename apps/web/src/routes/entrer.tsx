import { Banner, Button } from '@repo/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Page } from '../components/page';
import { FAILED, authClient } from '../lib/auth';
import { entryFromFragment } from '../lib/entry';
import { handOff } from '../lib/hand-off';
import { meQuery } from '../lib/me';
import { announceProfileChange, tabChannel } from '../lib/student';
import { useFragment } from '../lib/use-fragment';

/**
 * Where the button of the sign-in email leads: the address and the code after the `#`, which no
 * server sees, wiped from the address bar as the page opens. Nothing happens until « Entrer » is
 * touched: a mail filter that runs the page's script spends nothing. A link spent, stale or cut
 * says so, and how to get another; the invitation's link, refused, lands here too (`?error=`).
 */
export const Route = createFileRoute('/entrer')({ component: Enter });

function Enter() {
  const hash = useFragment();
  const [entry] = useState(() => entryFromFragment(hash));
  const [spent, setSpent] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const enter = useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      const { error } = await authClient.signIn.emailOtp({ email, otp: code });
      if (error) {
        // The email touched again by the adult already in with its code: their home, not an error.
        const me = await queryClient.query({ ...meQuery, staleTime: 0 });
        if (me?.role === 'guardian' && me.email === email) await navigate({ to: '/', replace: true });
        else setSpent(true);
        return;
      }
      // In: another tab of the device, a child's, reloads on the adult's space.
      announceProfileChange(tabChannel());
      await queryClient.invalidateQueries({ queryKey: meQuery.queryKey });
      await navigate({ to: '/', replace: true });
    },
  });

  if (!entry || spent) return <LinkSpent email={entry?.email} />;
  return (
    <Page title="Entrez dans Catiche">
      {enter.error && <Banner tone="error" title={FAILED} />}
      <Button
        disabled={enter.isPending}
        onClick={() => {
          enter.mutate(entry);
        }}
      >
        Entrer
      </Button>
    </Page>
  );
}

function LinkSpent({ email }: { email: string | undefined }) {
  const navigate = useNavigate();
  return (
    <Page title="Ce lien ne marche plus">
      <p className="text-foreground">Il a déjà servi, ou il est trop ancien.</p>
      <Button
        onClick={() => {
          // The address goes along to the form, never in the address bar.
          if (email !== undefined) handOff().leave('email', email);
          void navigate({ to: '/connexion' });
        }}
      >
        Recevoir un nouvel e-mail
      </Button>
    </Page>
  );
}
