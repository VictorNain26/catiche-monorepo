import { Banner, Button } from '@repo/ui';
import { buttonVariants, cn } from '@repo/ui/classes';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { LogOutIcon, UsersRoundIcon, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { authClient, authData } from '../lib/auth';
import { handOff } from '../lib/hand-off';
import { announceProfileChange, tabChannel } from '../lib/student';

/**
 * Signs out of this device, then loads the app afresh, in this tab and the others: nothing of the
 * profile stays in memory. The device keeps its profiles, and the home leads to « Qui fait ses
 * devoirs ? » where it holds some. An adult's sign-in then says, once, that Catiche is closed here.
 */
export function useSignOut({ adult = false }: { adult?: boolean } = {}) {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async () => {
      await authData(authClient.signOut());
      if (adult) handOff().leave('signedOut', 'yes');
      announceProfileChange(tabChannel());
      await navigate({ to: '/', reloadDocument: true });
    },
  });
}

/** The guardian's sign-out, at the foot of their account. */
export function SignOut({ label }: { label: string }) {
  const signOut = useSignOut({ adult: true });
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

/** A sign-out in a screen's header, drawn as its links are. */
function HeaderSignOut({ icon: Icon, adult, children }: { icon: LucideIcon; adult: boolean; children: ReactNode }) {
  const signOut = useSignOut({ adult });
  return (
    <button
      type="button"
      disabled={signOut.isPending}
      onClick={() => {
        signOut.mutate();
      }}
      className={cn(buttonVariants({ variant: 'link' }), 'gap-1 py-0')}
    >
      <Icon aria-hidden="true" nonScalingStroke className="size-6" />
      {children}
    </button>
  );
}

/** In the header of the student's screens: their name, and the way back to the list of profiles. */
export function ChangeProfile({ name }: { name: string }) {
  return (
    <HeaderSignOut icon={UsersRoundIcon} adult={false}>
      {name} · Changer de profil
    </HeaderSignOut>
  );
}

/** In the header of the adult's screens. */
export function Quit() {
  return (
    <HeaderSignOut icon={LogOutIcon} adult>
      Quitter
    </HeaderSignOut>
  );
}
