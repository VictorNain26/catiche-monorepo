import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Field } from '@repo/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from '../lib/zod';
import { CodeForm, sendCode } from '../components/code-form';
import { AdultEntryPage } from '../components/page';
import { INVALID_EMAIL, authClient, authMessage, hasCode, isCancelled } from '../lib/auth';
import { handOff } from '../lib/hand-off';
import { meQuery } from '../lib/me';
import { announceProfileChange, profilesQuery, tabChannel } from '../lib/student';

/**
 * The adult's way in, without a password: a passkey, which the browser offers in the address
 * field, or their address, then the email it receives, whose button lets them in (/entrer) as its
 * code does here. The first entry creates the account, on an invitation (closed beta); /bienvenue
 * then asks its name. A student finds their way by « Tu es élève ? ». On a device that holds profiles,
 * the adult's session is the device's: short on a shared one, which a child's code then closes.
 * What the screen before left (`handOff`): the address a spent link gives back, and that the adult
 * just left Catiche, said once.
 */
export const Route = createFileRoute('/connexion')({
  // Read before the page shows: on a device without a profile, a student goes straight to the
  // starting code. A failure still leaves the form.
  loader: async ({ context }) => {
    await context.queryClient.query(profilesQuery).catch(() => null);
  },
  component: SignIn,
});

const emailSchema = z.object({ email: z.email(INVALID_EMAIL) });

function SignIn() {
  const navigate = useNavigate();
  // Read as the page opens, cleared once it is shown: a reload, or a later visit, says nothing more.
  const [given] = useState(() => ({ email: handOff().read('email'), signedOut: handOff().read('signedOut') !== null }));
  useEffect(() => {
    handOff().clear('email');
    handOff().clear('signedOut');
  }, []);
  // The address, kept when the adult goes back to change it.
  const [email, setEmail] = useState(given.email ?? '');
  const [sent, setSent] = useState(false);
  // The guardian in: another tab of the device, a child's, reloads on the guardian's space.
  const enter = useCallback(() => {
    announceProfileChange(tabChannel());
    return navigate({ to: '/' });
  }, [navigate]);

  if (sent) {
    return (
      <AdultEntryPage title="Ouvrez l’e-mail de Catiche" announce>
        <CodeForm email={email} submitLabel="Entrer" onEntered={enter} />
        <Button
          type="button"
          variant="link"
          onClick={() => {
            setSent(false);
          }}
        >
          Changer d’adresse
        </Button>
      </AdultEntryPage>
    );
  }
  return (
    <EmailStep
      initial={email}
      signedOut={given.signedOut}
      onSent={(address) => {
        setEmail(address);
        setSent(true);
      }}
      onEntered={enter}
    />
  );
}

function EmailStep({
  initial,
  signedOut,
  onSent,
  onEntered,
}: {
  initial: string;
  /** The adult just left Catiche on this device. */
  signedOut: boolean;
  onSent: (email: string) => void;
  onEntered: () => Promise<void>;
}) {
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
    <AdultEntryPage
      title="Entrez dans Catiche"
      after={
        <Button render={<Link to={profiles > 0 ? '/profils' : '/activer'} />} variant="link">
          Tu es élève ? C’est par ici
        </Button>
      }
    >
      {signedOut && (
        <p role="status" className="font-bold text-foreground">
          Catiche est fermé sur cet appareil. Pour revenir, donnez votre adresse e-mail.
        </p>
      )}
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <Field
          label="Votre adresse e-mail"
          hint="Celle où vous avez reçu votre invitation."
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
    </AdultEntryPage>
  );
}
