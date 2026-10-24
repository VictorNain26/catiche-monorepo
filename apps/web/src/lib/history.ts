/** The history of a child (`/api/household/students/:id/history`), which a parent reads on « Gérer ». */

import { queryOptions } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { api, parseResponse } from './api';
import { browserName, deviceKind } from './device';
import { LEVEL_LABELS, ROLE_LABELS } from './household';

const history = api.household.students[':id'].history;

export type HistoryLine = Pick<InferResponseType<typeof history.$get, 200>[number], 'kind' | 'detail' | 'actor' | 'subject'>;

/** A first name the history reads: null once the adult left Catiche, empty until they give one. */
const named = (name: string | null) => (name === null || name === '' ? null : name);

export const historyQuery = (studentId: string) =>
  queryOptions({
    queryKey: ['students', studentId, 'history'],
    queryFn: () => parseResponse(history.$get({ param: { id: studentId } })),
  });

/** The device a line names: its kind, and its browser when it can be read. */
function deviceOf(userAgent: string | null | undefined): string {
  const name = browserName(userAgent);
  const { the } = deviceKind(userAgent);
  return name === null ? the : `${the} (${name})`;
}

/**
 * A gesture of an adult on the child, as a parent reads it: who, then what. No word supposes
 * anyone's gender (`docs/charte.md`, « Les mots »); an adult who left Catiche is « Un adulte », and
 * no line names an address.
 */
export function historyLine({ kind, detail, actor, subject }: HistoryLine, child: string): string {
  const who = named(actor) ?? 'Un adulte';
  const whom = named(subject);
  const role = detail.role === undefined ? '' : `, comme ${ROLE_LABELS[detail.role]}`;
  const what: Record<HistoryLine['kind'], () => string> = {
    name_changed: () => `a changé le prénom en ${detail.name ?? ''}`,
    level_changed: () => `a changé la classe : ${detail.level === undefined ? '' : LEVEL_LABELS[detail.level].toLowerCase()}`,
    memory_proposed: () => `a proposé la mémoire de Tom à ${child}`,
    memory_withdrawn: () => 'a retiré ce que Tom retient',
    device_code: () => 'a demandé un code de départ pour un appareil',
    forgotten_code: () => 'a demandé un code de départ pour un code oublié',
    device_unblocked: () => `a débloqué ${deviceOf(detail.device)}`,
    device_removed: () => `a retiré ${deviceOf(detail.device)}`,
    adult_invited: () => `a invité ${whom ?? 'un adulte'} pour ${child}${role}`,
    invitation_withdrawn: () => `a annulé l’invitation ${whom === null ? 'd’un adulte' : `de ${whom}`}`,
    adult_joined: () => `a rejoint les adultes de ${child}${role}`,
    adult_removed: () => `a retiré ${whom ?? 'un proche'} des adultes de ${child}`,
    adult_left: () => `a quitté les adultes de ${child}`,
    deletion_requested: () => `a demandé la suppression du compte de ${child}`,
    deletion_cancelled: () => `a annulé la suppression du compte de ${child}`,
  };
  return `${who} ${what[kind]()}`;
}
