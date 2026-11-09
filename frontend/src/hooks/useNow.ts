import { useEffect, useState } from 'react';
import { getServerNow } from '../services/api';

/**
 * Server-corrected "now" in ms. Always recomputed from the clock (never incremented), so it
 * cannot drift, and it re-syncs the moment a hidden tab becomes visible again.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => getServerNow());

  useEffect(() => {
    const tick = () => setNow(getServerNow());
    tick();
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [intervalMs]);

  return now;
}
