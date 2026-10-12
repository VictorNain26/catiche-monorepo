import { Button, Card } from '@repo/ui';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Notice } from '../components/notice';
import { BackLink, Page } from '../components/page';
import { PasskeyCreate } from '../components/passkey-create';
import { SignOut } from '../components/sign-out';
import { authClient, authMessage } from '../lib/auth';
import { deviceName, formatDay } from '../lib/device';
import { passkeysQuery } from '../lib/passkey';

/** The guardian's account, out of the household's home: their passkeys, and the sign-out. */
export const Route = createFileRoute('/foyer/compte')({
  loader: ({ context }) => context.queryClient.query(passkeysQuery),
  component: Account,
});

function Account() {
  return (
    <Page title="Mon compte" back={<BackLink to="/foyer">Retour au foyer</BackLink>}>
      <Passkeys />
      <SignOut label="Se déconnecter" />
    </Page>
  );
}

/** A passkey opens Catiche with the device's own lock, instead of a code by email. */
function Passkeys() {
  const queryClient = useQueryClient();
  const { data: passkeys } = useSuspenseQuery(passkeysQuery);
  const [failure, setFailure] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: passkeysQuery.queryKey });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      setFailure(null);
      const { error } = await authClient.passkey.deletePasskey({ id });
      if (error) setFailure(authMessage(error));
      return refresh();
    },
  });

  return (
    <section aria-labelledby="passkeys" className="flex flex-col gap-3">
      <h2 id="passkeys" className="text-xl font-bold text-foreground">
        Vos clés d’accès
      </h2>
      <p className="text-muted-foreground">
        Une clé d’accès vous fait entrer par le verrouillage de votre téléphone ou de votre ordinateur, sans code par e-mail.
      </p>
      {passkeys.length > 0 && (
        <ul className="flex flex-col gap-2">
          {passkeys.map((passkey) => (
            <Card render={<li />} key={passkey.id} className="flex items-center justify-between gap-3">
              <span className="flex flex-col">
                <span className="font-bold">{deviceName(passkey.name)}</span>
                <span className="text-sm text-muted-foreground">Créée le {formatDay(passkey.createdAt)}</span>
              </span>
              <Button
                variant="outline"
                disabled={remove.isPending}
                onClick={() => {
                  remove.mutate(passkey.id);
                }}
              >
                Supprimer
              </Button>
            </Card>
          ))}
        </ul>
      )}
      {failure && <Notice tone="error">{failure}</Notice>}
      <PasskeyCreate label="Créer une clé d’accès sur cet appareil" onCreated={refresh} />
    </section>
  );
}
