import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/feedback';
import { Input, Select } from '../../components/ui/field';
import { StatusIndicator } from '../../components/ui/status';
import { Table, TableWrap, Td, Th, Tr } from '../../components/ui/table';
import { useAdminHolds, useClasses } from '../../hooks/queries';
import { toAppError } from '../../services/api';
import { formatDateTime } from '../../utils/time';

const STATUSES = ['HELD', 'CONFIRMED', 'EXPIRED', 'CANCELLED'] as const;

export default function AdminApplications() {
  const classes = useClasses();
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');

  // Debounce the search box so we do not query on every keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => setQ(text.trim()), 300);
    return () => window.clearTimeout(t);
  }, [text]);

  const holds = useAdminHolds({
    classId: classId || undefined,
    status: status || undefined,
    q: q || undefined,
  });

  return (
    <div>
      <p className="eyebrow">Applications</p>
      <h1 className="mt-2 font-serif text-3xl font-medium">Application monitoring</h1>

      <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_200px_200px]">
        <div className="relative">
          <label htmlFor="adm-search" className="sr-only">Search by student ID, application ID or class</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-60" aria-hidden />
          <Input id="adm-search" className="pl-10" placeholder="Search student ID, application ID or class" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div>
          <label htmlFor="adm-class" className="sr-only">Filter by class</label>
          <Select id="adm-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">All classes</option>
            {(classes.data ?? []).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </Select>
        </div>
        <div>
          <label htmlFor="adm-status" className="sr-only">Filter by status</label>
          <Select id="adm-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (<option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>))}
          </Select>
        </div>
      </div>

      <div className="mt-6">
        {holds.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : holds.isError ? (
          <ErrorState message={toAppError(holds.error).message} onRetry={() => holds.refetch()} />
        ) : (holds.data ?? []).length === 0 ? (
          <EmptyState title="No matching applications" description="Try clearing a filter or searching for something else." />
        ) : (
          <>
            <p className="mb-2 text-sm text-charcoal-60" aria-live="polite">{holds.data!.length} {holds.data!.length === 1 ? 'application' : 'applications'}</p>
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Application</Th>
                    <Th>Class</Th>
                    <Th>Student</Th>
                    <Th>Status</Th>
                    <Th>Applied</Th>
                    <Th>Hold expires</Th>
                  </tr>
                </thead>
                <tbody>
                  {holds.data!.map((h) => (
                    <Tr key={h.holdId}>
                      <Td className="font-mono text-[13px]">{h.holdId}</Td>
                      <Td className="font-medium text-midnight">{h.className}</Td>
                      <Td className="font-mono text-[13px]">{h.studentId}</Td>
                      <Td><StatusIndicator status={h.status} /></Td>
                      <Td className="whitespace-nowrap text-charcoal-60">{formatDateTime(h.createdAt)}</Td>
                      <Td className="whitespace-nowrap text-charcoal-60">{formatDateTime(h.expiresAt)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          </>
        )}
      </div>
    </div>
  );
}
