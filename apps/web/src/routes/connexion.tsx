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
 * The adult's way in, without a password: a passkey, which the browser offers in the address
 * field, or their address, then the email it receives, whose button lets them in (/entrer) as its
 * code does here. The first entry creates the account, on an invitation (closed beta); /bienvenue
 * then asks its name. On a device that holds profiles, the adult's session is the device's: short
 * on a shared one, which a child's code then closes. `email`: the address, given back by a spent link.
 */
export const Route = createFileRoute('/connexion')({
  validateSearch: z.object({ email: z.string().optional() }),
  // Read before the page shows: a device that holds profiles leads back to them. A failure still leaves the form.
  loader: async ({ context }) => {
    await context.queryClient.query(profilesQuery).catch(() => null);
  },
  component: SignIn,
});

const emailSchema = z.object({ email: z.email('Écrivez une adresse e-mail complète, par exemple nom@exemple.fr.') });

function SignIn() {
  const navigate = useNavigate();
  const { email: given } = Route.useSearch();
  const [email, setEmail] = useState<string | null>(null);
  const [typed, setTyped] = useState(given ?? '');
  // The guardian in: another tab of the device, a child's, reloads on the guardian's space.
  const enter = useCallback(() => {
    announceProfileChange(tabChannel());
    return navigate({ to: '/' });
  }, [navigate]);

  if (email) {
    return (
      <Page title="Ouvrez l’e-mail de Catiche" announce>
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
  return (
    <EmailStep
      initial={typed}
      onSent={(sent) => {
        setTyped(sent);
        setEmail(sent);
      }}
      onEntered={enter}
    />
  );
}

function EmailStep({ initial, onSent, onEntered }: { initial: string; onSent: (email: string) => void; onEntered: () => Promise<void> }) {
  const queryClient = useQueryClient();
  // Read by the loader; when the list fails, the form still shows.
  const { data: device } = useQuery(profilesQuery);
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email: initial } });

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

  const profiles = device?.profiles.length ?? 0;
  return (
    <Page title="Entrez dans Catiche" back={profiles > 0 ? <BackLink to="/profils">Qui fait ses devoirs ?</BackLink> : undefined}>
      <p className="text-foreground">
        Catiche aide votre enfant à organiser ses devoirs du soir, avec Tom, une intelligence artificielle. Vous ne lisez pas ses échanges avec Tom :
        votre enfant vous dit où en sont ses devoirs.
      </p>
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <Field
          label="Votre adresse e-mail"
          type="email"
          autoComplete="username webauthn"
          {...form.register('email')}
          error={form.formState.errors.email?.message}
        />
        {failure && <Banner tone="error" title={failure} />}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Recevoir un e-mail pour entrer
        </Button>
      </form>
      <Button render={<Link to={profiles > 0 ? '/profils' : '/activer'} />} variant="link">
        Tu es élève ? C’est par ici
      </Button>
    </Page>
  );
}
