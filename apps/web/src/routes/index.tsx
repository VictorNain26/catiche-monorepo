import { Banner, Button, Fold, List, ListItem, Section, toast } from '@repo/ui';
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { MemoryAnswer } from '../components/memory-answer';
import { Page, ProfileAction } from '../components/page';
import { TomHead } from '../components/tom';
import { WeekSummary } from '../components/week-summary';
import { sessionsQuery, startSession } from '../lib/chat';
import { deviceName, formatDay } from '../lib/device';
import { isRecentReset, meQuery, ownDevicesQuery } from '../lib/me';
import { memoryQuery, useMemoryAnswer, type MemoryChoice } from '../lib/memory';
import { ownSummaryQuery } from '../lib/summary';

/**
 * The home: « Qui fait ses devoirs ? » for a visitor, the household for a guardian, their space for
 * a student: their sessions with Tom, and every device that holds their profile.
 */
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.query(meQuery);
    if (!me) throw redirect({ to: '/profils' });
    if (me.role === 'guardian') throw redirect({ to: '/foyer' });
  },
  loader: ({ context }) => Promise.all([context.queryClient.query(sessionsQuery), context.queryClient.query(ownDevicesQuery)]),
  component: StudentHome,
});

// The student's answer, said back to them once taken.
const ANSWERED: Record<MemoryChoice, string> = {
  accepted: 'C’est noté : Tom retiendra ce qui a résisté. Tu peux tout voir et tout effacer dans « Ce que Tom retient ».',
  declined: 'C’est noté : Tom ne retiendra rien d’une séance à l’autre.',
};

function StudentHome() {
  const { data: me } = useSuspenseQuery(meQuery);
  // Not awaited: the memory is optional, a failure of it leaves the sessions open.
  const { data: memory } = useQuery(memoryQuery);
  const answer = useMemoryAnswer();
  // Not awaited either: the week failing leaves the sessions, and says so.
  const week = useQuery(ownSummaryQuery);

  return (
    <Page title={`Bonjour ${me?.name ?? ''}`} action={<ProfileAction />}>
      <CodeChanged />
      {memory?.state === 'asked' && (
        <MemoryAnswer
          answer={answer}
          onAnswered={(choice) => {
            toast(ANSWERED[choice]);
          }}
        />
      )}
      <Sessions />
      {me && <WeekSummary week={week.data} failed={week.isError} name={me.name} reader="student" />}
      <Button render={<Link to="/memoire" />} variant="link">
        Ce que Tom retient
      </Button>
      <Devices />
    </Page>
  );
}

function Sessions() {
  const navigate = useNavigate();
  const { data: sessions } = useSuspenseQuery(sessionsQuery);
  const start = useMutation({
    mutationFn: startSession,
    onSuccess: ({ id }) => navigate({ to: '/seance/$sessionId', params: { sessionId: id } }),
  });

  return (
    <Section title="Tes séances avec Tom">
      <p className="flex items-center gap-3 text-muted-foreground">
        <TomHead className="size-10 shrink-0" />
        Un exercice qui résiste ? Ouvre une séance, on le reprend pas à pas.
      </p>
      <Button
        disabled={start.isPending}
        onClick={() => {
          start.mutate();
        }}
      >
        Nouvelle séance
      </Button>
      {start.error && <Banner tone="error" title="La séance n’a pas pu s’ouvrir. Réessaie dans un instant." />}
      {sessions.length > 0 && (
        <List>
          {sessions.map((session) => (
            <ListItem
              key={session.id}
              render={<Link to="/seance/$sessionId" params={{ sessionId: session.id }} />}
              title={session.title ?? 'Séance sans titre'}
              meta={formatDay(session.createdAt)}
            />
          ))}
        </List>
      )}
    </Section>
  );
}

/**
 * A code a parent replaced, told to the student for two weeks on their home, and for good in their
 * devices: the parent can enter their space that way, and the student knows when (CNIL, recommendation 5).
 */
function CodeChanged() {
  const { data } = useSuspenseQuery(ownDevicesQuery);
  if (!isRecentReset(data.codeResetAt)) return null;
  return (
    <Banner tone="info" title={`Ton code a été changé le ${formatDay(data.codeResetAt ?? '')}, avec un code de ton parent.`}>
      Si ce n’est pas toi qui l’as changé, parles-en à ton parent.
    </Banner>
  );
}

function Devices() {
  const { data } = useSuspenseQuery(ownDevicesQuery);

  return (
    <Fold title="Tes appareils">
      <List>
        {data.devices.map((device) => (
          <ListItem
            key={device.id}
            title={deviceName(device.userAgent)}
            meta={`${device.shared ? 'Partagé · ajouté' : 'Ajouté'} le ${formatDay(device.createdAt)}`}
          />
        ))}
      </List>
      {data.codeResetAt && <p className="text-sm text-muted-foreground">Ton code a été changé le {formatDay(data.codeResetAt)}.</p>}
      <p className="text-sm text-muted-foreground">Un appareil que tu ne reconnais pas ? Dis-le à ton parent, qui peut le déconnecter.</p>
      <p className="text-sm text-muted-foreground">
        Sur un appareil partagé, ton profil se ferme après 10 minutes sans rien faire : personne d’autre n’y entre après toi.
      </p>
    </Fold>
  );
}
