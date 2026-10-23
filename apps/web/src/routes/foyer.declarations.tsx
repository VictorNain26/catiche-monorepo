import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, CheckboxField } from '@repo/ui';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Navigate, createFileRoute, useNavigate } from '@tanstack/react-router';
import { UserRoundIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { HeaderLink, Page } from '../components/page';
import { GUARDIAN_HINT, GUARDIAN_LABEL, declareGuardian, householdMessage, studentsQuery } from '../lib/household';
import { ADULT_LABEL, declarationsSchema, declareAdult, hasMissingDeclarations, meQuery } from '../lib/me';

/**
 * The declarations an adult has yet to make, asked before anything else: being 18 or over, and
 * holding parental authority over each child added before Catiche asked it. Each one is dated.
 */
export const Route = createFileRoute('/foyer/declarations')({
  loader: ({ context }) => context.queryClient.query(studentsQuery),
  component: Declarations,
});

function Declarations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: students } = useSuspenseQuery(studentsQuery);
  // Read once: the boxes stay as they are while the declarations are sent.
  const [missing] = useState(() => (me?.role === 'guardian' ? me.missing : { adult: false, guardianOf: [] }));
  const children = students.filter(({ id }) => missing.guardianOf.includes(id));
  const form = useForm({
    resolver: zodResolver(declarationsSchema),
    defaultValues: { adult: !missing.adult, guardianOf: Object.fromEntries(children.map(({ id }) => [id, false])) },
  });

  const confirm = useMutation({
    mutationFn: async () => {
      await Promise.all([...(missing.adult ? [declareAdult()] : []), ...children.map(({ id }) => declareGuardian(id))]);
      await queryClient.invalidateQueries({ queryKey: meQuery.queryKey });
      await navigate({ to: '/foyer' });
    },
  });
  const submit = form.handleSubmit(() => {
    confirm.mutate();
  });

  if (!hasMissingDeclarations(missing)) return <Navigate to="/foyer" />;

  return (
    <Page
      title="Confirmez vos déclarations"
      action={
        <HeaderLink to="/foyer/compte" icon={UserRoundIcon}>
          Mon compte
        </HeaderLink>
      }
    >
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-6">
        {missing.adult && <CheckboxField label={ADULT_LABEL} {...form.register('adult')} error={form.formState.errors.adult?.message} />}
        {children.map(({ id, name }) => (
          <fieldset key={id} className="flex flex-col gap-2">
            <legend className="text-sm font-bold text-foreground">{name}</legend>
            <CheckboxField
              label={GUARDIAN_LABEL}
              hint={GUARDIAN_HINT}
              {...form.register(`guardianOf.${id}`)}
              error={form.formState.errors.guardianOf?.[id]?.message}
            />
          </fieldset>
        ))}
        {confirm.error && <Banner tone="error" title={householdMessage(confirm.error)} />}
        <Button type="submit" disabled={confirm.isPending}>
          Continuer
        </Button>
      </form>
    </Page>
  );
}
