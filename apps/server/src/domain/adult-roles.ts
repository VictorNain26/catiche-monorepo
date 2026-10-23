/**
 * What an adult is to a student (`docs/plans/app-cible.md` § 3): a parent or guardian, who
 * decides, or a relative (a step-parent, a grandparent, a foster carer…), who follows.
 */

export const ADULT_ROLES = ['guardian', 'relative'] as const;

export type AdultRole = (typeof ADULT_ROLES)[number];
