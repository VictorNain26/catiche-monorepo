import { Banner, Button, Card, toast } from '@repo/ui';
import { cn } from '@repo/ui/classes';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useMemo, useState, type ReactNode } from 'react';
import { useActivation } from '../components/child-access';
import { CodeForm, sendCode } from '../components/code-form';
import { AdultPage, BackLink } from '../components/page';
import { activationLink, formatCode, squarePath } from '../lib/activation';
import { AuthFailure, authClient, authData, hasCode } from '../lib/auth';
import { householdMessage, studentDevicesQuery, studentsQuery, type Student } from '../lib/household';
import { announceProfileChange, keepChooseTokens, profilesQuery, tabChannel } from '../lib/student';

/**
 * A4, where the child works in the evening: on this device, next to the parent, where the child
 * chooses their code at once; or on another, theirs or a relative's, by the square to aim at or the
 * starting code, which can be shared. The parent comes here after adding a child, and from the
 * child's page. Not a nested page of the child's (`_`): it replaces it.
 */
export const Route = createFileRoute('/foyer/$studentId_/appareil')({
  loader: async ({ context, params }) => {
    const profiles = context.queryClient.query(profilesQuery);
    const students = await context.queryClient.query(studentsQuery);
    if (students.find(({ id }) => id === params.studentId)?.role !== 'guardian') throw redirect({ to: '/foyer' });
    await Promise.all([context.queryClient.query(studentDevicesQuery(params.studentId)), profiles]);
  },
  component: LinkDevice,
});

type Where = 'here' | 'other';

function LinkDevice() {
  const { studentId } = Route.useParams();
  const { data: students } = useSuspenseQuery(studentsQuery);
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const activation = useActivation(studentId);
  const [where, setWhere] = useState<Where | null>(null);
  const child = students.find(({ id }) => id === studentId);
  if (!child) return null;
  // A device that already holds the child is not added again.
  const hereOffered = !profiles.profiles.some(({ id }) => id === child.id);

  return (
    <AdultPage
      title={`Où ${child.name} travaille le soir ?`}
      back={
        <BackLink to="/foyer/$studentId" params={{ studentId }}>
          {child.name}
        </BackLink>
      }
      wide
    >
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
        <div className="flex flex-col gap-3">
          {hereOffered && (
            <Choice
              chosen={where === 'here'}
              onChoose={() => {
                setWhere('here');
              }}
            >
              Sur cet appareil, à côté de moi
            </Choice>
          )}
          <Choice
            chosen={where === 'other'}
            onChoose={() => {
              setWhere('other');
              if (!activation.code && !activation.asking) activation.ask('device');
            }}
          >
            Sur un autre appareil : le sien, ou celui d’un proche
          </Choice>
        </div>
        {where === 'here' && <ThisDevice child={child} />}
        {where === 'other' && <OtherDevice child={child} activation={activation} />}
      </div>
    </AdultPage>
  );
}

function Choice({ chosen, onChoose, children }: { chosen: boolean; onChoose: () => void; children: ReactNode }) {
  return (
    <Card
      render={<button type="button" aria-pressed={chosen} onClick={onChoose} />}
      className={cn(
        'flex min-h-16 items-center text-left text-lg font-bold transition-colors duration-fast ease-standard hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
        chosen && 'bg-accent text-accent-foreground',
      )}
    >
      {children}
    </Card>
  );
}

/**
 * The parent at the device: the child's profile goes on it, shared, and the child chooses their
 * code right away (E2). Within minutes of the parent's entering (the server's freshAge); past them,
 * a code received by email confirms who is there first.
 */
