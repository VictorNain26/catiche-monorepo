/**
 * A first name, a child's or an adult's: one line of 50 characters at most. A child reads an
 * adult's, and an invitation's email carries both, where a line « label : https://… » becomes a
 * link (`platform/email/mailer.ts`): a name on several lines would forge one.
 */

import { z } from 'zod';

export const firstNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^\P{Cc}*$/u, 'sur une ligne');
