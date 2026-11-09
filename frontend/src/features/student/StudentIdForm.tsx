import { useId, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Field, Input } from '../../components/ui/field';
import { setStudentId } from '../../services/studentStore';
import { sanitizeStudentId, studentIdError, STUDENT_ID_LENGTH } from '../../utils/studentId';

/** The identity step: a 17-digit student registration number. No password, no login. */
export function StudentIdForm({
  initialValue = '',
  submitLabel = 'Continue',
  onSaved,
  autoFocus,
}: {
  initialValue?: string;
  submitLabel?: string;
  onSaved?: (id: string) => void;
  autoFocus?: boolean;
}) {
  const inputId = useId();
  const [value, setValue] = useState(initialValue);
  const [touched, setTouched] = useState(false);

  const error = studentIdError(value);
  const visibleError = touched ? error : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (error) return;
    setStudentId(value);
    onSaved?.(value);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field
        label="Student registration number"
        htmlFor={inputId}
        hint="17 digits, exactly as printed on the student's registration slip."
        error={visibleError}
      >
        <div className="relative">
          <Input
            id={inputId}
            inputMode="numeric"
            autoComplete="off"
            autoFocus={autoFocus}
            placeholder="e.g. 20152691234567890"
            value={value}
            invalid={!!visibleError}
            aria-describedby={visibleError ? `${inputId}-error` : undefined}
            onChange={(e) => setValue(sanitizeStudentId(e.target.value))}
            onBlur={() => value.length > 0 && setTouched(true)}
            className="pr-16 tracking-wider tabular-nums"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums text-charcoal-60"
          >
            {value.length}/{STUDENT_ID_LENGTH}
          </span>
        </div>
      </Field>
      <Button type="submit" className="w-full">
        {submitLabel} <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </form>
  );
}
