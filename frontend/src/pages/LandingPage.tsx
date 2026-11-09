import { Link } from 'react-router-dom';
import { ArrowRight, ArrowDown, CheckCircle2, Info } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/feedback';
import { SeatMeter } from '../components/ui/status';
import { ClassesSection } from '../features/classes/ClassesSection';
import { StudentIdForm } from '../features/student/StudentIdForm';
import { useClasses } from '../hooks/queries';
import { setStudentId, useStudentId } from '../services/studentStore';
import { formatStudentId, isValidStudentId } from '../utils/studentId';
import { DEMO_STUDENT_ID, SCHOOL } from '../app/school';

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 font-serif text-3xl font-medium leading-tight sm:text-[34px]">{title}</h2>
      {children && <p className="mt-4 text-charcoal-60">{children}</p>}
    </div>
  );
}

function DemoTag() {
  return (
    <span className="ml-2 inline-block rounded-sm border border-line bg-white px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-charcoal-60">
      Demo content
    </span>
  );
}

function LiveSeats() {
  const { data, isLoading, isError } = useClasses();

  if (isLoading) return <Skeleton className="h-16 w-full max-w-md" />;
  if (isError || !data) return null;

  const total = data.reduce((s, c) => s + c.totalSeats, 0);
  const held = data.reduce((s, c) => s + c.heldSeats, 0);
  const confirmed = data.reduce((s, c) => s + c.confirmedSeats, 0);
  const available = data.reduce((s, c) => s + c.availableSeats, 0);

  return (
    <div className="max-w-md">
      <div className="flex items-end justify-between">
        <p>
          <span className="font-serif text-4xl font-medium tabular-nums text-midnight">{available}</span>
          <span className="ml-2 text-sm text-charcoal-60">
            seats open across {data.length} {data.length === 1 ? 'class' : 'classes'}
          </span>
        </p>
        <span className="flex items-center gap-1.5 text-xs text-sage">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sage" aria-hidden /> Live
        </span>
      </div>
      <SeatMeter className="mt-3" total={total} held={held} confirmed={confirmed} />
    </div>
  );
}

function IdentityPanel() {
  const studentId = useStudentId();

  if (isValidStudentId(studentId)) {
    return (
      <div className="rounded-lg border border-line bg-white p-6 shadow-card sm:p-7">
        <p className="eyebrow">Student identified</p>
        <p className="mt-3 font-mono text-xl tracking-wide text-midnight">{formatStudentId(studentId)}</p>
        <p className="mt-2 text-sm text-charcoal-60">
          You can now apply for a class below. This number is remembered in this browser.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link to="/applications">
              My applications <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setStudentId(null)}>
            Use a different ID
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-white p-6 shadow-card sm:p-7">
      <p className="eyebrow">Step 1</p>
      <h2 className="mt-2 font-serif text-2xl font-medium">Identify the student</h2>
      <p className="mb-5 mt-1.5 text-sm text-charcoal-60">No account or password. Your registration number is all we need.</p>
      <StudentIdForm />
      <p className="mt-4 text-xs text-charcoal-60">
        Trying the demo? Use <button type="button" className="font-mono text-midnight underline underline-offset-2" onClick={() => setStudentId(DEMO_STUDENT_ID)}>{DEMO_STUDENT_ID}</button>
      </p>
    </div>
  );
}

const STEPS = [
  { n: '01', title: 'Identify the student', text: "Enter the student's 17-digit registration number. It stays in this browser." },
  { n: '02', title: 'Choose class and shift', text: 'Each class and shift has its own seat count that updates live.' },
  { n: '03', title: 'Reserve a seat', text: 'Your seat is held for a limited time while you complete the fee.' },
  { n: '04', title: 'Confirm admission', text: 'Pay the admission fee before the countdown ends to confirm the seat.' },
];

const GUIDELINES = [
  'Admission is strictly first-come, first-served. There is no lottery.',
  'Each student may hold one seat per class and shift at a time.',
  'A held seat is released automatically when the countdown ends.',
  'Keep the student registration number handy; it identifies every application.',
  'A confirmed admission is final in this demo and is not cancelled online.',
];

