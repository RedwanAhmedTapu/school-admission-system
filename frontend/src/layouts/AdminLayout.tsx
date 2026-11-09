import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ClipboardList, ExternalLink, LayoutDashboard, Library, Menu, X } from 'lucide-react';
import { Logo } from './PortalLayout';
import { cn } from '../utils/cn';
import { InlineNotice } from '../components/ui/feedback';

const ITEMS = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/classes', label: 'Classes', icon: Library, end: false },
  { to: '/admin/applications', label: 'Applications', icon: ClipboardList, end: false },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex min-h-11 items-center gap-3 rounded px-3 text-sm transition-colors',
              isActive ? 'bg-white/10 font-medium text-ivory' : 'text-ivory/65 hover:bg-white/5 hover:text-ivory',
            )
          }
        >
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

/** Compact sidebar + slim top bar. Same tokens as the parent portal, denser layout. */
export function AdminLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="hidden bg-midnight p-4 lg:block">
        <div className="sticky top-4">
          <Link to="/admin" aria-label="Admin home" className="mb-8 block px-1 pt-1">
            <Logo light />
          </Link>
          <NavItems />
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button className="absolute inset-0 bg-midnight/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="relative h-full w-64 bg-midnight p-4 shadow-pop">
            <button
              className="absolute right-2 top-2 grid h-11 w-11 place-items-center text-ivory"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-8 px-1 pt-1">
              <Logo light />
            </div>
            <NavItems onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-ivory/95 px-4 backdrop-blur-[2px] sm:px-8">
          <div className="flex items-center gap-2">
            <button
              className="-ml-2 grid h-11 w-11 place-items-center rounded text-midnight hover:bg-midnight/5 lg:hidden"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-midnight">Admission office</span>
            <span className="rounded-sm border border-line bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-charcoal-60">
              Demo access
            </span>
          </div>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-charcoal hover:text-midnight">
            Parent portal <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
          <InlineNotice className="mb-8">
            This staff area has no login in the demo. In a real deployment it would sit behind staff authentication.
          </InlineNotice>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
