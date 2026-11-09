import { CheckCircle2, CreditCard, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Progress, StatusIndicator } from '../../components/ui/status';
import { InlineNotice } from '../../components/ui/feedback';
import { Countdown } from './Countdown';
import type { MyHold } from '../../types/api';
import { effectiveStatus, formatDateTime, msRemaining } from '../../utils/time';

export type BusyAction = 'confirm' | 'cancel' | null;

/** One application (hold) of the current student. Presentational: all data comes in as props. */
export function ApplicationCard({
  hold,
  now,
  busy,
  onConfirm,
  onCancel,
  onExpire,
}: {
  hold: MyHold;
  now: number;
  busy: BusyAction;
  onConfirm: (hold: MyHold) => void;
  onCancel: (hold: MyHold) => void;
  onExpire?: () => void;
}) {
  const status = effectiveStatus(hold.status, hold.expiresAt, now);
  const held = status === 'HELD';

  const total = hold.createdAt ? Date.parse(hold.expiresAt) - Date.parse(hold.createdAt) : 0;
  const left = msRemaining(hold.expiresAt, now);
  const progress = total > 0 ? (left / total) * 100 : 0;

  return (
    <article
      aria-label={`Application for ${hold.className}`}
      className="animate-fade-up rounded-lg border border-line bg-white p-5 shadow-card sm:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-xl font-medium text-midnight">{hold.className}</h3>
          <p className="mt-1 text-sm text-charcoal-60">
            Application ID <span className="font-mono text-[13px] text-charcoal">{hold.holdId}</span>
          </p>
        </div>
        <StatusIndicator status={status} />
      </header>

      {held && (
        <div className="mt-5 rounded border border-champagne/50 bg-champagne-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-charcoal">Complete the admission fee before the seat is released</span>
            <Countdown expiresAt={hold.expiresAt} now={now} onExpire={onExpire} className="text-base" />
          </div>
          {total > 0 && <Progress value={progress} tone="amber" className="mt-3" />}
        </div>
      )}

      <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-4 sm:block">
          <dt className="text-charcoal-60">{status === 'EXPIRED' ? 'Expired at' : 'Reservation expires'}</dt>
          <dd className="font-medium text-charcoal">{formatDateTime(hold.expiresAt)}</dd>
        </div>
        {hold.confirmedAt && (
          <div className="flex justify-between gap-4 sm:block">
            <dt className="text-charcoal-60">Confirmed on</dt>
            <dd className="font-medium text-charcoal">{formatDateTime(hold.confirmedAt)}</dd>
          </div>
        )}
        {hold.cancelledAt && (
          <div className="flex justify-between gap-4 sm:block">
            <dt className="text-charcoal-60">Cancelled on</dt>
            <dd className="font-medium text-charcoal">{formatDateTime(hold.cancelledAt)}</dd>
          </div>
        )}
      </dl>

      {status === 'CONFIRMED' && (
        <InlineNotice className="mt-5 flex items-start gap-2.5 border-sage/30 bg-sage-50">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage" aria-hidden />
          Admission confirmed. The seat is reserved for this student.
        </InlineNotice>
      )}
      {status === 'EXPIRED' && (
        <InlineNotice tone="warning" className="mt-5 flex items-start gap-2.5">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" aria-hidden />
          The reservation time ran out and the seat was released. You can apply again from the class list if seats remain.
        </InlineNotice>
      )}

      {held && (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button loading={busy === 'confirm'} disabled={busy !== null} onClick={() => onConfirm(hold)}>
            {busy !== 'confirm' && <CreditCard className="h-4 w-4" aria-hidden />}
            Pay admission fee
          </Button>
          <Button variant="outline" loading={busy === 'cancel'} disabled={busy !== null} onClick={() => onCancel(hold)}>
            Cancel application
          </Button>
        </div>
      )}
      {status === 'EXPIRED' && (
        <div className="mt-5">
          <Button disabled>Pay admission fee</Button>
        </div>
      )}
    </article>
  );
}
