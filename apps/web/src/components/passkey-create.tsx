import { Banner, Button } from '@repo/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthFailure, authClient, authData, hasCode, isCancelled } from '../lib/auth';
import { CodeForm, sendCode } from './code-form';

/**
 * The making of a passkey on this device. It is made within minutes of entering (the server's
 * freshAge); past them, a code confirms who is there first, then the button comes back.
 */
export function PasskeyCreate({ label, onCreated }: { label: string; onCreated: () => Promise<unknown> }) {
  const [stale, setStale] = useState(false);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: async () => {
      try {
        await authData(authClient.passkey.addPasskey());
      } catch (error) {
        // A window the person closed says nothing; a session too old asks for a code first.
        if (error instanceof AuthFailure && isCancelled(error)) return;
        if (error instanceof AuthFailure && hasCode(error, 'SESSION_NOT_FRESH')) {
          setStale(true);
          return;
        }
        throw error;
      }
      await onCreated();
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

  return (
    <>
      {failure && <Banner tone="error" title={failure.message} />}
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
