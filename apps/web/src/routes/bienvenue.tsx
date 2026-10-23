import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, CheckboxField, Field } from '@repo/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import type { z } from '../lib/zod';
import { Page } from '../components/page';
import { authClient, authData } from '../lib/auth';
import { declareAdult, meQuery, welcomeSchema } from '../lib/me';
import { profilesQuery } from '../lib/student';

/**
 * A new guardian's first name and their age declared: their account was created by their first
 * code, nameless. A screen of its own, which the household sends them to until they give it,
 * whatever they reloaded. Then
 * the passkey's offer, while the session is fresh, except on a device that holds a child's
 * profile: a passkey there would open to the lock the child knows.
 */
export const Route = createFileRoute('/bienvenue')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.query(meQuery);
    if (!me) throw redirect({ to: '/connexion' });
    if (me.role !== 'guardian' || me.name !== '') throw redirect({ to: '/' });
  },
  component: Welcome,
});

function Welcome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm({ resolver: zodResolver(welcomeSchema), defaultValues: { name: '', adult: false } });
  const name = useMutation({
    mutationFn: async ({ name }: z.output<typeof welcomeSchema>) => {
      await declareAdult();
      await authData(authClient.updateUser({ name }));
      await queryClient.invalidateQueries({ queryKey: meQuery.queryKey });
      const { profiles } = await queryClient.query(profilesQuery);
      await navigate({ to: profiles.length > 0 ? '/foyer' : '/foyer/cle' });
    },
  });
  const submit = form.handleSubmit((values) => {
    name.mutate(values);
  });

  return (
    <Page title="Bienvenue">
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <Field label="Votre prénom" autoComplete="given-name" {...form.register('name')} error={form.formState.errors.name?.message} />
        <CheckboxField label="J’ai 18 ans ou plus." {...form.register('adult')} error={form.formState.errors.adult?.message} />
        {name.error && <Banner tone="error" title={name.error.message} />}
        <Button type="submit" disabled={name.isPending}>
          Continuer
        </Button>
      </form>
    </Page>
  );
}
