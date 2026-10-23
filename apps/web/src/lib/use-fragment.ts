import { useEffect, useState } from 'react';

/**
 * The address bar's fragment (`#…`), read once as the page opens, then wiped from the bar and the
 * history: what it carries (a code, an invitation's token) stays with the page only. The router's
 * own history entry is kept, its state with it.
 */
export function useFragment() {
  const [hash] = useState(() => window.location.hash);
  useEffect(() => {
    if (window.location.hash === '') return;
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
  }, []);
  return hash;
}
