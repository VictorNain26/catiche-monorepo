import { Button, Card } from '@repo/ui';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link, Navigate, createFileRoute, redirect } from '@tanstack/react-router';
import { UserRoundIcon } from 'lucide-react';
import { HeaderLink, Page } from '../components/page';
import { LEVEL_LABELS, studentsQuery, type Student } from '../lib/household';
import { meQuery } from '../lib/me';
import { minutesText, summaryQuery } from '../lib/summary';

/** The guardian's household: a card per child with their week. Without a child, the adding of one. */
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
  // The last child gone while the page is open, from another device say: the adding, as on arrival.
  if (students.length === 0) return <Navigate to="/foyer/ajouter" />;

  return (
    <Page
      title={`Bonjour ${me?.name ?? ''}`}
      action={
        <HeaderLink to="/foyer/compte" icon={UserRoundIcon}>
          Mon compte
        </HeaderLink>
      }
    >
      <section aria-labelledby="children" className="flex flex-col gap-3">
        <h2 id="children" className="text-xl font-bold text-foreground">
          Vos enfants
        </h2>
        <ul className="flex flex-col gap-2">
          {students.map((student) => (
            <li key={student.id}>
              <ChildCard child={student} />
            </li>
          ))}
        </ul>
      </section>
      <Button asChild variant="outline">
        <Link to="/foyer/ajouter">Ajouter un enfant</Link>
      </Button>
    </Page>
  );
}

/** A child, their class, and their seven last days in a line, which holds its place while it loads. */
function ChildCard({ child }: { child: Student }) {
  const week = useQuery(summaryQuery(child.id));
  return (
    <Card asChild className="flex min-h-11 flex-col gap-1">
      <Link to="/foyer/$studentId" params={{ studentId: child.id }}>
        <span className="flex items-center justify-between gap-3">
          <span className="font-bold">{child.name}</span>
          <span className="text-sm text-muted-foreground">{LEVEL_LABELS[child.level]}</span>
        </span>
        <span className="text-sm text-muted-foreground">
          {week.data
            ? week.data.sessions === 0
              ? 'Pas de séance ces sept derniers jours'
              : `Ces sept derniers jours : ${minutesText(week.data.minutes)}`
            : week.isError
              ? 'Sa semaine n’a pas pu se charger'
              : 'Chargement…'}
        </span>
      </Link>
    </Card>
  );
}
