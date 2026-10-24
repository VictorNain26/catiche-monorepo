/**
 * The starting code, as a parent reads it out, shares it, or shows it as a square to aim at: a
 * link to /activer with the code after the `#`, which the browser never sends to a server nor
 * shows in a link's preview. The page that opens fills its field from it; the child touches
 * « Continuer », so that nothing spends the code but them.
 */

import { isActivationCode } from '@repo/server/activation-code';
import { encode } from 'uqr';
import { z } from './zod';

/** The code as the parent reads it out: two groups of four. */
export const formatCode = (code: string) => `${code.slice(0, 4)} ${code.slice(4)}`;

/** The starting code as the child types it: the server reads it with or without its space or dash. */
export const activationSchema = z.object({ code: z.string().trim().min(8, 'Les 8 caractères du code.').max(32, 'Le code a 8 caractères.') });

/** The link the square carries, and the one « Partager le code » sends. */
export const activationLink = (origin: string, code: string) => `${origin}/activer#${new URLSearchParams({ code }).toString()}`;

/** The code a fragment carries; null when it is absent, cut or altered. */
export function activationFromFragment(hash: string) {
  const code = new URLSearchParams(hash.replace(/^#/, '')).get('code');
  return code !== null && isActivationCode(code) ? code : null;
}

/** The QR code of `text`, a quiet zone of 4 modules around it (ISO/IEC 18004), as one SVG path of unit squares. */
export function squarePath(text: string) {
  const { data } = encode(text, { border: 4 });
  const d = data.flatMap((row, y) => row.flatMap((dark, x) => (dark ? [`M${String(x)} ${String(y)}h1v1h-1z`] : []))).join('');
  return { size: data.length, d };
}
