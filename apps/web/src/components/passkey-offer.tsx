import { Banner, Button, Card } from '@repo/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { FAILED } from '../lib/auth';
import { closePasskeyOffer, meQuery } from '../lib/me';
import { PasskeyCreate } from './passkey-create';

/**
 * The passkey, offered once at the foot of the home, from the second entry by email on a device
 * that is not shared (`/api/me`, `passkeyOffer`): told by what it spares, the wait for an email.
 * « Plus tard » puts it away for good; « Votre compte » keeps the making of one.
 */
export function PasskeyOffer() {
  const queryClient = useQueryClient();
  const titleId = useId();
  const [state, setState] = useState<'offered' | 'created' | 'closed'>('offered');
  const refresh = () => queryClient.invalidateQueries({ queryKey: meQuery.queryKey });
  const later = useMutation({
    mutationFn: closePasskeyOffer,
    onSuccess: () => {
      setState('closed');
      return refresh();
    },
  });

  if (state === 'closed') return null;
  // Said in place of the card, which the home keeps until it is left.
  if (state === 'created') {
    return <Banner tone="success" title="C’est fait. Sur cet appareil, vous entrez maintenant sans e-mail." focusOnMount />;
  }
  return (
    <Card render={<section aria-labelledby={titleId} />} className="flex flex-col gap-3 lg:p-6">
      <h2 id={titleId} className="text-xl text-foreground">
        Entrez sans attendre d’e-mail
      </h2>
      <p className="text-sm text-muted-foreground">
        Créez une clé d’accès : la prochaine fois, vous entrerez avec votre empreinte, votre visage ou le code qui déverrouille cet appareil.
      </p>
      {later.error && <Banner tone="error" title={FAILED} />}
      {/* A second action: the home's one main button is an alert's. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <PasskeyCreate
          label="Créer ma clé d’accès"
          secondary
          onCreated={async () => {
            setState('created');
            await refresh();
          }}
        />
        <Button
          variant="link"
          disabled={later.isPending}
          onClick={() => {
            later.mutate();
          }}
        >
          Plus tard
        </Button>
      </div>
    </Card>
  );
}