const FAQ = [
  {
    q: 'How long is a seat held for me?',
    a: 'The hold lasts for a fixed period set by the school. The exact time remaining is always shown on your application and counts down live.',
  },
  {
    q: 'What happens if I run out of time?',
    a: 'The seat is released automatically and becomes available to other families. You may apply again if seats are still open.',
  },
  {
    q: 'Can I apply for two shifts of the same class?',
    a: 'Each class and shift is a separate listing. You can hold one seat in each, but only one application per listing.',
  },
  {
    q: 'Is the payment real?',
    a: 'No. This is a demonstration: pressing "Pay admission fee" is treated as a successful payment. No real transaction takes place.',
  },
  {
    q: 'I closed my browser. Is my application lost?',
    a: "No. Enter the same student registration number again and your applications are loaded from the server.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section id="admission" className="border-b border-line">
        <div className="page-container grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:gap-16">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 border-l-2 border-champagne bg-champagne-50 py-1.5 pl-3 pr-4 text-sm text-charcoal">
              <Info className="h-4 w-4 text-amber" aria-hidden />
              Admissions are open for the new academic session.
            </p>
            <h1 className="mt-6 font-serif text-[40px] font-medium leading-[1.12] sm:text-5xl lg:text-[56px]">
              Begin Your Academic <span className="italic text-sage">Journey</span> With Us
            </h1>
            <p className="mt-6 max-w-xl text-lg text-charcoal-60">
              A transparent and simple admission process. Apply online, reserve your seat, and complete your admission with
              confidence.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a href="#classes">
                  Choose a class <ArrowDown className="h-4 w-4" aria-hidden />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how-it-works">How admission works</a>
              </Button>
            </div>
            <div className="mt-12 border-t border-line pt-6">
              <LiveSeats />
            </div>
          </div>

          <div className="animate-fade-up [animation-delay:120ms]">
            <IdentityPanel />
          </div>
        </div>
      </section>

      {/* Process */}
      <section id="how-it-works" className="border-b border-line bg-white">
        <div className="page-container py-16 sm:py-20">
          <SectionHeading eyebrow="The process" title="Four steps from application to admission" />
          <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="relative border-t-2 border-midnight pt-5">
                <span className="font-serif text-3xl font-medium text-champagne">{s.n}</span>
                <h3 className="mt-3 font-serif text-lg font-medium">{s.title}</h3>
                <p className="mt-2 text-sm text-charcoal-60">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Classes */}
      <section id="classes" className="border-b border-line">
        <div className="page-container py-16 sm:py-20">
          <SectionHeading eyebrow="Available classes" title="Classes and shifts">
            Seat numbers refresh automatically every few seconds. A seat that is held but unpaid is released when its time ends.
          </SectionHeading>
          <div className="mt-10">
            <ClassesSection />
          </div>
        </div>
      </section>

      {/* Guidelines + notices */}
      <section id="guidelines" className="border-b border-line bg-white">
        <div className="page-container grid gap-14 py-16 sm:py-20 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Admission guidelines" title="Before you apply" />
            <ul className="mt-8 space-y-4">
              {GUIDELINES.map((g) => (
                <li key={g} className="flex gap-3 text-charcoal">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sage" aria-hidden />
                  {g}
                </li>
              ))}
            </ul>
          </div>
          <div id="notices">
            <SectionHeading eyebrow="Important notices" title="Please note" />
            <div className="mt-8 space-y-5">
              {[
                ['Fee payment is simulated', 'This demonstration does not connect to a payment provider.'],
                ['One seat, one student', 'A registration number can hold only one active application per class and shift.'],
                ['Official details', 'School name, address and contacts shown here are placeholders.'],
              ].map(([t, d]) => (
                <div key={t} className="border-l-2 border-champagne pl-4">
                  <h3 className="font-medium text-midnight">
                    {t}
                    <DemoTag />
                  </h3>
                  <p className="mt-1 text-sm text-charcoal-60">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-line">
        <div className="page-container grid gap-12 py-16 sm:py-20 lg:grid-cols-[1fr_1.6fr]">
          <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-1">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded font-medium text-midnight [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="text-xl text-sage transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pb-4 pr-8 text-charcoal-60">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* School info */}
      <section id="school" className="bg-white">
        <div className="page-container py-16 sm:py-20">
          <SectionHeading eyebrow="The school" title={SCHOOL.name}>
            A placeholder profile. Replace this section with the school's mission, curriculum and campus information.
          </SectionHeading>
          <dl className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              ['Address', SCHOOL.address],
              ['Telephone', SCHOOL.phone],
              ['Email', SCHOOL.email],
            ].map(([k, v]) => (
              <div key={k} className="border-t border-line pt-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal-60">{k}</dt>
                <dd className="mt-2 text-midnight">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
