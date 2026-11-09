import * as React from 'react';
import { cn } from '../../utils/cn';

/** Scrolls horizontally on narrow screens instead of squashing columns. */
export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-line bg-white shadow-card', className)}>
      {children}
    </div>
  );
}

export const Table = ({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <table className={cn('w-full min-w-[640px] border-collapse text-left text-sm', className)} {...props} />
);

export const Th = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    scope="col"
    className={cn(
      'whitespace-nowrap border-b border-line bg-ivory/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-charcoal-60',
      className,
    )}
    {...props}
  />
);

export const Tr = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('border-b border-line/70 transition-colors last:border-0 hover:bg-ivory/70', className)} {...props} />
);

export const Td = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-4 py-3.5 align-middle text-charcoal', className)} {...props} />
);
