import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Field } from '@repo/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from '../lib/zod';
import { CodeForm, sendCode } from '../components/code-form';
import { BackLink, Page } from '../components/page';
import { authClient, authMessage, hasCode, isCancelled } from '../lib/auth';
import { meQuery } from '../lib/me';
import { announceProfileChange, profilesQuery, tabChannel } from '../lib/student';

/**
 * The guardian's way in, without a password: a passkey, which the browser offers in the address
 * field, or their address, then the code it receives. The first code creates the account, on an
 * invitation (closed beta); /bienvenue then asks its name. On a device that holds profiles, the
 * guardian's session is the device's: short on a shared one, which a child's code then closes.
 */
export const Route = createFileRoute('/connexion')({
  // Read before the page shows: a device that holds profiles leads back to them. A failure still leaves the form.
  loader: async ({ context }) => {
    await context.queryClient.query(profilesQuery).catch(() => null);
  },
  component: SignIn,
});

const emailSchema = z.object({ email: z.email('Une adresse e-mail valide.') });

function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  // The guardian in: another tab of the device, a child's, reloads on the guardian's space.
  const enter = useCallback(() => {
    announceProfileChange(tabChannel());
    return navigate({ to: '/' });
  }, [navigate]);

  if (email) {
    return (
      <Page title="Votre code">
        <CodeForm email={email} submitLabel="Entrer" onEntered={enter} />
        <Button
          type="button"
          variant="link"
          onClick={() => {
            setEmail(null);
          }}
        >
          Changer d’adresse
        </Button>
      </Page>
    );
  }
  return <EmailStep onSent={setEmail} onEntered={enter} />;
}

function EmailStep({ onSent, onEntered }: { onSent: (email: string) => void; onEntered: () => Promise<void> }) {
  const queryClient = useQueryClient();
  // Read by the loader; when the list fails, the form still shows.
  const { data: device } = useQuery(profilesQuery);
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } });

  const submit = form.handleSubmit(async ({ email }) => {
    setFailure(null);
    const { error } = await sendCode(email);
    if (error) setFailure(authMessage(error));
    else onSent(email);
  });

  const entered = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: meQuery.queryKey });
    await onEntered();
  }, [queryClient, onEntered]);

  // The browser offers the passkeys in the address field. Where it cannot (AUTH_CANCELLED), or
  // until one is chosen, nothing shows: the code is still there.
  useEffect(() => {
    void authClient.signIn.passkey({ autoFill: true }).then(async ({ error }) => {
      if (!error) await entered();
      else if (!isCancelled(error) && !hasCode(error, 'AUTH_CANCELLED')) setFailure(authMessage(error));
    });
  }, [entered]);

  const withPasskey = async () => {
    setFailure(null);
    const { error } = await authClient.signIn.passkey();
    if (!error) await entered();
    else if (!isCancelled(error)) setFailure(authMessage(error));
  };

  const profiles = device?.profiles.length ?? 0;
  return (
    <Page title="Entrer dans Catiche" back={profiles > 0 ? <BackLink to="/profils">Qui fait ses devoirs ?</BackLink> : undefined}>
      <p className="text-foreground">
        Le soir, Tom, un programme, aide votre enfant à faire ses devoirs : il lui pose des questions pour qu’il trouve lui-même, il n’est pas là pour
        donner la réponse.
      </p>
      {device?.shared ? (
        <Banner tone="info" title="Cet appareil est partagé">
          Votre session s’y ferme après 10 minutes sans rien faire : vos enfants ne lisent pas votre espace après vous.
        </Banner>
      ) : (
        <Banner tone="info" title="Catiche est en bêta fermée">
          Un compte se crée avec l’adresse e-mail qui a reçu une invitation.
        </Banner>
      )}
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <Field
          label="Adresse e-mail"
          type="email"
          autoComplete="username webauthn"
          {...form.register('email')}
          error={form.formState.errors.email?.message}
        />
        {failure && <Banner tone="error" title={failure} />}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Recevoir mon code
        </Button>
      </form>
      <Button variant="outline" onClick={() => void withPasskey()}>
        Entrer avec une clé d’accès
      </Button>
      <Button render={<Link to={profiles > 0 ? '/profils' : '/activer'} />} variant="link">
        {profiles > 0 ? 'Tu es élève ? Touche ton prénom' : 'Tu es élève ? Entre le code de ton parent'}
      </Button>
    </Page>
  );
}
