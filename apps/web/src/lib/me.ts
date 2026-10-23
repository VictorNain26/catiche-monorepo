/**
 * Who is signed in, as `/api/me` tells it; null for a visitor without a session. Their devices, and
 * an adult's declarations: being 18 or over, and holding parental authority over each child.
 */

import { queryOptions } from '@tanstack/react-query';
import { api, isProblem, parseResponse } from './api';
import { z } from './zod';

/** A box the adult ticks to declare; left unticked, it says what to do. */
export const ticked = z
  .boolean()
  .refine(Boolean, 'Cochez cette case pour continuer.')
  .transform(() => true as const);

/** A new adult's first name, and their age declared. */
export const welcomeSchema = z.object({ name: z.string().trim().min(1, 'Votre prénom.').max(50, '50 caractères au plus.'), adult: ticked });

/** What an adult has yet to declare, every box ticked: their age, and each child's link by the child's id. */
export const declarationsSchema = z.object({ adult: ticked, guardianOf: z.record(z.string(), ticked) });

/** The adult declares being 18 or over. */
export const declareAdult = () => parseResponse(api.me.declarations.$post({ json: { adult: true } }));

/** Whether the adult has a declaration to make before anything else. */
export const hasMissingDeclarations = (missing: { adult: boolean; guardianOf: string[] }) => missing.adult || missing.guardianOf.length > 0;

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: async () => {
    try {
      return await parseResponse(api.me.$get());
    } catch (error) {
      if (isProblem(error, 'UNAUTHENTICATED')) return null;
      throw error;
    }
  },
});

/** The devices that hold the signed-in student's profile, the newest first, and when a parent last replaced their code. */
export const ownDevicesQuery = queryOptions({
  queryKey: ['me', 'devices'],
  queryFn: () => parseResponse(api.me.devices.$get()),
});

const RESET_NOTICE_DAYS = 14;

/** Whether a parent replaced the student's code within two weeks: their home tells them. */
export const isRecentReset = (resetAt: string | null, now = new Date()) =>
  resetAt !== null && now.getTime() - Date.parse(resetAt) <= RESET_NOTICE_DAYS * 24 * 60 * 60_000;
