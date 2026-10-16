import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Field } from '@repo/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from '../lib/zod';
import { CodeForm, sendCode } from '../components/code-form';
import { Page } from '../components/page';
import { AuthFailure, authClient, authData, authMessage, deviceSessionsQuery, hasCode, isCancelled } from '../lib/auth';
import { meQuery } from '../lib/me';

/**
 * The guardian's way in, without a password: a passkey, which the browser offers in the address
 * field, or their address, then the code it receives. The first code creates the account, on an
 * invitation (closed beta); /bienvenue then asks its name. On a device paired to a child, the
 * child's session stays on it while the guardian enters.
 */
export const Route = createFileRoute('/connexion')({
  // Read before the page shows, so that a device holding a child's space never shows the sign-in
  // first, nor its other children after the rest; a failure of either still leaves the form.
  loader: async ({ context }) => {
    const me = await context.queryClient.query(meQuery).catch(() => null);
    if (me?.role === 'student') await context.queryClient.query(deviceSessionsQuery).catch(() => undefined);
  },
  component: SignIn,
});

const emailSchema = z.object({ email: z.email('Une adresse e-mail valide.') });

function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const enter = useCallback(() => navigate({ to: '/' }), [navigate]);

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
  // Read by the loader; when /api/me fails, the form still shows.
  const { data: me } = useQuery(meQuery);
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

  const child = me?.role === 'student' ? me : null;
  return (
    // On a device that holds a child's space, a choice of who uses it; elsewhere, the sign-in.
    <Page title={child ? 'Qui utilise Tom ?' : 'Entrer dans Catiche'}>
      {child ? (
        <>
          <Children active={child} />
          <h2 className="text-xl font-bold text-foreground">Vous êtes le parent</h2>
          <p className="text-muted-foreground">Entrez avec votre clé d’accès ou un code : les profils de vos enfants restent sur l’appareil.</p>
        </>
      ) : (
        <>
          <p className="text-foreground">
            Le soir, Tom, un programme, aide votre enfant à faire ses devoirs : il lui pose des questions pour qu’il trouve lui-même, il n’est pas là
            pour donner la réponse.
          </p>
          <Banner tone="info" title="Catiche est en bêta fermée">
            Un compte se crée avec l’adresse e-mail qui a reçu une invitation.
          </Banner>
        </>
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
        {/* On the family's phone, the child's own space is the screen's first way. */}
        <Button type="submit" variant={child ? 'outline' : 'default'} disabled={form.formState.isSubmitting}>
          Recevoir mon code
        </Button>
      </form>
      <Button variant="outline" onClick={() => void withPasskey()}>
        Entrer avec une clé d’accès
      </Button>
      {!child && (
        <Button render={<Link to="/jumeler" />} variant="link">
          Tu es élève ? Relie cet appareil
        </Button>
      )}
    </Page>
  );
}

/**
 * Every child the device holds, the one in use first: each opens their own space. A device the
 * guardian handed to a child holds no guardian session (platform/auth/pairing.ts), so each session
 * here is a child's.
 */
function Children({ active }: { active: { id: string; name: string } }) {
  const navigate = useNavigate();
  const held = useQuery(deviceSessionsQuery);
  const others = (held.data ?? []).filter(({ user }) => user.id !== active.id);
  const switchTo = useMutation({
    mutationFn: async (sessionToken: string) => {
      await authData(authClient.multiSession.setActive({ sessionToken })).catch((failure: unknown) => {
        // Refused past the 5e: from the 4e, a child's space opens on no family device.
        throw failure instanceof AuthFailure && failure.status === 403 ? new Error('Ce profil ne s’ouvre plus sur cet appareil.') : failure;
      });
      // Loaded afresh: nothing of the other child's stays in memory.
      await navigate({ to: '/', reloadDocument: true });
    },
  });

  return (
    <>
      <Button disabled={switchTo.isPending} onClick={() => void navigate({ to: '/' })}>
        C’est {active.name}
      </Button>
      {others.map(({ user, session }) => (
        <Button
          key={session.token}
          disabled={switchTo.isPending}
          onClick={() => {
            switchTo.mutate(session.token);
          }}
        >
          C’est {user.name}
        </Button>
      ))}
      {held.isError && <Banner tone="error" title="Les autres profils de cet appareil n’ont pas pu se charger." />}
      {switchTo.error && <Banner tone="error" title={switchTo.error.message} />}
    </>
  );
}
