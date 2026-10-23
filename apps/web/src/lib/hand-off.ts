/**
 * What one screen leaves for the next, in this tab only and never in the address bar: the
 * adult's address, from a spent link to the sign-in form; that Catiche was just left, for the
 * sign-in to say so. A screen reads it as it opens, then clears it once shown. Without a storage
 * (a private window that refuses it), the screens work without it.
 */

type Key = 'email' | 'signedOut';
type TabStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const PREFIX = 'catiche:';

/** The tab's storage; `undefined` where the browser refuses it. */
const sessionTab = (): TabStorage | undefined => {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
};

export function handOff(storage: TabStorage | undefined = sessionTab()) {
  const attempt = <T>(action: (tab: TabStorage) => T, otherwise: T): T => {
    try {
      return storage ? action(storage) : otherwise;
    } catch {
      return otherwise;
    }
  };
  return {
    leave: (key: Key, value: string) => {
      attempt((tab) => {
        tab.setItem(`${PREFIX}${key}`, value);
      }, undefined);
    },
    read: (key: Key) => attempt((tab) => tab.getItem(`${PREFIX}${key}`), null),
    clear: (key: Key) => {
      attempt((tab) => {
        tab.removeItem(`${PREFIX}${key}`);
      }, undefined);
    },
  };
}
