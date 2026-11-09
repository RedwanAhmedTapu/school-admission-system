import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ui/dialog';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/feedback';
import { ApplicationCard, type BusyAction } from '../features/student/ApplicationCard';
import { StudentIdForm } from '../features/student/StudentIdForm';
import { useCancel, useConfirm, useMyHolds, useRefreshSeatData } from '../hooks/queries';
import { useNow } from '../hooks/useNow';
import { toAppError } from '../services/api';
import { useStudentId } from '../services/studentStore';
import { formatStudentId, isValidStudentId } from '../utils/studentId';
import type { MyHold } from '../types/api';

export default function ApplicationsPage() {
  const studentId = useStudentId();
  const holds = useMyHolds();
  const confirm = useConfirm();
  const cancel = useCancel();
  const refresh = useRefreshSeatData();
  const now = useNow(1000);

  const [busy, setBusy] = useState<{ id: string; action: Exclude<BusyAction, null> } | null>(null);
  const [toCancel, setToCancel] = useState<MyHold | null>(null);

  function pay(h: MyHold) {
    setBusy({ id: h.holdId, action: 'confirm' });
    confirm.mutate(h.holdId, {
      onSuccess: () => toast.success('Admission confirmed', { description: `${h.className}: the seat is yours.` }),
      onError: (e) => toast.error(toAppError(e).message),
      onSettled: () => setBusy(null),
    });
  }

  function doCancel() {
    if (!toCancel) return;
    const h = toCancel;
    setBusy({ id: h.holdId, action: 'cancel' });
    cancel.mutate(h.holdId, {
      onSuccess: () => toast.success('Application cancelled', { description: 'The seat has been released.' }),
      onError: (e) => toast.error(toAppError(e).message),
      onSettled: () => {
        setBusy(null);
        setToCancel(null);
      },
    });
  }

  return (
    <div className="page-container py-12 sm:py-16">
      <p className="eyebrow">My applications</p>
      <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">Your applications</h1>
      {isValidStudentId(studentId) && (
        <p className="mt-3 text-charcoal-60">
          Student <span className="font-mono text-midnight">{formatStudentId(studentId)}</span>
        </p>
      )}

      <div className="mt-10 max-w-3xl">
        {!isValidStudentId(studentId) ? (
          <div className="rounded-lg border border-line bg-white p-6 shadow-card sm:p-8">
            <h2 className="font-serif text-xl font-medium">Enter the student registration number</h2>
            <p className="mb-5 mt-1.5 text-sm text-charcoal-60">We will load every application for this student.</p>
            <StudentIdForm submitLabel="Show applications" />
          </div>
        ) : holds.isLoading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading applications">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-lg border border-line bg-white p-6">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="mt-4 h-4 w-1/3" />
                <Skeleton className="mt-6 h-10 w-48" />
              </div>
            ))}
          </div>
        ) : holds.isError ? (
          <ErrorState message={toAppError(holds.error).message} onRetry={() => holds.refetch()} />
        ) : holds.data && holds.data.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-5 w-5" aria-hidden />}
            title="No applications yet"
            description="When you reserve a seat in a class, it will appear here with a live countdown."
            action={
              <Button asChild>
                <Link to="/#classes">Browse classes</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-4">
            {holds.data!.map((h) => (
              <li key={h.holdId}>
                <ApplicationCard
                  hold={h}
                  now={now}
                  busy={busy?.id === h.holdId ? busy.action : null}
                  onConfirm={pay}
                  onCancel={setToCancel}
                  onExpire={() => void refresh()} // deadline hit: re-read the authoritative state now
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={toCancel !== null}
        onOpenChange={(open) => !open && !cancel.isPending && setToCancel(null)}
        title="Cancel this application?"
        description={
          <>
            Your hold on <strong className="text-midnight">{toCancel?.className}</strong> will be released immediately and
            offered to other families.
          </>
        }
        confirmLabel="Yes, cancel application"
        destructive
        loading={cancel.isPending}
        onConfirm={doCancel}
      />
    </div>
  );
}
