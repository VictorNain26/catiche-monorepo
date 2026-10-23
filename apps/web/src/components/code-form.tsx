import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Field, toast } from '@repo/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { authClient, authMessage } from '../lib/auth';
import { meQuery } from '../lib/me';
import { z } from '../lib/zod';

/** A field for a code, the one the address received or the parent's for a device: large mono, spaced out. */
export const CODE_INPUT_CLASS = 'h-14 font-mono text-2xl tracking-widest md:text-2xl';

const codeSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Le code à 6 chiffres reçu par e-mail.'),
});

export const sendCode = (email: string) => authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });

/**
 * The email sent to the address, which opens a session: by its button, which leads to /entrer, or
 * by its code typed here. To enter, or to confirm who is there.
 */
export function CodeForm({ email, submitLabel, onEntered }: { email: string; submitLabel: string; onEntered: () => Promise<void> | void }) {
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(codeSchema), defaultValues: { otp: '' } });

  const submit = form.handleSubmit(async ({ otp }) => {
    setFailure(null);
    const { error } = await authClient.signIn.emailOtp({ email, otp });
    if (error) {
      setFailure(authMessage(error));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: meQuery.queryKey });
    await onEntered();
  });

  const resend = async () => {
    setFailure(null);
    const { error } = await sendCode(email);
    if (error) {
      setFailure(authMessage(error));
      return;
    }
    toast(`Un nouvel e-mail vient d’être envoyé à ${email}.`);
  };

  return (
    <>
      <p className="text-foreground">
        Nous l’avons envoyé à <span className="font-bold">{email}</span>. Touchez le bouton de l’e-mail, ou tapez son code ici. Il marche 15 minutes.
      </p>
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <Field
          label="Le code reçu par e-mail"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className={CODE_INPUT_CLASS}
          {...form.register('otp')}
          error={form.formState.errors.otp?.message}
        />
        {failure && <Banner tone="error" title={failure} />}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {submitLabel}
        </Button>
      </form>
      <Button type="button" variant="link" onClick={() => void resend()}>
        Renvoyer l’e-mail
      </Button>
    </>
  );
}
