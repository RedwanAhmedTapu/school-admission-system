import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { Toaster as Sonner } from 'sonner';
import { cn } from '../../utils/cn';

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Root delayDuration={150}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={6}
          className="z-50 max-w-[16rem] rounded bg-midnight px-3 py-2 text-xs leading-snug text-ivory shadow-pop"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-midnight" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align="end"
        sideOffset={8}
        className={cn(
          'z-50 min-w-[14rem] rounded-md border border-line bg-white p-1.5 shadow-pop data-[state=open]:animate-fade-up',
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item>) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        'flex min-h-10 cursor-pointer select-none items-center gap-2.5 rounded px-3 text-sm text-charcoal outline-none data-[highlighted]:bg-ivory data-[highlighted]:text-midnight',
        className,
      )}
      {...props}
    />
  );
}

export const DropdownMenuSeparator = () => <DropdownPrimitive.Separator className="my-1.5 h-px bg-line" />;
export const DropdownMenuLabel = ({ children }: { children: React.ReactNode }) => (
  <DropdownPrimitive.Label className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-charcoal-60">
    {children}
  </DropdownPrimitive.Label>
);

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast: '!rounded !border !border-line !bg-white !font-sans !text-charcoal !shadow-pop',
          title: '!font-medium !text-midnight',
          success: '!border-l-4 !border-l-sage',
          error: '!border-l-4 !border-l-terracotta',
        },
      }}
    />
  );
}
