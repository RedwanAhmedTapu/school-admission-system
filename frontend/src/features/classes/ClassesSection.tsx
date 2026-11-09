import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { School } from 'lucide-react';
import { ClassCard } from './ClassCard';
import { ConfirmDialog } from '../../components/ui/dialog';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/feedback';
import { useApply, useClasses, useMyHolds } from '../../hooks/queries';
import { useStudentId } from '../../services/studentStore';
import { toAppError } from '../../services/api';
import { formatStudentId, isValidStudentId } from '../../utils/studentId';
import type { ClassSeats } from '../../types/api';

/** Class list with live seat counts (polled) and the apply-with-confirmation flow. */
export function ClassesSection() {
  const navigate = useNavigate();
  const studentId = useStudentId();
  const hasStudent = isValidStudentId(studentId);

  const classes = useClasses();
  const myHolds = useMyHolds();
  const apply = useApply();
  const [target, setTarget] = useState<ClassSeats | null>(null);

  // classId -> the student's live (HELD / CONFIRMED) application, from the backend.
  const liveByClass = useMemo(() => {
    const map = new Map<string, NonNullable<typeof myHolds.data>[number]>();
    for (const h of myHolds.data ?? []) {
      const live = h.status === 'CONFIRMED' || (h.status === 'HELD' && Date.parse(h.expiresAt) > Date.now());
      if (live) map.set(h.classId, h);
    }
    return map;
  }, [myHolds.data]);

  function submit() {
    if (!target) return;
    apply.mutate(target.id, {
      onSuccess: () => {
        toast.success('Seat reserved', { description: `${target.name}: complete the admission fee before time runs out.` });
        setTarget(null);
        navigate('/applications');
      },
      onError: (e) => {
        toast.error(toAppError(e).message);
        setTarget(null);
      },
    });
  }

  if (classes.isLoading) {
    return (
      <div className="grid gap-5 md:grid-cols-2" aria-busy="true" aria-label="Loading classes">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-line bg-white p-6">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="mt-5 h-2 w-full" />
            <Skeleton className="mt-6 h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (classes.isError) {
    return <ErrorState message={toAppError(classes.error).message} onRetry={() => classes.refetch()} />;
  }

  if (!classes.data || classes.data.length === 0) {
    return (
      <EmptyState
        icon={<School className="h-5 w-5" aria-hidden />}
        title="Admissions have not opened yet"
        description="No classes are open for applications at the moment. Please check back soon."
      />
    );
  }

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        {classes.data.map((cls) => (
          <ClassCard
            key={cls.id}
            cls={cls}
            hasStudent={hasStudent}
            liveHold={liveByClass.get(cls.id)}
            applying={apply.isPending && target?.id === cls.id}
            onApply={setTarget}
          />
        ))}
      </div>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => !open && !apply.isPending && setTarget(null)}
        title="Reserve a seat?"
        description={
          <>
            <p>
              You are applying for <strong className="text-midnight">{target?.name}</strong> for student{' '}
              <span className="font-mono">{studentId ? formatStudentId(studentId) : ''}</span>.
            </p>
            <p className="mt-2 text-charcoal-60">
              The seat is held for a limited time. If the admission fee is not paid before the countdown ends, the seat is
              released to other applicants.
            </p>
          </>
        }
        confirmLabel="Reserve seat"
        cancelLabel="Not now"
        loading={apply.isPending}
        onConfirm={submit}
      />
    </>
  );
}
