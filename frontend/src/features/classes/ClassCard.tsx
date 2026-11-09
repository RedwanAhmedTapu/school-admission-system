import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Tooltip } from '../../components/ui/overlay';
import { availabilityLabel, SeatMeter } from '../../components/ui/status';
import { cn } from '../../utils/cn';
import type { ClassSeats, MyHold } from '../../types/api';

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'sage' }) {
  return (
    <div>
      <dt className="text-xs text-charcoal-60">{label}</dt>
      <dd className={cn('mt-0.5 text-lg font-semibold tabular-nums', tone === 'sage' ? 'text-sage' : 'text-midnight')}>
        {value}
      </dd>
    </div>
  );
}

/** One class + shift with live seat numbers and the Apply action. */
export function ClassCard({
  cls,
  hasStudent,
  liveHold,
  applying,
  onApply,
}: {
  cls: ClassSeats;
  hasStudent: boolean;
  /** The student's HELD/CONFIRMED application for this class, if any. */
  liveHold?: MyHold;
  applying?: boolean;
  onApply: (cls: ClassSeats) => void;
}) {
  const avail = availabilityLabel(cls.availableSeats, cls.totalSeats);
  const full = cls.availableSeats <= 0;

  let action: React.ReactNode;
  if (liveHold) {
    action = (
      <Button asChild variant="outline" className="w-full sm:w-auto">
        <Link to="/applications">
          {liveHold.status === 'CONFIRMED' ? 'Admission confirmed' : 'View your application'}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Button>
    );
  } else if (full) {
    action = (
      <Button disabled className="w-full sm:w-auto">
        No seats available
      </Button>
    );
  } else if (!hasStudent) {
    action = (
      <Tooltip content="Enter the student's 17-digit registration number first, then apply.">
        <span tabIndex={0} className="inline-flex w-full sm:w-auto" aria-label="Apply (enter a student ID first)">
          <Button disabled className="w-full sm:w-auto">
            Apply
          </Button>
        </span>
      </Tooltip>
    );
  } else {
    action = (
      <Button className="w-full sm:w-auto" loading={applying} onClick={() => onApply(cls)}>
        Apply for this class
      </Button>
    );
  }

  return (
    <article
      aria-label={cls.name}
      className="flex flex-col rounded-lg border border-line bg-white p-5 shadow-card transition-shadow duration-200 hover:shadow-pop sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-xl font-medium leading-snug text-midnight">{cls.name}</h3>
        <span
          className={cn(
            'mt-1 shrink-0 text-sm font-medium',
            avail.tone === 'ok' && 'text-sage',
            avail.tone === 'low' && 'text-amber',
            avail.tone === 'full' && 'text-terracotta',
          )}
        >
          {avail.text}
        </span>
      </div>

      <SeatMeter className="mt-4" total={cls.totalSeats} held={cls.heldSeats} confirmed={cls.confirmedSeats} />
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal-60">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-midnight" /> Confirmed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-champagne" /> Held
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-sage-100" /> Available
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-4 gap-3 border-t border-line pt-4">
        <Stat label="Total" value={cls.totalSeats} />
        <Stat label="Held" value={cls.heldSeats} />
        <Stat label="Confirmed" value={cls.confirmedSeats} />
        <Stat label="Available" value={cls.availableSeats} tone="sage" />
      </dl>

      <div className="mt-6 flex sm:justify-end">{action}</div>
    </article>
  );
}
