import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Field, List, ListItem, Section, toast } from '@repo/ui';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AdultPage } from '../components/page';
import { PasskeyCreate } from '../components/passkey-create';
import { RecentEntry } from '../components/recent-entry';
import { SignOut } from '../components/sign-out';
import { AuthFailure, authClient, authData, hasCode } from '../lib/auth';
import { useConfirmation } from '../lib/confirmation';
import { passkeyName } from '../lib/device';
import { accountDeletionWarning, meQuery, nameSchema } from '../lib/me';
import { passkeysQuery } from '../lib/passkey';

/**
 * The adult's account, opened from their name at the top of each of their screens: whose it is
 * first, and what this device remembers; their first name; the way out; their passkeys; apart, at
 * the bottom, the deletion of their account.
 */
export const Route = createFileRoute('/foyer/compte')({
  loader: ({ context }) => context.queryClient.query(passkeysQuery),
  component: Account,
});

function Account() {
  const { data: me } = useSuspenseQuery(meQuery);
  if (me?.role !== 'adult') return null;
  return (
    <AdultPage title="Ce compte est le vôtre">
      <div className="flex flex-col gap-2 text-foreground">
        <p>
          Ce compte est celui de {me.name} : <span className="font-bold">{me.email}</span>.
        </p>
        <p>
          {me.sharedDevice
            ? 'Cet appareil est partagé : votre espace se ferme après 10 minutes sans rien faire.'
            : 'Sur cet appareil, Catiche se souvient de vous : revenez au moins une fois tous les 90 jours, et vous n’aurez pas besoin d’e-mail.'}
        </p>
      </div>
      <FirstName name={me.name} />
      <SignOut label="Quitter Catiche" />
      <Passkeys shared={me.sharedDevice} />
      <DeleteAccount childNames={me.onlyParentOf.map(({ name }) => name)} />
    </AdultPage>
  );
}

/**
 * The adult deletes their account, apart at the bottom, its consequences named first: the children
 * they are the only parent of go with it. A session opened more than 10 minutes ago asks a code
 * received by email (`RecentEntry`), then the deletion goes on; done, the way in (A1).
 */
function DeleteAccount({ childNames }: { childNames: readonly string[] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deletion = useConfirmation();
  const [stale, setStale] = useState(false);
  const remove = useMutation({
    mutationFn: async () => {
      try {
        await authData(authClient.deleteUser());
      } catch (error) {
        if (error instanceof AuthFailure && hasCode(error, 'SESSION_EXPIRED')) {
          setStale(true);
          return;
        }
        throw error;
      }
      queryClient.clear();
      toast('Votre compte est supprimé.');
      await navigate({ to: '/connexion' });
    },
  });

  return (
    <Section title="Supprimer mon compte">
      {stale ? (
        <RecentEntry
          why="Par sécurité, un compte se supprime dans les 10 minutes qui suivent votre entrée."
          onConfirmed={() => {
            setStale(false);
            remove.mutate();
          }}
        />
      ) : deletion.confirming ? (
        <>
          <Banner tone="warning" focusOnMount title={accountDeletionWarning(childNames)} />
          {remove.error && <Banner tone="error" title={remove.error.message} />}
          <Button
            disabled={remove.isPending}
            onClick={() => {
              remove.mutate();
            }}
          >
            Supprimer définitivement
          </Button>
          <Button variant="outline" onClick={deletion.cancel}>
            Annuler
          </Button>
        </>
      ) : (
        <Button
          ref={deletion.opener('confirm')}
          variant="outline"
          className="sm:self-start"
          onClick={() => {
            deletion.open('confirm');
          }}
        >
          Supprimer mon compte
        </Button>
      )}
    </Section>
  );
}

/** The first name the adult's children see. */
function FirstName({ name }: { name: string }) {
  const queryClient = useQueryClient();
  const form = useForm({ resolver: zodResolver(nameSchema), defaultValues: { name } });
  const rename = useMutation({
    mutationFn: async (values: { name: string }) => {
      await authData(authClient.updateUser({ name: values.name }));
      await queryClient.invalidateQueries({ queryKey: meQuery.queryKey });
      toast('Votre prénom est changé.');
    },
  });
  const submit = form.handleSubmit((values) => {
    rename.mutate(values);
  });

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <Field label="Votre prénom" autoComplete="given-name" {...form.register('name')} error={form.formState.errors.name?.message} />
      {rename.error && <Banner tone="error" title={rename.error.message} />}
      <Button type="submit" variant="outline" disabled={rename.isPending} className="sm:self-start">
        Changer mon prénom
      </Button>
    </form>
  );
}

/**
 * A passkey opens Catiche without waiting for an email; none is made on a shared device, whose lock
 * a child may know. Each says its device and its day; « Supprimer » asks a confirmation.
 */
function Passkeys({ shared }: { shared: boolean }) {
  const queryClient = useQueryClient();
  const { data: passkeys } = useSuspenseQuery(passkeysQuery);
  const refresh = () => Promise.all([passkeysQuery, meQuery].map(({ queryKey }) => queryClient.invalidateQueries({ queryKey })));
  const removal = useConfirmation<string>();

  const remove = useMutation({
    mutationFn: (id: string) => authData(authClient.passkey.deletePasskey({ id })),
    onSuccess: () => {
      removal.close();
    },
    onSettled: refresh,
  });
  const confirming = passkeys.find(({ id }) => id === removal.confirming);

  return (
    <Section
      title="Vos clés d’accès"
      description="Une clé d’accès vous fait entrer avec votre empreinte, votre visage ou le code qui déverrouille l’appareil, sans attendre d’e-mail."
    >
      {passkeys.length > 0 && (
        <List>
          {passkeys.map((passkey) => (
            <ListItem key={passkey.id} title={passkeyName(passkey.name, passkey.createdAt)}>
              {removal.confirming !== passkey.id && (
                <Button
                  ref={removal.opener(passkey.id)}
                  variant="outline"
                  onClick={() => {
                    removal.open(passkey.id);
                  }}
                >
                  Supprimer
                </Button>
              )}
            </ListItem>
          ))}
        </List>
      )}
      {confirming && (
        <>
          <Banner
            tone="warning"
            focusOnMount
            title={`La clé « ${passkeyName(confirming.name, confirming.createdAt)} » ne vous fera plus entrer. Vous entrerez avec un code reçu par e-mail.`}
          />
          <Button
            disabled={remove.isPending}
            onClick={() => {
              remove.mutate(confirming.id);
            }}
          >
            Supprimer la clé
          </Button>
          <Button variant="outline" onClick={removal.cancel}>
            Annuler
          </Button>
        </>
      )}
      {remove.error && <Banner tone="error" title={remove.error.message} />}
      {/* A second action: the page says first whose account it is. */}
      {!shared && <PasskeyCreate label="Créer une clé d’accès sur cet appareil" onCreated={refresh} secondary />}
    </Section>
  );
}
