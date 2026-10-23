import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, CheckboxField, Field, Section } from '@repo/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ChildFields } from '../components/child-fields';
import { Page } from '../components/page';
import { authClient, authData } from '../lib/auth';
import { CHILD_AGES, addStudent, householdMessage, studentsQuery } from '../lib/household';
import { ADULT_LABEL, declareAdult, meQuery, welcomeSchema } from '../lib/me';
import type { z } from '../lib/zod';

/**
 * A new adult's first screen, where the invitation's button leads: their first name and their age
 * declared, then their child, on one screen. Their account was created nameless, by the link or by
 * their first code; the household sends them here until they give their name, whatever they
 * reloaded. Then the child's page, which says how to reach their device.
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
  const [schema] = useState(() => welcomeSchema());
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { you: { name: '', adult: false }, child: { name: '', month: '', year: '', declaredGuardian: false } },
  });
  const { errors } = form.formState;

  // In this order: a child is added only by a named adult who declared their age. Sent again after
  // a failure, the first two change nothing.
  const start = useMutation({
    mutationFn: async ({ you, child }: z.output<ReturnType<typeof welcomeSchema>>) => {
      await authData(authClient.updateUser({ name: you.name }));
      await declareAdult();
      const created = await addStudent(child);
      queryClient.setQueryData(studentsQuery.queryKey, [created]);
      await queryClient.invalidateQueries({ queryKey: meQuery.queryKey });
      await navigate({ to: '/foyer/$studentId', params: { studentId: created.id } });
    },
  });
  const submit = form.handleSubmit((values) => {
    start.mutate(values);
  });

  return (
    <Page title="Présentez-vous, puis votre enfant" wide>
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
          <Section title="Vous">
            <Field
              label="Votre prénom"
              hint="Votre enfant le verra."
              autoComplete="given-name"
              {...form.register('you.name')}
              error={errors.you?.name?.message}
            />
            <CheckboxField label={ADULT_LABEL} {...form.register('you.adult')} error={errors.you?.adult?.message} />
          </Section>
          <Section title="Votre enfant">
            <ChildFields register={(field) => form.register(`child.${field}`)} errors={errors.child} />
          </Section>
        </div>
        {start.error && (
          <Banner tone="error" title={householdMessage(start.error, `Vérifiez le prénom et le mois de naissance : votre enfant a ${CHILD_AGES}.`)} />
        )}
        <Button type="submit" disabled={start.isPending} className="lg:self-start">
          Continuer
        </Button>
      </form>
    </Page>
  );
}
