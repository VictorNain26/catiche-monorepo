import { Button, List, ListItem, Section } from '@repo/ui';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { BellIcon, BookmarkIcon, CalendarIcon, UsersRoundIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { MessageBanner } from '../components/message-banner';
import { SHEET_ROWS, StudentPage } from '../components/page';
import { WeekSummary } from '../components/week-summary';
import { sessionsQuery, startSession, tonightSession } from '../lib/chat';
import { meQuery, parentsOfMe, whoSeesWhat } from '../lib/me';
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
  loader: ({ context }) => {
    // Started, not awaited: the memory, the news and the week are each optional, a failure of one leaves the rest.
    const { queryClient } = context;
    void queryClient.query(memoryQuery).catch(() => undefined);
    void queryClient.query(newsQuery).catch(() => undefined);
    void queryClient.query(ownSummaryQuery).catch(() => undefined);
    return queryClient.query(sessionsQuery);
  },
  component: StudentHome,
});

function StudentHome() {
  const { data: me } = useSuspenseQuery(meQuery);
  const parents = parentsOfMe(me);
  const { data: memory } = useQuery(memoryQuery);
  const week = useQuery(ownSummaryQuery);

  return (
    <StudentPage
      title={
        <>
          {me?.name}, voici tes <span className="highlighter">devoirs</span> du soir
        </>
      }
      lead={<Start />}
    >
      <News parents={parents} />
      {memory?.state === 'asked' && (
        <List className={SHEET_ROWS}>
          <ListItem
            render={<Link to="/memoire" />}
            className="gap-4"
            leading={
              <IconWell>
                <BookmarkIcon aria-hidden="true" nonScalingStroke className="size-6" />
              </IconWell>
            }
            title="Tom peut se souvenir de ce qui était difficile"
            meta="Si tu es d’accord, Tom retient les leçons où tu as bloqué."
          />
        </List>
      )}
      <p className="flex items-start gap-3 border-t border-border pt-4">
        {/* Who sees what: the parents' figure, not a crossed eye, which a student reads as « Nadia ne voit rien ». */}
        <UsersRoundIcon aria-hidden="true" nonScalingStroke className="size-6 shrink-0 text-muted-foreground" />
        <span>{whoSeesWhat(parents)}</span>
      </p>
      <Section title="Bientôt" titleClassName="text-lg">
        <p className="flex items-center gap-4 border-t border-border pt-4 text-sm text-muted-foreground">
          <IconWell>
            <CalendarIcon aria-hidden="true" nonScalingStroke className="size-6" />
          </IconWell>
          Tes contrôles s’afficheront ici les jours d’avant.
        </p>
      </Section>
      {me && <WeekSummary week={week.data} failed={week.isError} name={me.name} reader="student" parents={parents} />}
    </StudentPage>
  );
}

/** An icon in its well of light water, at the head of a block of the sheet. */
function IconWell({ children }: { children: ReactNode }) {
  return <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-tonal text-tonal-foreground">{children}</span>;
}

/**
 * « Depuis ta dernière visite », when something changed: a status, which takes no focus. « Vu » says
 * no more than what was read; its failure leaves the block, which says so.
 */
function News({ parents }: { parents: readonly string[] }) {
  const queryClient = useQueryClient();
  const { data: news } = useQuery(newsQuery);
  const seen = useMutation({
    mutationFn: markNewsSeen,
    // What was read is said no more: the card goes, without asking the server again.
    onSuccess: () => {
      queryClient.setQueryData(newsQuery.queryKey, (read) => read && { ...read, codeChangedAt: null, devices: [] });
    },
  });
  const lines = news ? newsLines(news, parents) : [];
  if (!news || lines.length === 0) return null;
  return (
    // A block framed on the sheet, not a card laid on it: a card in a card.
    <section aria-labelledby="news-title" className="flex gap-3 rounded-2xl border border-border p-4">
      <IconWell>
        <BellIcon aria-hidden="true" nonScalingStroke className="size-6" />
      </IconWell>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h2 id="news-title" className="text-lg text-card-foreground">
          Depuis ta dernière visite
        </h2>
        <ul className="flex flex-col gap-2 text-sm">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {seen.error && <MessageBanner message={STUDENT_FAILED} />}
        <Button
          variant="tonal"
          className="self-start"
          disabled={seen.isPending}
          onClick={() => {
            seen.mutate(news.readAt);
          }}
        >
          Vu
        </Button>
      </div>
    </section>
  );
}

/**
 * « Avant », on the stage beside Tom, who has no bubble: the way into his help; a session opened
 * today is taken up again rather than a new one started.
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
    <>
      <p className="text-lg lg:max-w-md lg:text-xl">Dis à Tom ce que tu as ce soir. Il t’aide à choisir par où commencer.</p>
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
      {start.error && <MessageBanner message={STUDENT_FAILED} />}
    </>
  );
}
