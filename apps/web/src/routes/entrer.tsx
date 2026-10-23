import { Button } from '@repo/ui';
import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import { Page } from '../components/page';
import { authClient } from '../lib/auth';
import { entryFromFragment } from '../lib/entry';
import { meQuery } from '../lib/me';
import { announceProfileChange, tabChannel } from '../lib/student';
import { z } from '../lib/zod';

/**
 * Where the button of the sign-in email leads: the address and the code after the `#`, which no
 * server sees. The page enters with them, then leaves this address for the home, the fragment gone
 * from the address bar and the history. A link spent, stale or cut says so, and how to get another;
 * the invitation's link, refused, lands here too (`?error=`, apps/server/src/platform/auth/invitation.ts).
 */
export const Route = createFileRoute('/entrer')({
  validateSearch: z.object({ email: z.string().optional() }),
  beforeLoad: async ({ location, context }) => {
    if (location.hash === '') return;
    const entry = entryFromFragment(location.hash);
    const { error } = entry ? await authClient.signIn.emailOtp({ email: entry.email, otp: entry.code }) : { error: true };
    if (error) {
      // The email tapped again by the adult already in with its code: their home, not an error.
      const me = await context.queryClient.query({ ...meQuery, staleTime: 0 });
      if (entry && me?.role === 'guardian' && me.email === entry.email) throw redirect({ to: '/', replace: true });
      throw redirect({ to: '/entrer', search: entry ? { email: entry.email } : {}, replace: true });
    }
    // In: another tab of the device, a child's, reloads on the adult's space.
    announceProfileChange(tabChannel());
    await context.queryClient.invalidateQueries({ queryKey: meQuery.queryKey });
    throw redirect({ to: '/', replace: true });
  },
  component: LinkSpent,
});

function LinkSpent() {
  const { email } = Route.useSearch();
  return (
    <Page title="Ce lien ne marche plus">
      <p className="text-foreground">Il a déjà servi, ou il est trop ancien.</p>
      <Button render={<Link to="/connexion" search={email === undefined ? {} : { email }} />}>Recevoir un nouvel e-mail</Button>
    </Page>
  );
}
