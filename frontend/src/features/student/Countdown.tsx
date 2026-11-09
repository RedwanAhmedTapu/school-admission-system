import { useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { formatCountdown, msRemaining } from '../../utils/time';
import { cn } from '../../utils/cn';

/**
 * Shows the time left, computed from the server-provided `expiresAt` and a server-corrected
 * `now` - so it cannot drift, survives refreshes, and is correct after a background tab wakes up.
 * Calls `onExpire` exactly once when the deadline passes.
 */
export function Countdown({
  expiresAt,
  now,
  onExpire,
  className,
}: {
  expiresAt: string;
  now: number;
  onExpire?: () => void;
  className?: string;
}) {
  const ms = msRemaining(expiresAt, now);
  const expired = ms <= 0;
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
  }, [expiresAt]);

  useEffect(() => {
    if (expired && !fired.current) {
      fired.current = true;
      onExpire?.();
    }
  }, [expired, onExpire]);

  const urgent = !expired && ms <= 60_000;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium tabular-nums',
        expired ? 'text-terracotta' : urgent ? 'text-amber' : 'text-midnight',
        className,
      )}
    >
      <Clock className="h-4 w-4" aria-hidden />
      <span data-testid="countdown">{expired ? 'Time is up' : formatCountdown(ms)}</span>
      {!expired && <span className="sr-only"> remaining</span>}
    </span>
  );
}
