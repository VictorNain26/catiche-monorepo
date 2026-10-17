/** The signed-in guardian's passkeys, by better-auth's passkey plugin. */

import { queryOptions } from '@tanstack/react-query';
import { authClient, authData } from './auth';

export const passkeysQuery = queryOptions({
  queryKey: ['passkeys'],
  queryFn: () => authData(authClient.passkey.listUserPasskeys()),
});
