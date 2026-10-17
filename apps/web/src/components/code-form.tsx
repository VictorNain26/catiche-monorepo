import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Field, toast } from '@repo/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { authClient, authMessage } from '../lib/auth';
import { meQuery } from '../lib/me';
import { z } from '../lib/zod';

/** A field for a code, the one the address received or the pairing's: large mono, spaced out. */
export const CODE_INPUT_CLASS = 'h-14 font-mono text-2xl tracking-widest md:text-2xl';

const codeSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Le code à 6 chiffres reçu par e-mail.'),
});

export const sendCode = (email: string) => authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });

/** The code sent to the address, which opens a session: to enter, or to confirm who is there. */
export function CodeForm({ email, submitLabel, onEntered }: { email: string; submitLabel: string; onEntered: () => Promise<void> | void }) {
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
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
    setResent(true);
    toast(`Un nouveau code vient d’être envoyé à ${email}.`);
  };

  return (
    <>
      <Banner tone="info" title={`${resent ? 'Un nouveau code' : 'Un code à 6 chiffres'} vient d’être envoyé à ${email}.`}>
        Il est valable 5 minutes.
      </Banner>
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
        Recevoir un nouveau code
      </Button>
    </>
  );
}
