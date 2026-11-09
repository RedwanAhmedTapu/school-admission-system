import { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/feedback';
import { Field, Input } from '../../components/ui/field';
import { SeatMeter } from '../../components/ui/status';
import { Table, TableWrap, Td, Th, Tr } from '../../components/ui/table';
import { useClasses, useCreateClass } from '../../hooks/queries';
import { toAppError } from '../../services/api';

function CreateClassForm({ onDone }: { onDone: () => void }) {
  const create = useCreateClass();
  const [name, setName] = useState('');
  const [seats, setSeats] = useState('');
  const [touched, setTouched] = useState(false);

  const seatsNum = Number(seats);
  const nameError = name.trim().length === 0 ? 'Enter a class name, e.g. "Class 6 - Morning Shift".' : null;
  const seatsError =
    seats.trim() === '' || !Number.isInteger(seatsNum) || seatsNum < 1
      ? 'Enter a whole number of seats, 1 or more.'
      : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (nameError || seatsError) return;
    create.mutate(
      { name: name.trim(), totalSeats: seatsNum },
      {
        onSuccess: (c) => {
          toast.success('Class created', { description: `${c.name} · ${c.totalSeats} seats` });
          onDone();
        },
        onError: (err) => toast.error(toAppError(err).message),
      },
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-5 space-y-4">
      <Field
        label="Class name (include the shift)"
        htmlFor="class-name"
        hint='The shift is part of the name, e.g. "Class 6 - Morning Shift".'
        error={touched ? nameError : null}
      >
        <Input id="class-name" value={name} maxLength={120} invalid={touched && !!nameError} onChange={(e) => setName(e.target.value)} placeholder="Class 6 - Morning Shift" autoFocus />
      </Field>
      <Field label="Total seats" htmlFor="class-seats" error={touched ? seatsError : null}>
        <Input id="class-seats" inputMode="numeric" value={seats} invalid={touched && !!seatsError} onChange={(e) => setSeats(e.target.value.replace(/\D/g, ''))} placeholder="120" />
      </Field>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onDone} disabled={create.isPending}>Cancel</Button>
        <Button type="submit" loading={create.isPending}>Create class</Button>
      </div>
    </form>
  );
}

export default function AdminClasses() {
  const classes = useClasses();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Classes</p>
          <h1 className="mt-2 font-serif text-3xl font-medium">Class management</h1>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden /> New class
        </Button>
      </div>

      <div className="mt-8">
        {classes.isLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : classes.isError ? (
          <ErrorState message={toAppError(classes.error).message} onRetry={() => classes.refetch()} />
        ) : (classes.data ?? []).length === 0 ? (
          <EmptyState title="No classes yet" description="Create the first class and shift to open admissions." action={<Button onClick={() => setOpen(true)}>New class</Button>} />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Class and shift</Th>
                  <Th className="text-right">Total</Th>
                  <Th className="text-right">Held</Th>
                  <Th className="text-right">Confirmed</Th>
                  <Th className="text-right">Available</Th>
                  <Th className="w-40">Occupancy</Th>
                </tr>
              </thead>
              <tbody>
                {classes.data!.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <div className="font-medium text-midnight">{c.name}</div>
                      <div className="font-mono text-xs text-charcoal-60">{c.id}</div>
                    </Td>
                    <Td className="text-right tabular-nums">{c.totalSeats}</Td>
                    <Td className="text-right tabular-nums">{c.heldSeats}</Td>
                    <Td className="text-right tabular-nums">{c.confirmedSeats}</Td>
                    <Td className="text-right font-medium tabular-nums text-sage">{c.availableSeats}</Td>
                    <Td><SeatMeter total={c.totalSeats} held={c.heldSeats} confirmed={c.confirmedSeats} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>New class</DialogTitle>
          <DialogDescription>Each class and shift combination is its own record with its own seats.</DialogDescription>
          <CreateClassForm onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
