import { Button } from '@repo/ui';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, Navigate, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { EyeOffIcon } from 'lucide-react';
import { useState } from 'react';
import { CardAction } from '../components/card-action';
import { CodePad } from '../components/code-pad';
import { MessageBanner } from '../components/message-banner';
import { EntryPage } from '../components/page';
import { authClient } from '../lib/auth';
import {
  announceProfileChange,
  chooseTokenFor,
  CODE_DIGITS,
  codeSecret,
  firstCodeRefusal,
  forgottenText,
  forgottenTitle,
  pressKey,
  profilesQuery,
  STUDENT_FAILED,
  stoppedMessage,
  studentCodeMessage,
  tabChannel,
  type CodeMessage,
} from '../lib/student';

/**
 * One profile of this device: its student types their code (E3), or chooses it the first time
 * (E2), twice, and says whether others use the device. A profile without a code to type nor a
 * window to choose one waits for a starting code (E1).
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

  // Blocked here or stopped everywhere: E3 says so, its keypad closed, « J'ai oublié mon code » open.
  if (profile.state === 'ready' || profile.state === 'blocked' || profile.state === 'locked') {
    return <EnterCode studentId={studentId} name={profile.name} parents={profile.parents} stopped={profile.state !== 'ready'} />;
  }
  // The code is chosen in the tab the starting code was typed in, which holds the window's token.
  const token = chooseTokenFor(studentId);
  if (profile.state === 'choose' && token) {
    return <ChooseCode studentId={studentId} parents={profile.parents} shared={data.shared} token={token} />;
  }
  return <Navigate to="/activer" />;
}

/** Once a profile is signed in: the other tabs reload, and the app starts afresh on the student's space. */
function useEntered() {
  const navigate = useNavigate();
  return async () => {
    announceProfileChange(tabChannel());
    await navigate({ to: '/', reloadDocument: true });
  };
}

const NOT_ME = (
  <Button render={<Link to="/profils" />} variant="link">
    Ce n’est pas moi
  </Button>
);

/**
 * E3, the student's code, sent as the sixth digit arrives. Too many tries close the keypad; « J'ai
 * oublié mon code » tells the parents, and the screen says so, with the way to the starting code
 * they will give.
 */
function EnterCode({ studentId, name, parents, stopped }: { studentId: string; name: string; parents: readonly string[]; stopped: boolean }) {
  const queryClient = useQueryClient();
  const entered = useEntered();
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<CodeMessage | null>(null);
  const [forgotten, setForgotten] = useState(false);

  const send = async (typed: string) => {
    setSending(true);
    setFailure(null);
    const { error } = await authClient.student.signIn({ studentId, code: typed });
    if (!error) return entered();
    setSending(false);
    setCode('');
    setFailure(studentCodeMessage(error, parents));
    // Blocked or locked: the profile's state closes the keypad.
    if (error.code === 'PROFILE_BLOCKED' || error.code === 'PROFILE_LOCKED') {
      await queryClient.invalidateQueries({ queryKey: profilesQuery.queryKey });
    }
  };

  const forgot = async () => {
    setSending(true);
    setFailure(null);
    const { error } = await authClient.student.forgot({ studentId });
    setSending(false);
    if (error) setFailure(STUDENT_FAILED);
    else setForgotten(true);
  };

  if (forgotten) {
    return (
      <EntryPage title={forgottenTitle(parents)} announce after={NOT_ME}>
        <p>{forgottenText(parents)}</p>
        <Button render={<Link to="/activer" />} size="lg" className="lg:self-start">
          J’ai un code de départ
        </Button>
      </EntryPage>
    );
  }

  const shown = failure ?? (stopped ? stoppedMessage(parents) : null);
  return (
    <EntryPage
      title={`${name}, tape ton code`}
      pad={
        <CodePad
          label="Ton code, 6 chiffres"
          value={code}
          disabled={sending || stopped}
          onKey={(key) => {
            const typed = pressKey(code, key);
            setCode(typed);
            if (typed.length === CODE_DIGITS) void send(typed);
          }}
        />
      }
      after={
        <div className="flex flex-wrap justify-between gap-x-8 lg:justify-start">
          {NOT_ME}
          <Button variant="link" disabled={sending} onClick={() => void forgot()}>
            J’ai oublié mon code
          </Button>
        </div>
      }
    >
      {shown && <MessageBanner message={shown} />}
    </EntryPage>
  );
}

