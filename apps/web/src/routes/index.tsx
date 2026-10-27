import { Banner, Button, Card } from '@repo/ui';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { StudentPage } from '../components/page';
import { TomHead } from '../components/tom';
import { WeekSummary } from '../components/week-summary';
import { sessionsQuery, startSession, tonightSession } from '../lib/chat';
import { meQuery, parentsOfMe } from '../lib/me';
import { memoryQuery } from '../lib/memory';
import { markNewsSeen, newsLines, newsQuery } from '../lib/news';
import { STUDENT_FAILED } from '../lib/student';
import { ownSummaryQuery } from '../lib/summary';

/**
 * The home: « Qui fait ses devoirs ? » for a visitor, the household for an adult, and for a student
 * E4, « Ce soir », the screen they come back to: what changed since their last visit, Tom's help to
 * start or take up their homework, the memory Tom offers, and their week.
 */
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.query(meQuery);
    if (!me) throw redirect({ to: '/profils' });
    if (me.role === 'adult') throw redirect({ to: '/foyer' });
  },
  loader: ({ context }) => context.queryClient.query(sessionsQuery),
  component: StudentHome,
});

function StudentHome() {
  const { data: me } = useSuspenseQuery(meQuery);
  const parents = parentsOfMe(me);
  // Not awaited: the memory, the news and the week are each optional, a failure of one leaves the rest.
  const { data: memory } = useQuery(memoryQuery);
  const week = useQuery(ownSummaryQuery);

  return (
    <StudentPage
      title={
        <>
          {me?.name}, voici tes <span className="highlighter">devoirs</span> du soir
        </>
      }
      wide
    >
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-10">
        <News parents={parents} />
        <Start />
        {memory?.state === 'asked' && (
          <Card
            render={<Link to="/memoire" />}
            className="flex min-h-14 items-center font-bold text-primary underline underline-offset-4 transition-colors duration-fast ease-standard hover:bg-accent lg:col-span-5 lg:col-start-8 lg:p-5"
          >
            Tom peut se souvenir de ce qui était difficile
          </Card>
        )}
      </div>
      <section aria-labelledby="soon-title" className="flex flex-col gap-2">
        <h2 id="soon-title" className="text-lg text-foreground">
          Bientôt
        </h2>
        <p className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">Tes contrôles s’afficheront ici les jours d’avant.</p>
      </section>
      {me && <WeekSummary week={week.data} failed={week.isError} name={me.name} reader="student" parents={parents} />}
    </StudentPage>
  );
}

/**
 * « Depuis ta dernière visite », when something changed: a status, which takes no focus. « Vu » says
 * no more than what was read; its failure leaves the card, which says so.
 */
function News({ parents }: { parents: readonly string[] }) {
  const queryClient = useQueryClient();
  const { data: news } = useQuery(newsQuery);
  const seen = useMutation({
    mutationFn: markNewsSeen,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: newsQuery.queryKey }),
  });
  const lines = news ? newsLines(news, parents) : [];
  if (!news || lines.length === 0) return null;
  return (
    <Card render={<section aria-labelledby="news-title" />} className="flex flex-col gap-3 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:p-5">
      <h2 id="news-title" className="text-lg text-card-foreground">
        Depuis ta dernière visite
      </h2>
      <ul className="flex flex-col gap-2 text-sm">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {seen.error && (
        <Banner tone="error" title={STUDENT_FAILED.title}>
          {STUDENT_FAILED.detail}
        </Banner>
      )}
      <Button
        variant="outline"
        className="self-start"
        disabled={seen.isPending}
        onClick={() => {
          seen.mutate(news.readAt);
        }}
      >
        Vu
      </Button>
    </Card>
  );
}

/**
 * « Avant »: Tom, without a bubble, and the way into his help; a session opened today is taken up
 * again rather than a new one started.
 */
function Start() {
  const navigate = useNavigate();
  const { data: sessions } = useSuspenseQuery(sessionsQuery);
  const tonight = tonightSession(sessions);
  const start = useMutation({
    mutationFn: startSession,
    onSuccess: ({ id }) => navigate({ to: '/seance/$sessionId', params: { sessionId: id } }),
  });

  return (
    <section
      aria-labelledby="start-title"
      className="flex flex-col items-center gap-5 pt-2 text-center lg:col-span-7 lg:row-span-2 lg:row-start-1 lg:flex-row lg:items-center lg:gap-8 lg:self-start lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-8 lg:text-left lg:text-card-foreground"
    >
      <TomHead className="size-40 shrink-0 lg:size-48" />
      <div className="flex w-full flex-col gap-5 lg:gap-6">
        <p id="start-title" className="text-lg lg:text-xl">
          Dis à Tom ce que tu as ce soir. Il t’aide à choisir par où commencer.
        </p>
        {tonight ? (
          <Button render={<Link to="/seance/$sessionId" params={{ sessionId: tonight.id }} />} size="lg" className="w-full lg:w-auto lg:self-start">
            Reprendre mes devoirs
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-full lg:w-auto lg:self-start"
            disabled={start.isPending}
            onClick={() => {
              start.mutate();
            }}
          >
            Commencer mes devoirs
          </Button>
        )}
        {start.error && (
          <Banner tone="error" title={STUDENT_FAILED.title}>
            {STUDENT_FAILED.detail}
          </Banner>
        )}
      </div>
    </section>
  );
}
