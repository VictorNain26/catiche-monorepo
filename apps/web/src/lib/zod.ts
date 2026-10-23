/**
 * Zod probes `new Function` when an object schema is declared, which the server's CSP (no
 * 'unsafe-eval') reports as a violation. Every module takes `z` from here, so that the bundle
 * evaluates this configuration before any schema, whichever chunk holds it.
 */

import { z } from 'zod';

z.config({ jitless: true });

/** A box the adult ticks to declare; left unticked, it says what to do. */
export const ticked = z
  .boolean()
  .refine(Boolean, 'Cochez cette case pour continuer.')
  .transform(() => true as const);

export { z };
