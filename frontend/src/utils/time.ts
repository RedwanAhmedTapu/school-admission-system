import type { HoldStatus } from '../types/api';

/** Milliseconds left until `expiresAt`, measured against `nowMs` (server-corrected). Never negative. */
export function msRemaining(expiresAt: string, nowMs: number): number {
  const target = Date.parse(expiresAt);
  if (Number.isNaN(target)) return 0;
  return Math.max(0, target - nowMs);
}

/** 605000 -> "10:05". Rounds UP so the display never reaches 00:00 before the deadline. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * The status the UI should show right now. The backend is the authority, but a HELD hold whose
 * deadline has passed is shown as EXPIRED immediately instead of waiting for the next poll.
 */
export function effectiveStatus(status: HoldStatus, expiresAt: string, nowMs: number): HoldStatus {
  return status === 'HELD' && msRemaining(expiresAt, nowMs) <= 0 ? 'EXPIRED' : status;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
