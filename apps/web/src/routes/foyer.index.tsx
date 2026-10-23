import { Button, Card, Section, Skeleton } from '@repo/ui';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link, Navigate, createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { AdultPage } from '../components/page';
import { PasskeyOffer } from '../components/passkey-offer';
import { LEVEL_LABELS, studentsQuery, type Student } from '../lib/household';
import { meQuery } from '../lib/me';
import { minutesText, summaryQuery } from '../lib/summary';

/**
 * The adult's home: the passkey's offer when it is due, then a card per child with their week.
 * Without a child, the adding of one.
 */
export const Route = createFileRoute('/foyer/')({
  loader: async ({ context }) => {
    const students = await context.queryClient.query(studentsQuery);
    if (students.length === 0) throw redirect({ to: '/foyer/ajouter' });
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
  // The last child gone while the page is open, from another device say: the adding, as on arrival.
  if (students.length === 0) return <Navigate to="/foyer/ajouter" />;

  return (
    <AdultPage title="Suivez les devoirs de vos enfants" withBack={false}>
      {offered && <PasskeyOffer />}
      <Section title="Vos enfants">
        <ul className="flex flex-col gap-2">
          {students.map((student) => (
            <li key={student.id}>
              <ChildCard child={student} />
            </li>
          ))}
        </ul>
      </Section>
      <Button render={<Link to="/foyer/ajouter" />} variant="outline">
        Ajouter un enfant
      </Button>
    </AdultPage>
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