// An answer to « Quelqu'un d'autre se sert de cet appareil ? »: a card the whole of which is the button.
const CHOICE = 'flex min-h-24 flex-col justify-center gap-1 text-left shadow-control';

type Step = { kind: 'first' } | { kind: 'again'; first: string } | { kind: 'device'; code: string };

/**
 * E2, the first code: chosen, refused at once when too easy, typed again so that a slip does not
 * lock the student out, then whether others use the device. A device a parent added as shared asks
 * nothing.
 */
function ChooseCode({ studentId, parents, shared, token }: { studentId: string; parents: readonly string[]; shared: boolean; token: string }) {
  const queryClient = useQueryClient();
  const entered = useEntered();
  const [step, setStep] = useState<Step>({ kind: 'first' });
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<CodeMessage | null>(null);

  const send = async (chosen: string, ownDevice: boolean) => {
    setSending(true);
    setFailure(null);
    const { error } = await authClient.student.chooseCode({ studentId, code: chosen, ownDevice, chooseToken: token });
    if (!error) return entered();
    setSending(false);
    setStep({ kind: 'first' });
    setFailure(studentCodeMessage(error, parents));
    // The window closed meanwhile: the profile now waits for a starting code.
    if (error.code === 'CODE_NOT_EXPECTED') await queryClient.invalidateQueries({ queryKey: profilesQuery.queryKey });
  };

  /** Six digits typed: the next step. */
  const typed = (chosen: string) => {
    setCode('');
    if (step.kind === 'first') {
      const refusal = firstCodeRefusal(chosen);
      setFailure(refusal);
      if (!refusal) setStep({ kind: 'again', first: chosen });
    } else if (step.kind === 'again' && chosen !== step.first) {
      setStep({ kind: 'first' });
      setFailure({ title: 'Les deux codes sont différents. Recommence.' });
    } else if (step.kind === 'again') {
      if (shared) void send(chosen, false);
      else setStep({ kind: 'device', code: chosen });
    }
  };

  if (step.kind === 'device') {
    return (
      <EntryPage title="Quelqu’un d’autre se sert de cet appareil ?" announce>
        <div className="flex flex-col gap-3">
          <CardAction render={<button type="button" disabled={sending} onClick={() => void send(step.code, false)} />} className={CHOICE}>
            <span className="text-xl font-bold">Oui, on le partage</span>
            <span className="text-sm text-muted-foreground group-hover:text-accent-muted-foreground group-disabled:text-disabled-foreground">
              Catiche se fermera quand tu ne t’en sers plus.
            </span>
          </CardAction>
          <CardAction render={<button type="button" disabled={sending} onClick={() => void send(step.code, true)} />} className={CHOICE}>
            <span className="text-xl font-bold">Non, il est à moi</span>
          </CardAction>
          {failure && <MessageBanner message={failure} />}
        </div>
      </EntryPage>
    );
  }

  return (
    <EntryPage
      title={step.kind === 'first' ? 'Choisis ton code' : 'Tape-le encore une fois'}
      subtitle={step.kind === 'first' ? '6 chiffres que personne d’autre ne connaît.' : undefined}
      announce={step.kind === 'again'}
      pad={
        <CodePad
          label={step.kind === 'first' ? 'Ton code, 6 chiffres' : 'Ton code, encore une fois'}
          value={code}
          disabled={sending}
          onKey={(key) => {
            const next = pressKey(code, key);
            if (next.length === CODE_DIGITS) typed(next);
            else setCode(next);
          }}
        />
      }
    >
      {failure ? (
        <MessageBanner message={failure} />
      ) : (
        <p className="flex gap-3 rounded-2xl bg-muted p-4 text-sm">
          <EyeOffIcon aria-hidden="true" nonScalingStroke className="size-6 shrink-0" />
          <span>{codeSecret(parents)}</span>
        </p>
      )}
    </EntryPage>
  );
}
