/**
 * The student's way in, on the web: the profiles this device holds, the keypad of their code, and
 * what they read of a refusal. In the student's words, never the parent's (CNIL, recommendation 6).
 * A change of profile in one tab reloads the others: a brother's or sister's space never stays
 * open behind.
 */

import { queryOptions } from '@tanstack/react-query';
import type { ProfileState } from '@repo/server/contract';
import { authClient, authData } from './auth';

export type { ProfileState };

/** The profiles this device holds, each with what its student meets, and whether the device is shared. */
export const profilesQuery = queryOptions({
  queryKey: ['profiles'],
  queryFn: () => authData(authClient.student.profiles()),
});

export const CODE_DIGITS = 6;

// The tokens of the windows this tab opened to choose a code: in memory, never stored, so that a
// brother or sister who later touches the name on the list cannot choose in the student's place.
const chooseTokens = new Map<string, string>();

/** The tokens the server gave this tab with a window to choose a code, by student. */
export function keepChooseTokens(tokens: Record<string, string>) {
  for (const [studentId, token] of Object.entries(tokens)) chooseTokens.set(studentId, token);
}

/** The token of the window this tab opened for the student, if it did. */
export const chooseTokenFor = (studentId: string) => chooseTokens.get(studentId);

/** The code once a key is pressed, on the screen's keypad or the keyboard: a digit up to six, or one taken back. */
export function pressKey(code: string, key: string): string {
  if (key === 'Backspace') return code.slice(0, -1);
  if (/^[0-9]$/.test(key) && code.length < CODE_DIGITS) return `${code}${key}`;
  return code;
}

const FAILED = 'Une erreur est survenue. Réessaie dans un instant.';

/** What the student reads of a refusal of their code, or of their parent's; the server's own message never shows. */
const MESSAGES: Partial<Record<string, string>> = {
  INVALID_CODE: 'Ce n’est pas ton code. Réessaie.',
  PROFILE_BLOCKED: 'Trop d’essais : ton profil est bloqué sur cet appareil. Pour le débloquer, demande à ton parent.',
  PROFILE_LOCKED: 'Trop d’essais : ton code ne marche plus. Demande à ton parent un nouveau code.',
  CODE_TOO_EASY: 'Ce code est trop facile à deviner : pas de suite, pas de chiffre répété.',
  CODE_IS_BIRTH_DATE: 'C’est ta date de naissance : quelqu’un pourrait la deviner. Choisis un autre code.',
  CODE_FORMAT: 'Ton code a 6 chiffres.',
  CODE_NOT_EXPECTED: 'Le temps pour choisir ton code est passé. Demande à ton parent un nouveau code.',
  INVALID_ACTIVATION_CODE: 'Ce code n’est pas valable ou a expiré. Demande un nouveau code à ton parent.',
};

export function studentCodeMessage(error: { code?: string | undefined; status: number }): string {
  if (error.status === 429) return 'Trop d’essais. Attends une minute avant de réessayer.';
  return (error.code === undefined ? undefined : MESSAGES[error.code]) ?? FAILED;
}

const NOTES: Record<ProfileState, string | null> = {
  ready: null,
  choose: 'Choisis ton code',
  waiting: 'Demande un code à ton parent',
  blocked: 'Bloqué : demande à ton parent',
  locked: 'Demande un nouveau code à ton parent',
};

/** What waits behind a name on « Qui fait ses devoirs ? ». */
export const profileNote = (state: ProfileState) => NOTES[state];

/** The channel the tabs of this browser share. */
export interface ProfileChannel {
  postMessage: (message: unknown) => void;
  addEventListener: (type: 'message', listener: (event: { data: unknown }) => void) => void;
}

const CHANGED = 'profile-changed';

let channel: ProfileChannel | null | undefined;

/** The tab's own channel, opened once; none where the browser has no BroadcastChannel. */
export const tabChannel = (): ProfileChannel | null =>
  (channel ??= typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('catiche-profile'));

/** Reloads this tab when another one signs a profile in or out. */
export function listenForProfileChange(channel: ProfileChannel | null, reload: () => void) {
  channel?.addEventListener('message', ({ data }) => {
    if (data === CHANGED) reload();
  });
}

/** Tells the other tabs that this one signed a profile in or out. */
export function announceProfileChange(channel: ProfileChannel | null) {
  channel?.postMessage(CHANGED);
}
