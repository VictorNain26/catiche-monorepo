import { AlertDialog, AlertDialogClose, Banner, Button } from '@repo/ui';
import { buttonVariants, cn } from '@repo/ui/classes';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { LogOutIcon, type LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { authClient, authData } from '../lib/auth';
import { handOff } from '../lib/hand-off';
import { announceProfileChange, STUDENT_FAILED, tabChannel } from '../lib/student';
import { MessageBanner } from './message-banner';

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

/** A button of a screen's header, drawn as its links are; the props of what opens a dialog pass through. */
function HeaderButton({ icon: Icon, children, ...button }: ComponentProps<'button'> & { icon: LucideIcon }) {
  return (
    <button type="button" {...button} className={cn(buttonVariants({ variant: 'link' }), 'gap-1 py-0')}>
      <Icon aria-hidden="true" nonScalingStroke className="size-6" />
      {children}
    </button>
  );
}

/**
 * « Quitter », in the header of the student's « Ce soir » (E4): asked first, as a brother or a
 * sister may touch it; then back to « Qui fait ses devoirs ? ».
 */
export function StudentQuit() {
  const signOut = useSignOut();
  return (
    <AlertDialog
      trigger={<HeaderButton icon={LogOutIcon}>Quitter</HeaderButton>}
      title="Quitter Catiche ?"
      description="Tes devoirs restent là. Personne d’autre ne peut les ouvrir sans ton code."
      error={signOut.error && <MessageBanner message={STUDENT_FAILED} />}
    >
      <Button
        size="lg"
        disabled={signOut.isPending}
        onClick={() => {
          signOut.mutate();
        }}
      >
        Quitter
      </Button>
      <AlertDialogClose render={<Button size="lg" variant="outline" />}>Rester</AlertDialogClose>
    </AlertDialog>
  );
}

/** In the header of the adult's screens. */
export function Quit() {
  const signOut = useSignOut({ adult: true });
  return (
    <HeaderButton
      icon={LogOutIcon}
      disabled={signOut.isPending}
      onClick={() => {
        signOut.mutate();
      }}
    >
      Quitter
    </HeaderButton>
  );
}
