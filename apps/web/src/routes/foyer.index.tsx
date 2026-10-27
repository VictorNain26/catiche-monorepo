import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Card, CheckboxField, Section, Skeleton } from '@repo/ui';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { CatchBoundary, Link, Navigate, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AdultPage } from '../components/page';
import { PasskeyOffer } from '../components/passkey-offer';
import { ForgottenCodeGesture, useActivation, useUnblockDevice } from '../components/child-access';
import { deviceKind } from '../lib/device';
import {
  GUARDIAN_HINT,
  GUARDIAN_LABEL,
  LEVEL_LABELS,
  codeAlert,
  deletionAsked,
  hasCodeAlert,
  householdMessage,
  studentDevicesQuery,
  studentsQuery,
  type Student,
} from '../lib/household';
import { capitalised } from '../lib/words';
import {
  acceptInvitation,
  declineInvitation,
  invitationFailure,
  invitationLine,
  invitedWelcomeSchema,
  meQuery,
  pendingInvitations,
  type Invitation,
} from '../lib/me';
import { eveningsLine, summaryQuery } from '../lib/summary';

/**
 * The adult's home (A5): a parent's alerts first, then the passkey's offer when it is due, a card
 * per invitation waiting, and a card per child with their evenings, two by two on a computer.
 * Without a child nor an invitation, the adding of one.
 */
export const Route = createFileRoute('/foyer/')({
  loader: async ({ context }) => {
    const [me, students] = await Promise.all([context.queryClient.query(meQuery), context.queryClient.query(studentsQuery)]);
    if (students.length === 0 && pendingInvitations(me).length === 0) throw redirect({ to: '/foyer/ajouter' });
    // Started, not awaited: each card's line arrives with the page, or says it failed.
    for (const { id } of students) void context.queryClient.query(summaryQuery(id)).catch(() => undefined);
    // A code to give from the home: the child's devices, which tell when the code is spent. A
    // failure is the alert card's alone (`CodeAlert`).
    await Promise.all(
      students
        .filter((child) => child.role === 'guardian' && hasCodeAlert(child.alerts))
        .map(({ id }) => context.queryClient.query(studentDevicesQuery(id)).catch(() => undefined)),
    );
  },
  component: Household,
});

function Household() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: students } = useSuspenseQuery(studentsQuery);
  // Read once: the card stays, to say it is done, or goes by its own « Plus tard ».
  const [offered] = useState(me?.role === 'adult' && me.passkeyOffer);
  const invitations = pendingInvitations(me);
  // The last child gone while the page is open, from another device say: the adding, as on arrival.
  if (students.length === 0 && invitations.length === 0) return <Navigate to="/foyer/ajouter" />;

  return (
    <AdultPage title="Suivez les devoirs de vos enfants" withBack={false} wide>
      {students.map((student) => (
        <AlertCards key={student.id} child={student} />
      ))}
      {offered && <PasskeyOffer />}
      {invitations.map((invitation) => (
        <InvitationCard key={invitation.id} invitation={invitation} />
      ))}
      {students.length > 0 && (
        <Section title="Vos enfants">
          <ul className="grid gap-4 lg:grid-cols-2">
            {students.map((student) => (
              <li key={student.id}>
                <ChildCard child={student} />
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Button render={<Link to="/foyer/ajouter" />} variant="outline" className="sm:self-start">
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
      {failure && <Banner tone="error" title={invitationFailure(failure, invitation)} />}
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

/**
 * What a parent has to act on for a child, at the top of the home (A5): the deletion of their
 * account asked, its author included, seen on « Gérer »; their code forgotten or stopped
 * everywhere, which a starting code given here replaces; else each device that blocked them,
 * unblocked here. A status, which takes no focus.
 */
function AlertCards({ child }: { child: Student }) {
  if (child.role !== 'guardian') return null;
  const alert = codeAlert(child.name, child.alerts);
  return (
    <>
      {child.deletion && (
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold">{deletionAsked(child.name, child.deletion.by)}</p>
          <Button render={<Link to="/foyer/$studentId" params={{ studentId: child.id }} />}>Voir</Button>
        </Card>
      )}
      {alert ? (
        <CodeAlert child={child} alert={alert} />
      ) : (
        child.alerts.blockedDevices.map((device) => <BlockedDevice key={device.id} child={child} device={device} />)
      )}
    </>
  );
}

/**
 * The child's code forgotten or stopped: the starting code given from the card, by the gesture of
 * « Gérer » (A7). The gesture waits for the child's devices, and fails, in the card alone.
 */
function CodeAlert({ child, alert }: { child: Student; alert: string }) {
  return (
    <Card className="flex flex-col gap-3">
      <p className="font-bold">{alert}</p>
      <CatchBoundary getResetKey={() => child.id} errorComponent={() => <Banner tone="error" title={householdMessage(null)} />}>
        <Suspense
          fallback={
            <>
              <span className="sr-only">Chargement…</span>
              <Skeleton className="h-11 w-56" />
            </>
          }
        >
          <CodeGesture child={child} />
        </Suspense>
      </CatchBoundary>
    </Card>
  );
}

function CodeGesture({ child }: { child: Student }) {
  const activation = useActivation(child.id);
  return <ForgottenCodeGesture child={child} activation={activation} label="Donner un code de départ" primary />;
}

/** One blocked device, unblocked by its own request: another card's failure is not its own. */
function BlockedDevice({ child, device }: { child: Student; device: Student['alerts']['blockedDevices'][number] }) {
  const unblock = useUnblockDevice(child.id);
  const kind = deviceKind(device.userAgent);
  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-bold">
        {capitalised(kind.the)} de {child.name} est {kind.blocked} après 3 codes faux.
      </p>
      {unblock.error && <Banner tone="error" title={householdMessage(unblock.error)} />}
      <Button
        disabled={unblock.isPending}
        onClick={() => {
          unblock.mutate(device.id);
        }}
      >
        Débloquer
      </Button>
    </Card>
  );
}

/**
 * A child, their class, whether they worked tonight and the days of their week, without a time nor
 * a subject; the line holds its place while it loads. « Gérer » for a parent, « Ses devoirs et ses
 * messages » for a relative, both to A7.
 */
function ChildCard({ child }: { child: Student }) {
  const week = useQuery(summaryQuery(child.id));
  return (
    <Card className="flex h-full flex-col gap-2">
      <span className="flex items-center justify-between gap-3">
        <span className="font-bold">{child.name}</span>
        <span className="text-sm text-muted-foreground">{LEVEL_LABELS[child.level]}</span>
      </span>
      {week.isPending ? (
        <>
          <span className="sr-only">Chargement…</span>
          <Skeleton className="h-5 w-3/4" />
        </>
      ) : week.data ? (
        <>
          {week.data.tonight && <p>{child.name} a travaillé ce soir.</p>}
          <p className="text-muted-foreground">{eveningsLine(child.name, week.data.days)}</p>
        </>
      ) : (
        <p className="text-muted-foreground">Sa semaine n’a pas pu se charger. Réessayez dans un instant.</p>
      )}
      <Button
        render={<Link to="/foyer/$studentId" params={{ studentId: child.id }} />}
        variant={child.role === 'guardian' ? 'default' : 'outline'}
        className="mt-auto sm:self-start"
      >
        {child.role === 'guardian' ? 'Gérer' : 'Ses devoirs et ses messages'}
      </Button>
    </Card>
  );
}
