import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Field, List, ListItem, Section, toast } from '@repo/ui';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { AdultPage } from '../components/page';
import { PasskeyCreate } from '../components/passkey-create';
import { SignOut } from '../components/sign-out';
import { authClient, authData } from '../lib/auth';
import { deviceName, formatDay } from '../lib/device';
import { meQuery, nameSchema } from '../lib/me';
import { passkeysQuery } from '../lib/passkey';

/**
 * The adult's account, opened from their name at the top of each of their screens: whose it is
 * first, and what this device remembers; their first name; the way out; their passkeys.
 */
export const Route = createFileRoute('/foyer/compte')({
  loader: ({ context }) => context.queryClient.query(passkeysQuery),
  component: Account,
});

function Account() {
  const { data: me } = useSuspenseQuery(meQuery);
  if (me?.role !== 'guardian') return null;
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
    </AdultPage>
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

/** A passkey opens Catiche without waiting for an email; none is made on a shared device, whose lock a child may know. */
function Passkeys({ shared }: { shared: boolean }) {
  const queryClient = useQueryClient();
  const { data: passkeys } = useSuspenseQuery(passkeysQuery);
  const refresh = () => Promise.all([passkeysQuery, meQuery].map(({ queryKey }) => queryClient.invalidateQueries({ queryKey })));

  const remove = useMutation({
    mutationFn: (id: string) => authData(authClient.passkey.deletePasskey({ id })),
    onSettled: refresh,
  });

  return (
    <Section
      title="Vos clés d’accès"
      description="Une clé d’accès vous fait entrer avec votre empreinte, votre visage ou le code qui déverrouille l’appareil, sans attendre d’e-mail."
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
      {/* A second action: the page says first whose account it is. */}
      {!shared && <PasskeyCreate label="Créer une clé d’accès sur cet appareil" onCreated={refresh} secondary />}
    </Section>
  );
}
