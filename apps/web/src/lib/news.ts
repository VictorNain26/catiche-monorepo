/** « Depuis ta dernière visite » (E4): what changed for the student, as `/api/me/news` tells it, and its « Vu ». */

import { queryOptions } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { api, parseResponse } from './api';
import { deviceKind, formatDate } from './device';
import { parentWords } from './words';

type News = InferResponseType<typeof api.me.news.$get, 200>;

export const newsQuery = queryOptions({
  // Outside `['me']`: a change of the student's own data does not read the news again.
  queryKey: ['news'],
  queryFn: () => parseResponse(api.me.news.$get()),
});

/** « Vu »: what was read at `readAt` is said no more; what came after stays. */
export const markNewsSeen = (readAt: string) => parseResponse(api.me.news.seen.$post({ json: { readAt } }));

/** The card's lines, the code first, then each device as the server orders them; none, and the card does not show. */
export function newsLines(
  { codeChangedAt, devices }: Pick<News, 'codeChangedAt'> & { devices: readonly Pick<News['devices'][number], 'userAgent' | 'createdAt'>[] },
  parents: readonly string[],
): string[] {
  const tell = parentWords(parents).toEither;
  return [
    ...(codeChangedAt === null ? [] : [`Ton code a été changé le ${formatDate(codeChangedAt)}.`]),
    ...devices.map(
      ({ userAgent, createdAt }) =>
        `Ton espace s’ouvre aussi sur ${deviceKind(userAgent).a} depuis le ${formatDate(createdAt)}. Si ce n’est pas toi, dis-le ${tell}.`,
    ),
  ];
}
