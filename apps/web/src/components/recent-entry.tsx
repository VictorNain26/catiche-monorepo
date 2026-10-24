import { Banner, Button } from '@repo/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { authClient, authData } from '../lib/auth';
import { CodeForm, sendCode } from './code-form';

/**
 * The recent entry a sensitive gesture asks (`app-cible.md`, « La confirmation récente »), once the
 * server refused it as SESSION_NOT_FRESH: a code received by email confirms who is there, then
 * `onConfirmed` goes back to the gesture. `why`: what the gesture asks the recent entry for.
 */
export function RecentEntry({ onConfirmed, why }: { onConfirmed: () => void; why: string }) {
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const askCode = useMutation({
    mutationFn: async () => {
      const session = await authData(authClient.getSession());
      if (!session) return;
      await authData(sendCode(session.user.email));
      setCodeSentTo(session.user.email);
    },
  });

  if (codeSentTo) {
    return (
      <CodeForm
        email={codeSentTo}
        submitLabel="Confirmer"
        onEntered={() => {
          setCodeSentTo(null);
          onConfirmed();
        }}
      />
    );
  }
  return (
    <>
      <Banner tone="info" title="Confirmez d’abord avec un code reçu par e-mail">
        {why}
      </Banner>
      {askCode.error && <Banner tone="error" title={askCode.error.message} />}
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
  );
}
