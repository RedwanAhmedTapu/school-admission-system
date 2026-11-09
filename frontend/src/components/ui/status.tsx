import * as ProgressPrimitive from '@radix-ui/react-progress';
import type { HoldStatus } from '../../types/api';
import { cn } from '../../utils/cn';

const STATUS: Record<HoldStatus, { label: string; dot: string }> = {
  HELD: { label: 'Seat held', dot: 'bg-amber' },
  CONFIRMED: { label: 'Confirmed', dot: 'bg-sage' },
  EXPIRED: { label: 'Expired', dot: 'bg-terracotta' },
  CANCELLED: { label: 'Cancelled', dot: 'bg-charcoal-60/60' },
};

/** A restrained status marker: a small dot and a label, rather than a loud coloured pill. */
export function StatusIndicator({ status, className }: { status: HoldStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm font-medium text-charcoal', className)}>
      <span aria-hidden className={cn('h-2 w-2 rounded-full', s.dot)} />
      <span data-testid="status-label">{s.label}</span>
      <span className="sr-only">({status})</span>
    </span>
  );
}

export function Progress({ value, className, tone = 'midnight' }: { value: number; className?: string; tone?: 'midnight' | 'amber' }) {
  return (
    <ProgressPrimitive.Root
      value={value}
      className={cn('relative h-1 w-full overflow-hidden rounded-full bg-midnight/10', className)}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full transition-[width] duration-700 ease-linear', tone === 'amber' ? 'bg-amber' : 'bg-midnight')}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

/** Segmented seat bar: confirmed (midnight) | held (champagne) | available (sage tint). */
export function SeatMeter({
  total,
  held,
  confirmed,
  className,
}: {
  total: number;
  held: number;
  confirmed: number;
  className?: string;
}) {
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const available = Math.max(0, total - held - confirmed);
  return (
    <div
      role="img"
      aria-label={`${confirmed} confirmed, ${held} held, ${available} available out of ${total} seats`}
      className={cn('flex h-2 w-full overflow-hidden rounded-full bg-sage-100', className)}
    >
      <div className="bg-midnight transition-[width] duration-500" style={{ width: `${pct(confirmed)}%` }} />
      <div className="bg-champagne transition-[width] duration-500" style={{ width: `${pct(held)}%` }} />
    </div>
  );
}

export function availabilityLabel(available: number, total: number): { text: string; tone: 'ok' | 'low' | 'full' } {
  if (available <= 0) return { text: 'Fully booked', tone: 'full' };
  if (available / Math.max(total, 1) <= 0.1) return { text: `Only ${available} left`, tone: 'low' };
  return { text: `${available} seats available`, tone: 'ok' };
}
