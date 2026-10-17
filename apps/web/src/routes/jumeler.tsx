import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Field } from '@repo/ui';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CODE_INPUT_CLASS } from '../components/code-form';
import { Page } from '../components/page';
import { authClient, authMessage } from '../lib/auth';
import { pairingSchema } from '../lib/pairing';

/**
 * The child's device: the code their parent asked for opens its own session. The QR code on the
 * parent's phone opens this page with the code filled in; the child still taps « Relier ».
 */
export const Route = createFileRoute('/jumeler')({
  validateSearch: (search): { code?: string } => (typeof search['code'] === 'string' ? { code: search['code'] } : {}),
  component: Pair,
});

function Pair() {
  const { code: scanned } = Route.useSearch();
  // A code scanned while the page is open replaces the form, filled anew.
  return <PairForm key={scanned ?? ''} scanned={scanned} />;
}

function PairForm({ scanned }: { scanned: string | undefined }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(pairingSchema), defaultValues: { code: scanned ?? '' } });

  const submit = form.handleSubmit(async ({ code }) => {
    setFailure(null);
    const { error } = await authClient.devicePairing.redeem({ code });
    if (error) {
      setFailure(error.status === 400 ? 'Ce code n’est pas valable ou a expiré. Demande un nouveau code à ton parent.' : authMessage(error));
      return;
    }
    // A session this device held before is closed by the pairing: nothing of it stays cached.
    queryClient.clear();
    await navigate({ to: '/' });
  });

  return (
    <Page title="Relier cet appareil">
      <p className="text-muted-foreground">Ton parent obtient un code dans son espace. Saisis-le ici : cet appareil ouvrira ton compte.</p>
      <p>Ton parent voit le résumé de ta semaine : les matières, le temps passé, ce qui résiste.</p>
      <p className="text-muted-foreground">
        Tes conversations avec Tom restent dans ton espace : chaque appareil qui l’ouvre paraît dans ta liste, « Tes appareils reliés ».
      </p>
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <Field
          label="Le code"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          className={CODE_INPUT_CLASS}
          {...form.register('code')}
          error={form.formState.errors.code?.message}
        />
        {failure && <Banner tone="error" title={failure} />}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Relier
        </Button>
      </form>
    </Page>
  );
}