function ThisDevice({ child }: { child: Student }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [stale, setStale] = useState(false);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const add = useMutation({
    mutationFn: async () => {
      let added;
      try {
        added = await authData(authClient.student.addProfiles({ studentIds: [child.id] }));
      } catch (error) {
        if (error instanceof AuthFailure && hasCode(error, 'SESSION_NOT_FRESH')) {
          setStale(true);
          return;
        }
        throw error;
      }
      // In this tab's memory only: the child chooses their code here, now; no one later.
      keepChooseTokens(added.chooseTokens);
      announceProfileChange(tabChannel());
      queryClient.clear();
      await navigate({ to: '/profils/$studentId', params: { studentId: child.id } });
    },
  });
  const askCode = useMutation({
    mutationFn: async () => {
      const session = await authData(authClient.getSession());
      if (!session) return;
      await authData(sendCode(session.user.email));
      setCodeSentTo(session.user.email);
    },
  });
  const failure = add.error ?? askCode.error;

  if (codeSentTo) {
    return (
      <CodeForm
        email={codeSentTo}
        submitLabel="Confirmer"
        onEntered={() => {
          setCodeSentTo(null);
          setStale(false);
        }}
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-foreground">{child.name} choisit son code maintenant, sur cet écran. Vous ne le verrez pas.</p>
      {failure && <Banner tone="error" title={failure.message} />}
      {stale ? (
        <>
          <Banner tone="info" title="Confirmez d’abord avec un code reçu par e-mail">
            Par sécurité, un appareil s’ajoute dans les 10 minutes qui suivent votre entrée.
          </Banner>
          <Button
            disabled={askCode.isPending}
            className="sm:self-start"
            onClick={() => {
              askCode.mutate();
            }}
          >
            Recevoir un code
          </Button>
        </>
      ) : (
        <Button
          disabled={add.isPending}
          className="sm:self-start"
          onClick={() => {
            add.mutate();
          }}
        >
          Continuer
        </Button>
      )}
    </div>
  );
}

/** Another device: the square to aim at and the starting code, until a device holds the child's profile. */
function OtherDevice({ child, activation }: { child: Student; activation: ReturnType<typeof useActivation> }) {
  const { code } = activation;
  // The phone's own sharing (SMS, WhatsApp) where there is one; a copy elsewhere.
  const share = useMutation({
    mutationFn: async (shared: string) => {
      const url = activationLink(window.location.origin, shared);
      const text = `Le code de départ de ${child.name} sur Catiche : ${formatCode(shared)}. Il marche une seule fois, pendant 24 heures.`;
      if (typeof navigator.share !== 'function') {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast('Le code est copié.');
        return;
      }
      try {
        await navigator.share({ text, url });
      } catch (error) {
        // The parent closed the phone's sharing: nothing went wrong.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        throw error;
      }
    },
  });
  const home = (
    <Button render={<Link to="/foyer" />} variant="outline" className="sm:self-start">
      Aller à l’accueil
    </Button>
  );

  if (activation.added) {
    return (
      <div className="flex flex-col gap-4">
        <Banner tone="success" focusOnMount title={`L’appareil de ${child.name} est ajouté.`} />
        {home}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {code ? <StartingCode child={child} code={code.code} /> : activation.asking && <p className="text-muted-foreground">Chargement du code…</p>}
      {activation.error && <Banner tone="error" title={householdMessage(activation.error)} />}
      {share.error && <Banner tone="error" title="Le code ne s’est pas partagé. Recopiez-le, ou réessayez." />}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {code && (
          <Button
            disabled={share.isPending}
            onClick={() => {
              share.mutate(code.code);
            }}
          >
            Partager le code
          </Button>
        )}
        <Button
          variant="outline"
          disabled={activation.asking}
          onClick={() => {
            activation.ask('device');
          }}
        >
          Obtenir un autre code
        </Button>
        {home}
      </div>
    </div>
  );
}

function StartingCode({ child, code }: { child: Student; code: string }) {
  const link = activationLink(window.location.origin, code);
  const { size, d } = useMemo(() => squarePath(link), [link]);
  return (
    <Card className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
      <svg
        viewBox={`0 0 ${String(size)} ${String(size)}`}
        role="img"
        aria-label={`Le carré à viser, avec le code de départ de ${child.name}`}
        shapeRendering="crispEdges"
        className="size-56 shrink-0 rounded-control bg-square-background fill-square"
      >
        <path d={d} />
      </svg>
      <div className="flex flex-col gap-3">
        <p className="font-mono text-3xl tracking-widest text-foreground">{formatCode(code)}</p>
        <p className="text-foreground">
          Sur l’autre appareil, visez ce carré avec l’appareil photo : Catiche s’ouvre tout seul. Sinon, ouvrez catiche.fr, touchez « J’ai un code de
          départ » et tapez ce code. Il marche une seule fois, pendant 24 heures.
        </p>
      </div>
    </Card>
  );
}
