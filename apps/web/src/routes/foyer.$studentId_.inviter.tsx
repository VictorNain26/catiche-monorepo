import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Field, SelectField, toast } from '@repo/ui';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { AdultPage, BackLink } from '../components/page';
import { isProblem } from '../lib/api';
import { adultsQuery, householdMessage, inviteAdult, inviteSchema, roleChoices, studentsQuery } from '../lib/household';

/**
 * A parent invites another adult for the child (A8): their address, and whether they are a parent
 * or a relative. Then back to the child's page, whose list of adults shows the invitation waiting.
 * Not a nested page of the child's (`_`): it replaces it.
 */
export const Route = createFileRoute('/foyer/$studentId_/inviter')({
  loader: async ({ context, params }) => {
    const students = await context.queryClient.query(studentsQuery);
    if (students.find(({ id }) => id === params.studentId)?.role !== 'guardian') throw redirect({ to: '/foyer' });
  },
  component: InviteAdult,
});

function InviteAdult() {
  const { studentId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: students } = useSuspenseQuery(studentsQuery);
  const child = students.find(({ id }) => id === studentId);
  const form = useForm({ resolver: zodResolver(inviteSchema), defaultValues: { email: '' } });
  const { errors } = form.formState;

  const invite = useMutation({
    mutationFn: (json: Parameters<typeof inviteAdult>[1]) => inviteAdult(studentId, json),
    onSuccess: async (_, { email }) => {
      await queryClient.invalidateQueries({ queryKey: adultsQuery(studentId).queryKey });
      toast(`L’invitation est envoyée à ${email}.`);
      await navigate({ to: '/foyer/$studentId', params: { studentId } });
    },
  });
  const submit = form.handleSubmit((values) => {
    invite.mutate(values);
  });
  if (!child) return null;

  return (
    <AdultPage
      title={`Invitez un adulte pour ${child.name}`}
      back={
        <BackLink to="/foyer/$studentId" params={{ studentId }}>
          {child.name}
        </BackLink>
      }
    >
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <Field label="Son adresse e-mail" type="email" autoComplete="off" {...form.register('email')} error={errors.email?.message} />
        <SelectField
          label={`Pour ${child.name}, cet adulte est`}
          options={roleChoices(child.name)}
          {...form.register('role')}
          error={errors.role?.message}
        />
        <p className="text-muted-foreground">Cet adulte recevra un e-mail pour entrer. Les autres parents de {child.name} en seront prévenus.</p>
        {invite.error && (
          <Banner
            tone="error"
            title={
              isProblem(invite.error, 'INVALID_REQUEST')
                ? `Cette adresse suit déjà ${child.name}, ou c’est la vôtre. Écrivez une autre adresse.`
                : householdMessage(invite.error)
            }
          />
        )}
        <Button type="submit" disabled={invite.isPending} className="sm:self-start">
          Envoyer l’invitation
        </Button>
      </form>
    </AdultPage>
  );
}
