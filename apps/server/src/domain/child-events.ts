/**
 * What the history of a student keeps (`docs/plans/app-cible.md` § 3, « L'historique »): each
 * gesture of an adult on the student, kept 90 days, which a parent reads on « Gérer ».
 */

import type { AdultRole } from './adult-roles';
import type { SchoolLevel } from './levels';

export const CHILD_EVENT_KINDS = [
  'name_changed',
  'level_changed',
  'memory_proposed',
  'memory_withdrawn',
  // A starting code for a new device, or for the code the student forgot.
  'device_code',
  'forgotten_code',
  'device_unblocked',
  'device_removed',
  'adult_invited',
  'invitation_withdrawn',
  'adult_joined',
  // A parent removes a relative; a relative leaves.
  'adult_removed',
  'adult_left',
] as const;

export type ChildEventKind = (typeof CHILD_EVENT_KINDS)[number];

/** What a line needs beyond its kind, a few words at most: never what the student wrote. */
export interface ChildEventDetail {
  /** The new first name; the adult removed. */
  name?: string;
  level?: SchoolLevel;
  /** The device's browser, as it named itself. */
  device?: string | null;
  /** The address invited, or whose invitation was withdrawn. */
  email?: string;
  role?: AdultRole;
}

/** How long the history keeps a gesture. */
export const HISTORY_DAYS = 90;
