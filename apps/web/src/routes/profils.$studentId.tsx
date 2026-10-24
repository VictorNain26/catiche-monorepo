import { Banner, Button } from '@repo/ui';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { CodePad } from '../components/code-pad';
import { BackLink, Page } from '../components/page';
import { authClient } from '../lib/auth';
import {
  announceProfileChange,
  chooseTokenFor,
  CODE_DIGITS,
  pressKey,
  profileNote,
  profilesQuery,
  studentCodeMessage,
  tabChannel,
} from '../lib/student';

/**
 * One profile of this device: its student types their code, or chooses it the first time, twice,
 * and says whether the device is theirs alone. A profile blocked or without a code says whom to ask.
 */
export const Route = createFileRoute('/profils/$studentId')({
  loader: async ({ context, params }) => {
    const { profiles } = await context.queryClient.query(profilesQuery);
    if (!profiles.some(({ id }) => id === params.studentId)) throw redirect({ to: '/profils' });
  },
  component: Profile,
});

function Profile() {
  const { studentId } = Route.useParams();
  const { data } = useSuspenseQuery(profilesQuery);
  const profile = data.profiles.find(({ id }) => id === studentId);
  if (!profile) return null;

  const back = <BackLink to="/profils">Pas toi ? Changer</BackLink>;
  if (profile.state === 'ready') return <EnterCode studentId={studentId} name={profile.name} back={back} />;
  // The code is chosen in the tab the parent's code was typed in, which holds the window's token.
  const token = chooseTokenFor(studentId);
  if (profile.state === 'choose' && token) {
    return <ChooseCode studentId={studentId} name={profile.name} shared={data.shared} token={token} back={back} />;
  }
  const state = profile.state === 'choose' ? 'waiting' : profile.state;
  return (
    <Page title={profile.name} back={back}>
      <Banner tone="warning" title={profileNote(state) ?? ''}>
        {state === 'waiting'
          ? 'Ton parent obtient dans son espace un code pour cet appareil. Tu choisiras alors ton code.'
          : state === 'blocked'
            ? 'Trop d’essais sur cet appareil. Ton parent peut le débloquer depuis son espace.'
            : 'Trop d’essais : ton code ne marche plus. Ton parent te donne un code pour en choisir un nouveau.'}
      </Banner>
      <Button render={<Link to="/activer" />} variant="outline">
        J’ai un code de départ
      </Button>
    </Page>
  );
}

/** Once a profile is signed in: the other tabs reload, and the app starts afresh on the student's space. */
function useEntered() {
  const navigate = useNavigate();
  return async () => {
    announceProfileChange(tabChannel());
    await navigate({ to: '/', reloadDocument: true });
  };
}

/** The student's code, typed: sent as the sixth digit arrives. */
function EnterCode({ studentId, name, back }: { studentId: string; name: string; back: ReactNode }) {
  const queryClient = useQueryClient();
  const entered = useEntered();
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const send = async (typed: string) => {
    setSending(true);
    setFailure(null);
    const { error } = await authClient.student.signIn({ studentId, code: typed });
    if (!error) return entered();
    setSending(false);
    setCode('');
    setFailure(studentCodeMessage(error));
    // Blocked or locked: the screen says whom to ask.
    if (error.code === 'PROFILE_BLOCKED' || error.code === 'PROFILE_LOCKED') {
      await queryClient.invalidateQueries({ queryKey: profilesQuery.queryKey });
    }
  };

  return (
    <Page title={name} subtitle="Ton code" back={back} wide>
      <PadLayout aside={failure && <Banner tone="error" focusOnMount title={failure} />}>
        <CodePad
          label="Ton code à 6 chiffres"
          value={code}
          disabled={sending}
          onKey={(key) => {
            const typed = pressKey(code, key);
            setCode(typed);
            if (typed.length === CODE_DIGITS) void send(typed);
          }}
        />
      </PadLayout>
    </Page>
  );
}

type Step = { kind: 'first' } | { kind: 'again'; first: string } | { kind: 'device'; code: string };

/**
 * The first code: chosen, typed again so that a slip does not lock the student out, then whether
 * the device is theirs alone. A device already shared asks nothing.
 */
function ChooseCode({ studentId, name, shared, token, back }: { studentId: string; name: string; shared: boolean; token: string; back: ReactNode }) {
  const queryClient = useQueryClient();
  const entered = useEntered();
  const [step, setStep] = useState<Step>({ kind: 'first' });
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const send = async (chosen: string, ownDevice: boolean) => {
    setSending(true);
    setFailure(null);
    const { error } = await authClient.student.chooseCode({ studentId, code: chosen, ownDevice, chooseToken: token });
    if (!error) return entered();
    setSending(false);
    setStep({ kind: 'first' });
    setFailure(studentCodeMessage(error));
    // The window closed meanwhile: the screen says whom to ask.
    if (error.code === 'CODE_NOT_EXPECTED') await queryClient.invalidateQueries({ queryKey: profilesQuery.queryKey });
  };

  /** Six digits typed: the next step. */
  const typed = (chosen: string) => {
    setCode('');
    if (step.kind === 'first') {
      setFailure(null);
      setStep({ kind: 'again', first: chosen });
    } else if (step.kind === 'again' && chosen !== step.first) {
      setStep({ kind: 'first' });
      setFailure('Les deux codes ne sont pas les mêmes. Recommence.');
    } else if (step.kind === 'again') {
      if (shared) void send(chosen, false);
      else setStep({ kind: 'device', code: chosen });
    }
  };

  const aside = (
    <>
      <p className="text-muted-foreground">
        Ton code, toi seul le connais : ton parent ne le voit pas. Il voit le résumé de ta semaine, jamais tes conversations avec Tom.
      </p>
      <p className="text-muted-foreground">Si tu l’oublies, ton parent te donne un code pour en choisir un nouveau ; tu sauras quand il l’a fait.</p>
      {failure && <Banner tone="error" focusOnMount title={failure} />}
    </>
  );

  if (step.kind === 'device') {
    return (
      <Page title="Cet appareil est à toi seul ?" back={back} announce wide>
        <PadLayout aside={aside}>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <Button disabled={sending} onClick={() => void send(step.code, true)}>
              Oui, il est à moi
            </Button>
            <Button variant="outline" disabled={sending} onClick={() => void send(step.code, false)}>
              Non, on le partage
            </Button>
            <p className="text-sm text-muted-foreground">Sur un appareil partagé, ton profil se ferme après 10 minutes sans rien faire.</p>
          </div>
        </PadLayout>
      </Page>
    );
  }

  return (
    <Page
      title={step.kind === 'first' ? 'Choisis ton code' : 'Tape-le encore une fois'}
      subtitle={step.kind === 'first' ? `${name}, 6 chiffres que toi seul connais. Pas 123456, ni ta date de naissance.` : name}
      back={back}
      announce={step.kind === 'again'}
      wide
    >
      <PadLayout aside={aside}>
        <CodePad
          label={step.kind === 'first' ? 'Ton nouveau code à 6 chiffres' : 'Ton nouveau code, encore une fois'}
          value={code}
          disabled={sending}
          onKey={(key) => {
            const next = pressKey(code, key);
            if (next.length === CODE_DIGITS) typed(next);
            else setCode(next);
          }}
        />
      </PadLayout>
    </Page>
  );
}

/** The pad and what goes with it: one column on a phone, side by side on a computer. */
function PadLayout({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
      <div className="flex flex-col gap-3 lg:order-first">{aside}</div>
      <div className="flex justify-center">{children}</div>
    </div>
  );
}
