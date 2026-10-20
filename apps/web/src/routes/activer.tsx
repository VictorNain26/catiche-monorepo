import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Field } from '@repo/ui';
import { useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { BackLink, Page } from '../components/page';
import { CODE_INPUT_CLASS } from '../components/code-form';
import { activationSchema } from '../lib/activation';
import { authClient } from '../lib/auth';
import { keepChooseTokens, studentCodeMessage } from '../lib/student';

/**
 * A new device, or a code forgotten: the code the parent asked for in their space puts the
 * student's profile on this device. Then the student chooses their code, or types the one they have.
 */
export const Route = createFileRoute('/activer')({ component: Activate });

function Activate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(activationSchema), defaultValues: { code: '' } });

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
    <Page title="Le code de ton parent" back={<BackLink to="/">Retour</BackLink>} wide>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
        <div className="flex flex-col gap-3">
          <p>Ton parent obtient ce code dans son espace, pour toi : 8 caractères, valables 10 minutes.</p>
          <p className="text-muted-foreground">
            Ensuite, tu choisis ton propre code, que toi seul connais. Ton parent ne le voit pas : il voit le résumé de ta semaine, jamais tes
            conversations avec Tom.
          </p>
        </div>
        <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
          <Field
            label="Le code de ton parent"
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
          <Button render={<Link to="/connexion" />} variant="link">
            Vous êtes le parent ? Entrer dans votre espace
          </Button>
        </form>
      </div>
    </Page>
  );
}
