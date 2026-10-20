import { Banner, Button } from '@repo/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authClient, authData, deviceSessionsQuery, signOutOfDevice } from '../lib/auth';

/**
 * Signs the guardian out of this device (`signOutOfDevice`), then loads the app afresh: on their
 * child's device, nothing of theirs stays in memory.
 */
export function SignOut({ label }: { label: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const signOut = useMutation({
    mutationFn: async () => {
      await signOutOfDevice({
        current: () => authData(authClient.getSession()),
        held: () => queryClient.query(deviceSessionsQuery),
        revoke: (sessionToken) => authData(authClient.multiSession.revoke({ sessionToken })),
        signOut: () => authData(authClient.signOut()),
      });
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
