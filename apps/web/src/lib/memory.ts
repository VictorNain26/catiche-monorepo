/** What Tom keeps of the student (`/api/memory`), in the words the student reads. */

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from 'hono/client';
import { api, isProblem, parseResponse } from './api';
import { parentWords } from './student';
import { capitalised } from './words';

type Memory = InferResponseType<typeof api.memory.$get, 200>;
type Notion = Memory['notions'][number];
/** The student's yes or no to the memory. */
export type MemoryChoice = InferRequestType<typeof api.memory.answer.$post>['json']['answer'];

export const memoryQuery = queryOptions({
  queryKey: ['memory'],
  queryFn: () => parseResponse(api.memory.$get()),
});

/** A notion the student says they understood, which Tom no longer keeps; and all of them. */
export const forgetNotion = (notionId: string) => parseResponse(api.memory.notions[':notionId'].$delete({ param: { notionId } }));

export const eraseMemory = () => parseResponse(api.memory.$delete());

/** « La dernière fois : pas encore résolue, avec un indice. À surveiller : mal lire la consigne. », as the memory and the week say it. */
export function lastTime({ lastSolved, lastHelp, watch }: Pick<Notion, 'lastSolved' | 'lastHelp' | 'watch'>): string {
  return [
    `La dernière fois : ${lastSolved ? `résolue ${lastHelp}` : `pas encore résolue, ${lastHelp}`}.`,
    ...(watch ? [`À surveiller : ${watch}.`] : []),
  ].join(' ');
}

/** A lesson as the student reads it (E7): « Travaillée 3 fois. La dernière fois : pas encore réussie. » */
export const notionSummary = ({ worked, lastSolved }: Pick<Notion, 'worked' | 'lastSolved'>): string =>
  `Travaillée ${String(worked)} fois. La dernière fois : ${lastSolved ? 'réussie' : 'pas encore réussie'}.`;

/** Once active (E7): what Tom keeps, and that the parents see only that it is. */
export function memoryActive(parents: readonly string[]) {
  const { both, many } = parentWords(parents);
  return `Tom se souvient des leçons de tes exercices depuis la rentrée. ${capitalised(both)} ${many ? 'voient' : 'voit'} seulement que c’est activé.`;
}

/** Not active, the student unable to answer (E7): what Tom knows, and who may propose it. */
export function memoryOff(parents: readonly string[]) {
  const { either, many } = parentWords(parents);
  return `Tom ne se souvient de rien d’un soir à l’autre. Il connaît seulement ton prénom et ta classe. ${capitalised(either)} ${many ? 'peuvent' : 'peut'} te le proposer.`;
}

/** At the foot of E7, always: whom to ask for everything to go. */
export const accountDeletion = (parents: readonly string[]) =>
  `Pour que tout parte, tes devoirs compris, demande ${parentWords(parents).toEither} de supprimer ton compte.`;

/**
 * A failed memory request, in words a student reads. A proposal withdrawn meanwhile (FORBIDDEN) is
 * any failure: the screen reads the memory again, and says who may propose it.
 */
export function memoryMessage(error: unknown): string {
  if (isProblem(error, 'RATE_LIMITED')) return 'Trop d’essais. Attends une minute.';
  return 'Ça n’a pas marché. Réessaie dans un instant.';
}

/** The student's yes or no, which the server answers with the memory as it now stands. */
export function useMemoryAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answer: MemoryChoice) => parseResponse(api.memory.answer.$post({ json: { answer } })),
    onSuccess: (memory) => {
      queryClient.setQueryData(memoryQuery.queryKey, memory);
    },
    // Refused, the proposal may have been withdrawn meanwhile: the screen reads it again.
    onError: () => queryClient.invalidateQueries({ queryKey: memoryQuery.queryKey }),
  });
}
