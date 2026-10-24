/**
 * The deletion of a child's account a parent asks while another parent follows them
 * (`docs/plans/app-cible.md`, question tranchée 1): the other parents may cancel it for 7 days,
 * then it is done. Past the day it is due, the child is treated as deleted, whether or not the
 * background sweep has passed yet.
 */

/** How long the other parents may cancel a deletion asked. */
const DELETION_DAYS = 7;

const DAY_MS = 24 * 60 * 60_000;

/** When a deletion asked at `requestedAt` is done. */
export const deletionDue = (requestedAt: Date) => new Date(requestedAt.getTime() + DELETION_DAYS * DAY_MS);

/** The latest request a deletion due at `now` was made at: one made at it or before is due. */
export const deletionCutoff = (now: Date) => new Date(now.getTime() - DELETION_DAYS * DAY_MS);

const PARIS_DAY = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });

/** « 31 octobre », the day in France, as an email says it. */
export const frenchDay = (date: Date) => PARIS_DAY.format(date);
