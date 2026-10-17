import { useEffect, useRef, useState } from 'react';

/**
 * A confirmation drawn in place of the button that opened it: its warning takes the focus
 * (`Banner`'s `focusOnMount`), and `cancel` gives it back to that button once it is drawn again.
 * `K` names what is confirmed when one screen opens several.
 */
export function useConfirmation<K extends string = 'confirm'>() {
  const [confirming, setConfirming] = useState<K | null>(null);
  const openersRef = useRef(new Map<K, HTMLElement>());
  const restoringRef = useRef<K | null>(null);

  useEffect(() => {
    if (confirming !== null || restoringRef.current === null) return;
    openersRef.current.get(restoringRef.current)?.focus();
    restoringRef.current = null;
  }, [confirming]);

  return {
    confirming,
    /** The ref of the button that opens `key`, for the focus to come back to it. */
    opener: (key: K) => (element: HTMLElement | null) => {
      if (element) openersRef.current.set(key, element);
      else openersRef.current.delete(key);
    },
    open: (key: K) => {
      setConfirming(key);
    },
    /** Closed by what it confirmed: the focus stays where that left it. */
    close: () => {
      setConfirming(null);
    },
    cancel: () => {
      restoringRef.current = confirming;
      setConfirming(null);
    },
  };
}
