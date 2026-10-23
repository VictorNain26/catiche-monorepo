/**
 * Who is signed in, as `/api/me` tells it; null for a visitor without a session. Their devices, and
 * an adult's declarations: being 18 or over, and holding parental authority over each child.
 */

import { queryOptions } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { api, isProblem, parseResponse } from './api';
import { ROLE_LABELS, firstName, householdMessage, newChildSchema, type AdultRole } from './household';
import { ticked, z } from './zod';

/** The adult's declaration of their age, the box's own words. */
export const ADULT_LABEL = 'J’ai 18 ans ou plus.';

/** The first name the adult's children see. */
const adultName = firstName('Écrivez votre prénom.');

/** A new adult's first screen: their first name and their age declared, then their child, as the adding asks it. */
export const welcomeSchema = (now = new Date()) => z.object({ you: z.object({ name: adultName, adult: ticked }), child: newChildSchema(now) });

/**
 * An invited adult's first screen: their first name and their age declared, and, for a parent,
 * the declaration of parental authority. The child is the one they are invited for.
 */
export const invitedWelcomeSchema = (role: AdultRole) =>
  z.object({ name: adultName, adult: ticked, declaredGuardian: role === 'guardian' ? ticked : z.boolean() });

type Me = InferResponseType<typeof api.me.$get, 200>;
type AdultMe = Extract<Me, { role: 'adult' }>;

/** An invitation waiting for the adult's address, as `/api/me` tells it. */
export type Invitation = AdultMe['invitations'][number];

/** The invitations waiting for whoever is signed in: none for a student or a visitor. */
export const pendingInvitations = (me: Me | null | undefined): Invitation[] => (me?.role === 'adult' ? me.invitations : []);

type InvitationWords = Pick<Invitation, 'invitedBy' | 'studentName' | 'role'>;

/** Who invites the adult, for which child, as what: the home's card. */
export const invitationLine = ({ invitedBy, studentName, role }: InvitationWords) =>
  `${invitedBy} vous invite pour ${studentName}, comme ${ROLE_LABELS[role]}.`;

/** What the role brings, on the invited adult's first screen (`app-cible.md`, A3). */
export const invitationPromise = ({ invitedBy, studentName, role }: InvitationWords) =>
  role === 'guardian'
    ? `Vous déciderez avec ${invitedBy} pour ${studentName}.`
    : `${studentName} pourra vous dire où en sont ses devoirs, et vous pourrez lui répondre.`;

/** The adult accepts an invitation, a parent with the declaration ticked: the child's id. */
export const acceptInvitation = (id: string, declaredGuardian: boolean) =>
  parseResponse(api.me.invitations[':id'].accept.$post({ param: { id }, json: declaredGuardian ? { declaredGuardian: true } : {} }));

/** A failed answer to an invitation, in words the adult reads: one gone, or expired, says whom to ask. */
export const invitationFailure = (error: unknown, { invitedBy }: Pick<Invitation, 'invitedBy'>) =>
  isProblem(error, 'NOT_FOUND') ? `Cette invitation n’est plus valable. Demandez-en une nouvelle à ${invitedBy}.` : householdMessage(error);

export const declineInvitation = (id: string) => parseResponse(api.me.invitations[':id'].decline.$post({ param: { id } }));

/** The adult's first name, changed in their account. */
export const nameSchema = z.object({ name: adultName });

/** « Plus tard » on the passkey's offer: the home shows it no more, « Votre compte » keeps the making of one. */
export const closePasskeyOffer = () => parseResponse(api.me['passkey-offer'].$post());

/** What an adult has yet to declare, every box ticked: their age, and each child's link by the child's id. */
export const declarationsSchema = z.object({ adult: ticked, guardianOf: z.record(z.string(), ticked) });

/** The adult declares being 18 or over. */
export const declareAdult = () => parseResponse(api.me.declarations.$post({ json: { adult: true } }));

/** What an adult has yet to declare, as `/api/me` tells it. */
type MissingDeclarations = AdultMe['missing'];

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
