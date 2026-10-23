import { createFileRoute, redirect } from '@tanstack/react-router';
import { hasMissingDeclarations, meQuery } from '../lib/me';

/**
 * The adult's screens: anyone else goes home, an adult not named yet gives their first name, and
 * one with a declaration still to make confirms it before anything else; their account stays open
 * to them, to leave rather than declare.
 */
const BEFORE_DECLARATIONS = new Set(['/foyer/declarations', '/foyer/compte']);

export const Route = createFileRoute('/foyer')({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.query(meQuery);
    if (me?.role !== 'adult') throw redirect({ to: '/' });
    if (me.name === '') throw redirect({ to: '/bienvenue' });
    if (hasMissingDeclarations(me.missing) && !BEFORE_DECLARATIONS.has(location.pathname)) throw redirect({ to: '/foyer/declarations' });
  },
});
