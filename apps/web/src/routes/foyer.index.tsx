import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Card, CheckboxField, Section, Skeleton } from '@repo/ui';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, Navigate, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AdultPage } from '../components/page';
import { PasskeyOffer } from '../components/passkey-offer';
import { isProblem } from '../lib/api';
import { GUARDIAN_HINT, GUARDIAN_LABEL, LEVEL_LABELS, householdMessage, studentsQuery, type Student } from '../lib/household';
import { acceptInvitation, declineInvitation, invitationLine, invitedWelcomeSchema, meQuery, pendingInvitations, type Invitation } from '../lib/me';
import { minutesText, summaryQuery } from '../lib/summary';

/**
 * The adult's home: the passkey's offer when it is due, a card per invitation waiting, then a card
 * per child with their week. Without a child nor an invitation, the adding of one.
 */
export const Route = createFileRoute('/foyer/')({
  loader: async ({ context }) => {
    const [me, students] = await Promise.all([context.queryClient.query(meQuery), context.queryClient.query(studentsQuery)]);
    if (students.length === 0 && pendingInvitations(me).length === 0) throw redirect({ to: '/foyer/ajouter' });
    // Started, not awaited: each card's line arrives with the page, or says it failed.
    for (const { id } of students) void context.queryClient.query(summaryQuery(id)).catch(() => undefined);
  },
  component: Household,
});

function Household() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: students } = useSuspenseQuery(studentsQuery);
  // Read once: the card stays, to say it is done, or goes by its own « Plus tard ».
  const [offered] = useState(me?.role === 'guardian' && me.passkeyOffer);
  const invitations = pendingInvitations(me);
  // The last child gone while the page is open, from another device say: the adding, as on arrival.
  if (students.length === 0 && invitations.length === 0) return <Navigate to="/foyer/ajouter" />;

  return (
    <AdultPage title="Suivez les devoirs de vos enfants" withBack={false}>
      {offered && <PasskeyOffer />}
      {invitations.map((invitation) => (
        <InvitationCard key={invitation.id} invitation={invitation} />
      ))}
      {students.length > 0 && (
        <Section title="Vos enfants">
          <ul className="flex flex-col gap-2">
            {students.map((student) => (
              <li key={student.id}>
                <ChildCard child={student} />
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Button render={<Link to="/foyer/ajouter" />} variant="outline">
        Ajouter un enfant
      </Button>
    </AdultPage>
  );
}

/** An invitation waiting for the adult, from their home: a parent ticks the declaration to accept it. */
function InvitationCard({ invitation }: { invitation: Invitation }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const guardian = invitation.role === 'guardian';
  const form = useForm({
    resolver: zodResolver(invitedWelcomeSchema(invitation.role).pick({ declaredGuardian: true })),
    defaultValues: { declaredGuardian: false },
  });
  const refresh = () => Promise.all([meQuery, studentsQuery].map(({ queryKey }) => queryClient.invalidateQueries({ queryKey })));
  const accept = useMutation({
    mutationFn: (declaredGuardian: boolean) => acceptInvitation(invitation.id, declaredGuardian),
    onSuccess: async ({ studentId }) => {
      await refresh();
      await navigate({ to: '/foyer/$studentId', params: { studentId } });
    },
  });
  const decline = useMutation({ mutationFn: () => declineInvitation(invitation.id), onSuccess: refresh });
  const failure = accept.error ?? decline.error;
  const submit = form.handleSubmit(({ declaredGuardian }) => {
    accept.mutate(declaredGuardian);
  });

  return (
    <Card render={<form noValidate onSubmit={(event) => void submit(event)} />} className="flex flex-col gap-4">
      <p className="font-bold">{invitationLine(invitation)}</p>
      {guardian && (
        <CheckboxField
          label={GUARDIAN_LABEL}
          hint={GUARDIAN_HINT}
          {...form.register('declaredGuardian')}
          error={form.formState.errors.declaredGuardian?.message}
        />
      )}
      {failure && (
        <Banner
          tone="error"
          title={
            isProblem(failure, 'NOT_FOUND')
              ? `Cette invitation n’est plus valable. Demandez-en une nouvelle à ${invitation.invitedBy}.`
              : householdMessage(failure)
          }
        />
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={accept.isPending || decline.isPending}>
          Accepter
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={accept.isPending || decline.isPending}
          onClick={() => {
            decline.mutate();
          }}
        >
          Refuser
        </Button>
      </div>
    </Card>
  );
}

/** A child, their class, and their seven last days in a line, which holds its place while it loads. */
function ChildCard({ child }: { child: Student }) {
  const week = useQuery(summaryQuery(child.id));
  return (
    <Card render={<Link to="/foyer/$studentId" params={{ studentId: child.id }} />} className="flex min-h-11 flex-col gap-1">
      <span className="flex items-center justify-between gap-3">
        <span className="font-bold">{child.name}</span>
        <span className="text-sm text-muted-foreground">{LEVEL_LABELS[child.level]}</span>
      </span>
      {week.isPending ? (
        <>
          <span className="sr-only">Chargement…</span>
          <Skeleton className="h-5 w-3/4" />
        </>
      ) : (
        <span className="text-sm text-muted-foreground">
          {week.data
            ? week.data.sessions === 0
              ? 'Pas de séance ces sept derniers jours'
              : `Ces sept derniers jours : ${minutesText(week.data.minutes)}`
            : 'Sa semaine n’a pas pu se charger'}
        </span>
      )}
    </Card>
  );
}
