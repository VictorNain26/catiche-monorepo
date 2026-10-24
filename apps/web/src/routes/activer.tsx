import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Field } from '@repo/ui';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { BackLink, Page } from '../components/page';
import { CODE_INPUT_CLASS } from '../components/code-form';
import { activationFromFragment, activationSchema, formatCode } from '../lib/activation';
import { authClient } from '../lib/auth';
import { keepChooseTokens, studentCodeMessage } from '../lib/student';
import { useFragment } from '../lib/use-fragment';

/**
 * E1, a new device or a code forgotten: the starting code a parent obtained puts the student's
 * profile on this device; then the student chooses their code. The square a parent shows leads
 * here with the code after the `#`: the field is filled, and nothing is spent until « Continuer »
 * is touched, so that a link's preview or a filter spends nothing.
 */
export const Route = createFileRoute('/activer')({ component: Activate });

function Activate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hash = useFragment();
  const [failure, setFailure] = useState<string | null>(null);
  const carried = activationFromFragment(hash);
  const form = useForm({ resolver: zodResolver(activationSchema), defaultValues: { code: carried === null ? '' : formatCode(carried) } });

  const submit = form.handleSubmit(async ({ code }) => {
    setFailure(null);
    const { data, error } = await authClient.student.activate({ code });
    if (error) {
      setFailure(studentCodeMessage(error));
      return;
    }
    keepChooseTokens({ [data.studentId]: data.chooseToken });
    // A session the device carried ended with the code: nothing of it stays cached.
    queryClient.clear();
    await navigate({ to: '/profils/$studentId', params: { studentId: data.studentId } });
  });

  return (
    <Page title="Entre ton code de départ" back={<BackLink to="/">Retour</BackLink>} wide>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
        <p className="text-foreground">8 lettres et chiffres, donnés par l’adulte qui a créé ton espace.</p>
        <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
          <Field
            label="Ton code de départ"
            placeholder="ABCD EFGH"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            className={CODE_INPUT_CLASS}
            {...form.register('code')}
            error={form.formState.errors.code?.message}
          />
          {failure && <Banner tone="error" title={failure} />}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Continuer
          </Button>
        </form>
      </div>
    </Page>
  );
}
