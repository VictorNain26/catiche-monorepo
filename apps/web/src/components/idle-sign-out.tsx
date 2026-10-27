import { AlertDialog, AlertDialogClose, Button } from '@repo/ui';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { meQuery } from '../lib/me';
import { profilesQuery } from '../lib/student';
import { useSignOut } from './sign-out';

const IDLE_MS = 10 * 60_000;
const WARNING_MS = 60_000;
// A short buzz, where the device has one: the warning is read on the screen all the same.
const VIBRATION_MS = 200;
const ACTIVITY = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * On a shared device, a profile left ten minutes untouched closes, and the screen goes back to the
 * profiles: the brother or sister who comes next finds no space open. A minute before, it says so,
 * and buzzes where the device can; « Je suis encore là », or any touch, gives ten more minutes. The
 * server closes the session all the same (`platform/auth/student-sign-in.ts`); this says so at once,
 * on the screen.
 */
export function IdleSignOut() {
  const { data: me } = useQuery(meQuery);
  const { data: device } = useQuery(profilesQuery);
  const { mutate: signOut } = useSignOut();
  const [warned, setWarned] = useState(false);
  const watched = Boolean(me) && device?.shared === true;

  useEffect(() => {
    if (!watched) return;
    let shown = false;
    let warning: ReturnType<typeof setTimeout> | undefined;
    let closing: ReturnType<typeof setTimeout> | undefined;
    const warn = () => {
      shown = true;
      setWarned(true);
      // Safari has no vibration.
      if ('vibrate' in navigator) navigator.vibrate(VIBRATION_MS);
    };
    /** The warning a minute before, then the closing: from now. */
    const arm = () => {
      clearTimeout(warning);
      clearTimeout(closing);
      warning = setTimeout(warn, IDLE_MS - WARNING_MS);
      closing = setTimeout(signOut, IDLE_MS);
    };
    const active = () => {
      if (shown) {
        shown = false;
        setWarned(false);
      }
      arm();
    };
    arm();
    for (const event of ACTIVITY) window.addEventListener(event, active, { passive: true });
    return () => {
      clearTimeout(warning);
      clearTimeout(closing);
      for (const event of ACTIVITY) window.removeEventListener(event, active);
    };
  }, [watched, signOut]);

  return (
    <AlertDialog
      open={watched && warned}
      onOpenChange={(open) => {
        if (!open) setWarned(false);
      }}
      title="Ton espace va se fermer."
      description="Tes devoirs restent là."
    >
      {/* It closes the dialog; its touch, an activity, starts the ten minutes again. */}
      <AlertDialogClose render={<Button size="lg" />}>Je suis encore là</AlertDialogClose>
    </AlertDialog>
  );
}
