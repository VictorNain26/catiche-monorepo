/**
 * Who is signed in, as `/api/me` tells it; null for a visitor without a session. Their devices, and
 * an adult's declarations: being 18 or over, and holding parental authority over each child.
 */

import { queryOptions } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { api, isProblem, parseResponse } from './api';
import { firstName, newChildSchema } from './household';
import { ticked, z } from './zod';

/** The adult's declaration of their age, the box's own words. */
export const ADULT_LABEL = 'J’ai 18 ans ou plus.';

/** The first name the adult's children see. */
const adultName = firstName('Votre prénom.');

/** A new adult's first screen: their first name and their age declared, then their child, as the adding asks it. */
export const welcomeSchema = (now = new Date()) => z.object({ you: z.object({ name: adultName, adult: ticked }), child: newChildSchema(now) });

/** The adult's first name, changed in their account. */
export const nameSchema = z.object({ name: adultName });

/** « Plus tard » on the passkey's offer: the home shows it no more, « Votre compte » keeps the making of one. */
export const closePasskeyOffer = () => parseResponse(api.me['passkey-offer'].$post());

/** What an adult has yet to declare, every box ticked: their age, and each child's link by the child's id. */
export const declarationsSchema = z.object({ adult: ticked, guardianOf: z.record(z.string(), ticked) });

/** The adult declares being 18 or over. */
export const declareAdult = () => parseResponse(api.me.declarations.$post({ json: { adult: true } }));

/** What an adult has yet to declare, as `/api/me` tells it. */
type MissingDeclarations = Extract<InferResponseType<typeof api.me.$get, 200>, { role: 'guardian' }>['missing'];

/** Whether the adult has a declaration to make before anything else. */
export const hasMissingDeclarations = (missing: MissingDeclarations) => missing.adult || missing.guardianOf.length > 0;

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
