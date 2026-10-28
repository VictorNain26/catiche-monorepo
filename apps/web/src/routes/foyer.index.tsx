import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Card, CheckboxField, Section, Skeleton, Tag } from '@repo/ui';
import { buttonVariants, cn } from '@repo/ui/classes';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { CatchBoundary, Link, Navigate, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { CheckIcon, ChevronRightIcon, CircleAlertIcon, ClockIcon, EyeIcon, EyeOffIcon, PlusIcon, type LucideIcon } from 'lucide-react';
import { Suspense, useId, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { ForgottenCodeGesture, useActivation, useUnblockDevice } from '../components/child-access';
import { InitialChip } from '../components/initial-chip';
import { AdultPage, LANDING } from '../components/page';
import { PasskeyOffer } from '../components/passkey-offer';
import {
  GUARDIAN_HINT,
  GUARDIAN_LABEL,
  LEVEL_LABELS,
  childAlerts,
  childLink,
  hasCodeAlert,
  homeTitle,
  householdMessage,
  studentDevicesQuery,
  studentsQuery,
  type ChildAlert,
  type Student,
} from '../lib/household';
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
import { eveningsLine, summaryQuery, tonightTag } from '../lib/summary';

/**
 * The adult's home (A5): a card per invitation waiting, then a card per child, which holds their
 * evening, their week and what a parent has to act on for them; beside them on a computer, under
 * them on a phone, what the adult sees of the child and what never, then the passkey's offer when
 * it is due. Without a child nor an invitation, the adding of one.
 */
export const Route = createFileRoute('/foyer/')({
  loader: async ({ context }) => {
    const [me, students] = await Promise.all([context.queryClient.query(meQuery), context.queryClient.query(studentsQuery)]);
    if (students.length === 0 && pendingInvitations(me).length === 0) throw redirect({ to: '/foyer/ajouter' });
    // Started, not awaited: each card's line arrives with the page, or says it failed.
    for (const { id } of students) void context.queryClient.query(summaryQuery(id)).catch(() => undefined);
    // A code to give from the home: the child's devices, which tell when the code is spent. A
    // failure is the alert's alone (`CodeAlert`).
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
  // A relative, who adds no child and reads no « Vos enfants » (A5, for a relative).
  const relative = students.length > 0 && students.every(({ role }) => role === 'relative');

  const cards = (
    <ul className="grid gap-4 lg:grid-cols-2 lg:items-start">
      {students.map((student) => (
        <li key={student.id}>
          <ChildCard child={student} level={relative ? 2 : 3} />
        </li>
      ))}
    </ul>
  );

  return (
    <AdultPage title={homeTitle(students)} withBack={false} wide>
      {invitations.map((invitation) => (
        <InvitationCard key={invitation.id} invitation={invitation} />
      ))}
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-3 lg:items-start">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {students.length > 0 && (relative ? cards : <Section title="Vos enfants">{cards}</Section>)}
          {!relative && (
            <Button render={<Link to="/foyer/ajouter" />} variant="tonal" className="sm:self-start">
              <PlusIcon aria-hidden="true" nonScalingStroke className="size-6" />
              Ajouter un enfant
            </Button>
          )}
        </div>
        {/* On a computer, level with the cards, under the heading of « Vos enfants ». */}
        <div className={cn('flex flex-col gap-6', !relative && 'lg:pt-10')}>
          <WhatYouSee />
          {offered && <PasskeyOffer />}
        </div>
      </div>
    </AdultPage>
  );
}

/** What the adult sees of the child, and what never: a fact of Catiche, on the light plane. */
function WhatYouSee() {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4 rounded-2xl bg-tint p-6 text-foreground">
      <h2 id={titleId} className="text-xl">
        Ce que vous voyez, et ce que vous ne voyez pas
      </h2>
      <Fact icon={EyeIcon} title="Ce que vous voyez">
        Les soirs où votre enfant a travaillé, et le résumé de sa semaine, dans « Gérer ».
      </Fact>
      <Fact icon={EyeOffIcon} title="Ce que vous ne voyez pas">
        Ses conversations avec Tom : elles ne vous sont jamais envoyées.
      </Fact>
      <a href={LANDING.privacy} className={cn(buttonVariants({ variant: 'link' }), 'self-start py-0')}>
        Confidentialité
      </a>
    </section>
  );
}

function Fact({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon aria-hidden="true" nonScalingStroke className="size-6 shrink-0 text-primary" />
      <p className="flex flex-col gap-1">
        <span className="font-bold">{title}</span>
        <span className="text-sm text-muted-foreground">{children}</span>
      </p>
    </div>
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
          variant="tonal"
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
 * A child: their initial, name and class; whether they worked tonight and the days of their week,
 * without a time nor a subject, the line holding its place while it loads; for a parent, what to act
 * on for them, each with its gesture; and, the whole foot of the card a link, « Gérer Léa » for a
 * parent, « Suivre ses devoirs » for a relative, both to A7.
 */
function ChildCard({ child, level }: { child: Student; level: 2 | 3 }) {
  const week = useQuery(summaryQuery(child.id));
  const Heading = level === 2 ? 'h2' : 'h3';
  const titleId = useId();
  const tonight = week.data && tonightTag(week.data.tonight);
  return (
    <Card render={<article aria-labelledby={titleId} />} className="flex flex-col overflow-hidden p-0">
      <div className="flex flex-col gap-4 p-4 lg:p-6">
        <div className="flex items-center gap-3">
          <InitialChip name={child.name} />
          <Heading id={titleId} className="min-w-0 text-xl break-words text-foreground">
            {child.name}
          </Heading>
          <span className="text-muted-foreground">{LEVEL_LABELS[child.level]}</span>
        </div>
        {week.isPending ? (
          <>
            <span className="sr-only">Chargement…</span>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-3/4" />
          </>
        ) : week.data && tonight ? (
          <>
            <Tag tone={tonight.tone} icon={tonight.tone === 'done' ? CheckIcon : ClockIcon}>
              {tonight.label}
            </Tag>
            <p>{eveningsLine(child.name, week.data.days)}</p>
          </>
        ) : (
          <p className="text-muted-foreground">Sa semaine n’a pas pu se charger. Réessayez dans un instant.</p>
        )}
      </div>
      {childAlerts(child).map((alert) => (
        <div key={alert.kind === 'device' ? alert.deviceId : alert.kind} className="flex flex-col gap-3 border-t border-border p-4 lg:p-6">
          <Tag tone="todo" icon={CircleAlertIcon}>
            À faire
          </Tag>
          <p className="font-bold">{alert.text}</p>
          <AlertGesture child={child} alert={alert} />
        </div>
      ))}
      <Link
        to="/foyer/$studentId"
        params={{ studentId: child.id }}
        className="mt-auto flex min-h-14 items-center justify-between gap-2 border-t border-border px-4 font-bold text-primary transition-colors duration-fast ease-standard hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset lg:px-6"
      >
        {childLink(child)}
        <ChevronRightIcon aria-hidden="true" nonScalingStroke className="size-6 shrink-0" />
      </Link>
    </Card>
  );
}

/** The gesture an alert asks, the home's main button: « Voir », a starting code, or « Débloquer ». */
function AlertGesture({ child, alert }: { child: Student; alert: ChildAlert }) {
  if (alert.kind === 'deletion') return <Button render={<Link to="/foyer/$studentId" params={{ studentId: child.id }} />}>Voir</Button>;
  if (alert.kind === 'code') return <CodeAlert child={child} />;
  return <BlockedDevice child={child} deviceId={alert.deviceId} />;
}

/**
 * The child's code forgotten or stopped: the starting code given from the card, by the gesture of
 * « Gérer » (A7). The gesture waits for the child's devices, and fails, in its alert alone.
 */
function CodeAlert({ child }: { child: Student }) {
  return (
    <CatchBoundary getResetKey={() => child.id} errorComponent={() => <Banner tone="error" title={householdMessage(null)} />}>
      <Suspense
        fallback={
          <>
            <span className="sr-only">Chargement…</span>
            <Skeleton className="h-11 w-full" />
          </>
        }
      >
        <CodeGesture child={child} />
      </Suspense>
    </CatchBoundary>
  );
}

function CodeGesture({ child }: { child: Student }) {
  const activation = useActivation(child.id);
  return <ForgottenCodeGesture child={child} activation={activation} label="Donner un code de départ" primary />;
}

/** One blocked device, unblocked by its own request: another alert's failure is not its own. */
function BlockedDevice({ child, deviceId }: { child: Student; deviceId: string }) {
  const unblock = useUnblockDevice(child.id);
  return (
    <>
      {unblock.error && <Banner tone="error" title={householdMessage(unblock.error)} />}
      <Button
        disabled={unblock.isPending}
        onClick={() => {
          unblock.mutate(deviceId);
        }}
      >
        Débloquer
      </Button>
    </>
  );
}
