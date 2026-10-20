import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { meQuery } from '../lib/me';
import { profilesQuery } from '../lib/student';
import { useSignOut } from './sign-out';

const IDLE_MS = 10 * 60_000;
const ACTIVITY = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * On a shared device, a profile left ten minutes untouched closes, and the screen goes back to the
 * profiles: the brother or sister who comes next finds no space open. The server closes the session
 * all the same (`platform/auth/student-sign-in.ts`); this says so at once, on the screen.
 */
export function IdleSignOut() {
  const { data: me } = useQuery(meQuery);
  const { data: device } = useQuery(profilesQuery);
  const { mutate: signOut } = useSignOut();
  const watched = Boolean(me) && device?.shared === true;

  useEffect(() => {
    if (!watched) return;
    let timer = setTimeout(signOut, IDLE_MS);
    const active = () => {
      clearTimeout(timer);
      timer = setTimeout(signOut, IDLE_MS);
    };
    for (const event of ACTIVITY) window.addEventListener(event, active, { passive: true });
    return () => {
      clearTimeout(timer);
      for (const event of ACTIVITY) window.removeEventListener(event, active);
    };
  }, [watched, signOut]);

  return null;
}
