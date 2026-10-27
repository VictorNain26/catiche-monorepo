/**
 * The student's way in, on the web: the profiles this device holds, the keypad of their code, and
 * what they read of a refusal. In the student's words, never the parent's (CNIL, recommendation 6).
 * A change of profile in one tab reloads the others: a brother's or sister's space never stays
 * open behind.
 */

import { queryOptions } from '@tanstack/react-query';
import type { ProfileState } from '@repo/server/contract';
import { studentCodeRefusal } from '@repo/server/student-code';
import { authClient, authData } from './auth';
import { capitalised, listWords } from './words';

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

/**
 * The student's parents as a sentence names them (`app-cible.md` § 5, « Les voix »): « Nadia et
 * Karim », « Nadia ou Karim », « à Nadia ou à Karim »; a single parent alone, the verb then in the
 * singular (`many`); « tes parents » when the server gives no first name.
 */
export function parentWords(parents: readonly string[]) {
  if (parents.length === 0) return { both: 'tes parents', either: 'tes parents', toEither: 'à tes parents', many: true };
  return {
    both: listWords(parents),
    either: listWords(parents, ' ou '),
    toEither: listWords(
      parents.map((name) => `à ${name}`),
      ' ou ',
    ),
    many: parents.length > 1,
  };
}

/** What the student reads of a refusal: what happened, then what to do. */
export interface CodeMessage {
  title: string;
  detail?: string;
}

/** A request of the student's that failed, said without a pronoun, as the general error says it (C1). */
export const STUDENT_FAILED: CodeMessage = { title: 'Ça n’a pas marché.', detail: 'Internet a peut-être coupé.' };

/** Who is told of a code that no longer works, or forgotten (E3): « Nadia et Karim sont prévenus ». */
export function forgottenTitle(parents: readonly string[]) {
  const { both, many } = parentWords(parents);
  // A single parent's gender is unknown: « au courant » agrees with none.
  return capitalised(many ? `${both} sont prévenus` : `${both} est au courant`);
}

/** What follows a forgotten code (E3), before « J'ai un code de départ ». */
export function forgottenText(parents: readonly string[]) {
  const { both, many } = parentWords(parents);
  return many
    ? 'Ils le voient en ouvrant Catiche. Quand ils te donnent un code de départ, touche le bouton.'
    : `${both} le voit en ouvrant Catiche. Quand ${both} te donne un code de départ, touche le bouton.`;
}

/** What the student reads of a refusal of their code, or of a starting code (`app-cible.md`, E2, E3); the server's own message never shows. */
const MESSAGES: Partial<Record<string, CodeMessage>> = {
  INVALID_CODE: { title: 'Ce n’est pas ton code. Réessaie.' },
  CODE_TOO_EASY: { title: 'Ce code est trop facile à deviner.', detail: 'Évite les suites et les chiffres répétés.' },
  CODE_IS_BIRTH_DATE: { title: 'C’est ta date de naissance.', detail: 'Choisis un autre code.' },
  CODE_FORMAT: { title: 'Ton code a 6 chiffres.' },
  CODE_NOT_EXPECTED: { title: 'Le temps est passé.', detail: 'Demande un nouveau code de départ.' },
  INVALID_ACTIVATION_CODE: { title: 'Ce code ne marche pas, ou il a expiré.', detail: 'Demande un nouveau code de départ.' },
};

/**
 * A refusal, in the student's words. A profile blocked on this device and a code stopped
 * everywhere say one thing: the parents' home says which, and what to do.
 */
export function studentCodeMessage(error: { code?: string | undefined; status: number }, parents: readonly string[]): CodeMessage {
  if (error.status === 429) return { title: 'Trop d’essais. Attends une minute avant de réessayer.' };
  if (error.code === 'PROFILE_BLOCKED' || error.code === 'PROFILE_LOCKED') {
    return { title: 'Ton code ne marche plus ici.', detail: `${forgottenTitle(parents)}.` };
  }
  return (error.code === undefined ? undefined : MESSAGES[error.code]) ?? STUDENT_FAILED;
}

/**
 * A first code refused as it is typed, by the server's own rule, before it is typed again; the
 * birth date, which the device does not know, is the server's to refuse.
 */
export const firstCodeRefusal = (code: string): CodeMessage | null =>
  studentCodeRefusal(code, '') === 'easy' ? studentCodeMessage({ code: 'CODE_TOO_EASY', status: 400 }, []) : null;

/** Beside the code to choose (E2): what the parents never see. */
export function codeSecret(parents: readonly string[]) {
  const { both, many } = parentWords(parents);
  return capitalised(`${both} ${many ? 'ne voient' : 'ne voit'} ni ton code, ni tes conversations avec Tom.`);
}

/**
 * What waits behind a name on « Qui fait ses devoirs ? » (C2): a profile blocked here or stopped
 * everywhere says whom to ask; one waiting for a starting code, nothing, its name leads to it.
 */
export function profileNote(state: ProfileState, parents: readonly string[]): string | null {
  if (state === 'blocked' || state === 'locked') return `Bloqué ici. Demande ${parentWords(parents).toEither}.`;
  return state === 'choose' ? 'Choisis ton code' : null;
}

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
