import { Banner, Button, List, ListItem, Section } from '@repo/ui';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { BackLink, Page } from '../components/page';
import { PasskeyCreate } from '../components/passkey-create';
import { SignOut } from '../components/sign-out';
import { authClient, authData } from '../lib/auth';
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
  const refresh = () => queryClient.invalidateQueries({ queryKey: passkeysQuery.queryKey });

  const remove = useMutation({
    mutationFn: (id: string) => authData(authClient.passkey.deletePasskey({ id })),
    onSettled: refresh,
  });

  return (
    <Section
      title="Vos clés d’accès"
      description="Une clé d’accès vous fait entrer par le verrouillage de votre téléphone ou de votre ordinateur, sans code par e-mail."
    >
      {passkeys.length > 0 && (
        <List>
          {passkeys.map((passkey) => (
            <ListItem key={passkey.id} title={deviceName(passkey.name)} meta={`Créée le ${formatDay(passkey.createdAt)}`}>
              <Button
                variant="outline"
                disabled={remove.isPending}
                onClick={() => {
                  remove.mutate(passkey.id);
                }}
              >
                Supprimer
              </Button>
            </ListItem>
          ))}
        </List>
      )}
      {remove.error && <Banner tone="error" title={remove.error.message} />}
      <PasskeyCreate label="Créer une clé d’accès sur cet appareil" onCreated={refresh} />
    </Section>
  );
}
