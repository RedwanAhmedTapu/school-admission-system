import * as React from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './button';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded bg-midnight/[0.07]', className)} />;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-dashed border-line bg-white/60 px-6 py-12 text-center', className)}>
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-ivory-deep text-charcoal-60">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
      </div>
      <h3 className="font-serif text-lg font-medium text-midnight">{title}</h3>
      {description && <p className="mx-auto mt-1.5 max-w-sm text-sm text-charcoal-60">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn('rounded-lg border border-terracotta/30 bg-terracotta-50 px-6 py-8 text-center', className)}
    >
      <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-terracotta" aria-hidden />
      <p className="mx-auto max-w-md text-sm text-charcoal">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Try again
        </Button>
      )}
    </div>
  );
}

export function InlineNotice({
  tone = 'info',
  children,
  className,
}: {
  tone?: 'info' | 'warning';
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded border px-4 py-3 text-sm',
        tone === 'warning' ? 'border-amber/30 bg-amber-50 text-charcoal' : 'border-line bg-ivory-deep text-charcoal',
        className,
      )}
    >
      {children}
    </div>
  );
}
