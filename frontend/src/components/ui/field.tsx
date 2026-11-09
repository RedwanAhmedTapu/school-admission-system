import * as React from 'react';
import { cn } from '../../utils/cn';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'h-11 w-full rounded border bg-white px-3.5 text-[15px] text-charcoal placeholder:text-charcoal-60/70 transition-colors',
        'hover:border-midnight/30 focus-visible:border-sage disabled:cursor-not-allowed disabled:opacity-50',
        invalid ? 'border-terracotta' : 'border-line',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-11 w-full rounded border border-line bg-white px-3 text-[15px] text-charcoal transition-colors hover:border-midnight/30 focus-visible:border-sage',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-charcoal">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm text-terracotta">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-charcoal-60">{hint}</p>
      ) : null}
    </div>
  );
}
