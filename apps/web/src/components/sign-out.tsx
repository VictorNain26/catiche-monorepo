import { Banner, Button } from '@repo/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authClient, authData, deviceSessionsQuery } from '../lib/auth';

/**
 * Signs the guardian out of this device, then loads the app afresh: on a device the family shares,
 * nothing of theirs stays in memory. Where the device also holds a child's session, only theirs is
 * revoked, and the device goes back to the child: better-auth's sign-out would close them all. The
 * sessions it holds unknown, nothing is signed out.
 */
export function SignOut({ label }: { label: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const signOut = useMutation({
    mutationFn: async () => {
      const [current, held] = await Promise.all([authData(authClient.getSession()), queryClient.query(deviceSessionsQuery)]);
      const shared = held.some(({ session }) => session.token !== current?.session.token);
      await (current && shared ? authData(authClient.multiSession.revoke({ sessionToken: current.session.token })) : authData(authClient.signOut()));
      await navigate({ to: '/', reloadDocument: true });
    },
  });

  return (
    <>
      {signOut.error && <Banner tone="error" title={signOut.error.message} />}
      <Button
        variant="outline"
        disabled={signOut.isPending}
        onClick={() => {
          signOut.mutate();
        }}
      >
        {label}
      </Button>
    </>
  );
}
