import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button } from '@repo/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from '../lib/zod';
import { Field } from '../components/field';
import { Page } from '../components/page';
import { authClient, authData, deviceSessionsQuery } from '../lib/auth';
import { meQuery } from '../lib/me';

/**
 * A new guardian's first name: their account was created by their first code, nameless. A screen
 * of its own, which the household sends them to until they give it, whatever they reloaded. Then
 * the passkey's offer, while the session is fresh, except on a device that holds a child's space:
 * a passkey there would open to the lock the child knows.
 */
export const Route = createFileRoute('/bienvenue')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.query(meQuery);
    if (!me) throw redirect({ to: '/connexion' });
    if (me.role !== 'guardian' || me.name !== '') throw redirect({ to: '/' });
  },
  component: Welcome,
});

const schema = z.object({ name: z.string().trim().min(1, 'Votre prénom.').max(50, '50 caractères au plus.') });

function Welcome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: '' } });
  const name = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      await authData(authClient.updateUser(values));
      await queryClient.invalidateQueries({ queryKey: meQuery.queryKey });
      // The guardian's own session, and a child's if the device holds one.
      const held = await queryClient.query(deviceSessionsQuery);
      await navigate({ to: held.length > 1 ? '/foyer' : '/foyer/cle' });
    },
  });
  const submit = form.handleSubmit((values) => {
    name.mutate(values);
  });

  return (
    <Page title="Bienvenue">
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <Field label="Votre prénom" autoComplete="given-name" {...form.register('name')} error={form.formState.errors.name?.message} />
        {name.error && <Banner tone="error" title={name.error.message} />}
        <Button type="submit" disabled={name.isPending}>
          Continuer
        </Button>
      </form>
    </Page>
  );
}
