import { Banner, Button } from '@repo/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { authClient, authMessage, hasCode, isCancelled } from '../lib/auth';
import { CodeForm, sendCode } from './code-form';

/**
 * The making of a passkey on this device. It is made within minutes of entering (the server's
 * freshAge); past them, a code confirms who is there first, then the button comes back.
 */
export function PasskeyCreate({ label, onCreated }: { label: string; onCreated: () => Promise<unknown> }) {
  const [failure, setFailure] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: async () => {
      setFailure(null);
      const { error } = await authClient.passkey.addPasskey();
      if (!error) await onCreated();
      else if (hasCode(error, 'SESSION_NOT_FRESH')) setStale(true);
      else if (!isCancelled(error)) setFailure(authMessage(error));
    },
  });
  const askCode = useMutation({
    mutationFn: async () => {
      setFailure(null);
      const { data } = await authClient.getSession();
      if (!data) return;
      const { error } = await sendCode(data.user.email);
      if (error) setFailure(authMessage(error));
      else setCodeSentTo(data.user.email);
    },
  });

  return (
    <>
      {failure && <Banner tone="error" title={failure} />}
      {codeSentTo ? (
        <CodeForm
          email={codeSentTo}
          submitLabel="Confirmer"
          onEntered={() => {
            setCodeSentTo(null);
            setStale(false);
          }}
        />
      ) : stale ? (
        <>
          <Banner tone="info" title="Confirmez d’abord avec un code reçu par e-mail">
            Par sécurité, une clé d’accès se crée dans les 10 minutes qui suivent votre entrée.
          </Banner>
          <Button
            disabled={askCode.isPending}
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
          onClick={() => {
            add.mutate();
          }}
        >
          {label}
        </Button>
      )}
    </>
  );
}
