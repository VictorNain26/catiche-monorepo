/** Who is signed in, as `/api/me` tells it; null for a visitor without a session. And their devices. */

import { queryOptions } from '@tanstack/react-query';
import { api, isProblem, parseResponse } from './api';

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
