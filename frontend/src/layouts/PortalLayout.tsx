import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, FileText, Menu, UserRound, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/overlay';
import { StudentIdForm } from '../features/student/StudentIdForm';
import { setStudentId, useStudentId } from '../services/studentStore';
import { formatStudentId, isValidStudentId, maskStudentId } from '../utils/studentId';
import { cn } from '../utils/cn';
import { SCHOOL } from '../app/school';

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span
        aria-hidden
        className={cn(
          'relative grid h-9 w-9 place-items-center rounded font-serif text-lg font-semibold',
          light ? 'bg-ivory text-midnight' : 'bg-midnight text-ivory',
        )}
      >
        {SCHOOL.monogram}
        <i className="absolute right-1 top-1 h-1.5 w-1.5 bg-champagne" />
      </span>
      <span className="leading-tight">
        <span className={cn('block font-serif text-[17px] font-semibold', light ? 'text-ivory' : 'text-midnight')}>
          {SCHOOL.name}
        </span>
        <span className={cn('block text-[11px] uppercase tracking-[0.14em]', light ? 'text-ivory/60' : 'text-charcoal-60')}>
          Online admission
        </span>
      </span>
    </span>
  );
}

const NAV = [
  { to: '/#admission', label: 'Admission information' },
  { to: '/#how-it-works', label: 'How it works' },
  { to: '/#classes', label: 'Available classes' },
];

function StudentMenu({ onChange }: { onChange: () => void }) {
  const studentId = useStudentId();

  if (!isValidStudentId(studentId)) {
    return (
      <Button variant="outline" size="sm" onClick={onChange}>
        <UserRound className="h-4 w-4" aria-hidden /> Student ID
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Student ${maskStudentId(studentId)}, open menu`}>
          <UserRound className="h-4 w-4" aria-hidden />
          <span className="font-mono text-[13px]">{maskStudentId(studentId)}</span>
          <ChevronDown className="h-3.5 w-3.5 text-charcoal-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Applying as</DropdownMenuLabel>
        <p className="px-3 pb-2 font-mono text-sm text-midnight">{formatStudentId(studentId)}</p>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/applications">
            <FileText className="h-4 w-4" aria-hidden /> My applications
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onChange}>
          <UserRound className="h-4 w-4" aria-hidden /> Use a different student ID
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setStudentId(null)}>
          <X className="h-4 w-4" aria-hidden /> Forget this student ID
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PortalLayout() {
  const { pathname, hash } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [idDialog, setIdDialog] = useState(false);
  const studentId = useStudentId();

  // Hash links (/#classes) on a single-page app: scroll after navigation.
  useEffect(() => {
    setMenuOpen(false);
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) requestAnimationFrame(() => el.scrollIntoView());
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-midnight focus:px-4 focus:py-2 focus:text-ivory"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur-[2px]">
        <div className="page-container flex h-16 items-center justify-between gap-4">
          <Link to="/" aria-label={`${SCHOOL.name} home`} className="rounded">
            <Logo />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded px-3 py-2 text-sm text-charcoal transition-colors hover:bg-midnight/5 hover:text-midnight"
              >
                {n.label}
              </Link>
            ))}
            <NavLink
              to="/applications"
              className={({ isActive }) =>
                cn(
                  'rounded px-3 py-2 text-sm transition-colors hover:bg-midnight/5 hover:text-midnight',
                  isActive ? 'font-semibold text-midnight' : 'text-charcoal',
                )
              }
            >
              My applications
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <StudentMenu onChange={() => setIdDialog(true)} />
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded text-midnight hover:bg-midnight/5 lg:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line bg-ivory lg:hidden">
            <div className="page-container flex flex-col py-2">
              {[...NAV, { to: '/applications', label: 'My applications' }].map((n) => (
                <Link key={n.to} to={n.to} className="flex min-h-12 items-center border-b border-line/60 text-[15px] last:border-0">
                  {n.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-midnight text-ivory/80">
        <div className="page-container grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ivory/65">
              {SCHOOL.name} is a fictional institution used to demonstrate this admission system. All school details on this
              site are placeholders.
            </p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-champagne">Admission</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link className="hover:text-ivory" to="/#how-it-works">How it works</Link></li>
              <li><Link className="hover:text-ivory" to="/#classes">Available classes</Link></li>
              <li><Link className="hover:text-ivory" to="/#faq">Frequently asked questions</Link></li>
              <li><Link className="hover:text-ivory" to="/applications">My applications</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-champagne">School office</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>{SCHOOL.address}</li>
              <li>{SCHOOL.phone}</li>
              <li>{SCHOOL.email}</li>
              <li className="pt-2"><Link className="text-ivory/60 underline underline-offset-4 hover:text-ivory" to="/admin">Staff area (demo)</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="page-container py-5 text-xs text-ivory/50">
            Demonstration site · Content marked "demo" is placeholder text.
          </div>
        </div>
      </footer>

      <Dialog open={idDialog} onOpenChange={setIdDialog}>
        <DialogContent>
          <DialogTitle>Student registration number</DialogTitle>
          <DialogDescription>Enter the 17-digit number to apply and to see this student's applications.</DialogDescription>
          <div className="mt-5">
            <StudentIdForm
              autoFocus
              initialValue={studentId ?? ''}
              submitLabel="Save student ID"
              onSaved={() => setIdDialog(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
