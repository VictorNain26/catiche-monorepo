import { Banner, Button } from '@repo/ui';
import { buttonVariants, cn } from '@repo/ui/classes';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { UsersRoundIcon } from 'lucide-react';
import { authClient, authData } from '../lib/auth';
import { announceProfileChange, tabChannel } from '../lib/student';

/**
 * Signs out of this device, then loads the app afresh, in this tab and the others: nothing of the
 * profile stays in memory. The device keeps its profiles, and the home leads to « Qui fait ses
 * devoirs ? » where it holds some.
 */
export function useSignOut() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async () => {
      await authData(authClient.signOut());
      announceProfileChange(tabChannel());
      await navigate({ to: '/', reloadDocument: true });
    },
  });
}

/** The guardian's sign-out, at the foot of their account. */
export function SignOut({ label }: { label: string }) {
  const signOut = useSignOut();
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

/** In the header of the student's screens: their name, and the way back to the list of profiles. */
export function ChangeProfile({ name }: { name: string }) {
  const signOut = useSignOut();
  return (
    <button
      type="button"
      disabled={signOut.isPending}
      onClick={() => {
        signOut.mutate();
      }}
      className={cn(buttonVariants({ variant: 'link' }), 'gap-1 py-0')}
    >
      <UsersRoundIcon aria-hidden="true" nonScalingStroke className="size-6" />
      {name} · Changer de profil
    </button>
  );
}
