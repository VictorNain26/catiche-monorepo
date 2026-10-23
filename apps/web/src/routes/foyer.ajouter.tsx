import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button } from '@repo/ui';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ChildFields } from '../components/child-fields';
import { AdultPage } from '../components/page';
import { CHILD_AGES, addStudent, householdMessage, newChildSchema, studentsQuery } from '../lib/household';

/**
 * The adding of the next child, on one screen, as the adult's first screen asks the first
 * (`/bienvenue`); then the child's page, which says the next step. The memory of Tom is proposed
 * from there, never while adding.
 */
export const Route = createFileRoute('/foyer/ajouter')({
  // The household's redirect has just read the list: the cache serves it.
  loader: ({ context }) => context.queryClient.query({ ...studentsQuery, staleTime: 'static' }),
  component: AddChild,
});

function AddChild() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: students } = useSuspenseQuery(studentsQuery);
  const [schema] = useState(() => newChildSchema());
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', month: '', year: '', declaredGuardian: false } });

  const create = useMutation({
    mutationFn: addStudent,
    onSuccess: async (created) => {
      queryClient.setQueryData(studentsQuery.queryKey, (list) => [...(list ?? []), created]);
      await navigate({ to: '/foyer/$studentId', params: { studentId: created.id } });
    },
  });
  const submit = form.handleSubmit((child) => {
    create.mutate(child);
  });

  return (
    // Without a child yet, the home would send back here: no way back to it.
    <AdultPage title="Ajoutez un enfant" withBack={students.length > 0}>
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <ChildFields register={(field) => form.register(field)} errors={form.formState.errors} />
        {create.error && (
          <Banner tone="error" title={householdMessage(create.error, `Vérifiez le prénom et le mois de naissance : votre enfant a ${CHILD_AGES}.`)} />
        )}
        <Button type="submit" disabled={create.isPending}>
          Ajouter cet enfant
        </Button>
      </form>
    </AdultPage>
  );
}
