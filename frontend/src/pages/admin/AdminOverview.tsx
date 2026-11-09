import { Link } from 'react-router-dom';
import { ErrorState, Skeleton } from '../../components/ui/feedback';
import { StatusIndicator } from '../../components/ui/status';
import { Table, TableWrap, Td, Th, Tr } from '../../components/ui/table';
import { useAdminHolds, useClasses } from '../../hooks/queries';
import { toAppError } from '../../services/api';
import { formatDateTime } from '../../utils/time';
import { maskStudentId } from '../../utils/studentId';

function Metric({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <div className="px-5 py-4 first:pl-0 sm:py-5">
      <dt className="text-xs font-medium uppercase tracking-wide text-charcoal-60">{label}</dt>
      <dd className="mt-1.5 font-serif text-3xl font-medium tabular-nums text-midnight">{value}</dd>
      {note && <p className="mt-0.5 text-xs text-charcoal-60">{note}</p>}
    </div>
  );
}

export default function AdminOverview() {
  const classes = useClasses();
  const holds = useAdminHolds({});

  if (classes.isError) return <ErrorState message={toAppError(classes.error).message} onRetry={() => classes.refetch()} />;

  const data = classes.data ?? [];
  const totalSeats = data.reduce((s, c) => s + c.totalSeats, 0);
  const available = data.reduce((s, c) => s + c.availableSeats, 0);
  const held = data.reduce((s, c) => s + c.heldSeats, 0);
  const confirmed = data.reduce((s, c) => s + c.confirmedSeats, 0);

  return (
    <div>
      <p className="eyebrow">Overview</p>
      <h1 className="mt-2 font-serif text-3xl font-medium">Admissions at a glance</h1>

      {classes.isLoading ? (
        <Skeleton className="mt-8 h-24 w-full" />
      ) : (
        <dl className="mt-8 grid grid-cols-2 divide-x divide-y divide-line border-y border-line sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-5">
          <Metric label="Classes" value={data.length} />
          <Metric label="Seats available" value={available} note={`of ${totalSeats} total`} />
          <Metric label="Held seats" value={held} note="awaiting payment" />
          <Metric label="Confirmed" value={confirmed} note="admissions" />
          <Metric label="Active applications" value={held + confirmed} note="held + confirmed" />
        </dl>
      )}

      <div className="mt-12 flex items-end justify-between">
        <h2 className="font-serif text-xl font-medium">Recent activity</h2>
        <Link to="/admin/applications" className="text-sm text-midnight underline decoration-champagne decoration-2 underline-offset-4">
          All applications
        </Link>
      </div>

      <div className="mt-4">
        {holds.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : holds.isError ? (
          <ErrorState message={toAppError(holds.error).message} onRetry={() => holds.refetch()} />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Class</Th>
                  <Th>Student</Th>
                  <Th>Status</Th>
                  <Th>Applied</Th>
                </tr>
              </thead>
              <tbody>
                {(holds.data ?? []).slice(0, 8).map((h) => (
                  <Tr key={h.holdId}>
                    <Td className="font-medium text-midnight">{h.className}</Td>
                    <Td className="font-mono text-[13px]">{maskStudentId(h.studentId)}</Td>
                    <Td><StatusIndicator status={h.status} /></Td>
                    <Td className="text-charcoal-60">{formatDateTime(h.createdAt)}</Td>
                  </Tr>
                ))}
                {(holds.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-charcoal-60">No applications have been made yet.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </div>
    </div>
  );
}
