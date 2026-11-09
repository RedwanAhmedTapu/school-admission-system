import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StudentIdForm } from '../features/student/StudentIdForm';
import { ApplicationCard } from '../features/student/ApplicationCard';
import { ClassCard } from '../features/classes/ClassCard';
import { TooltipProvider } from '../components/ui/overlay';
import { getStudentId } from '../services/studentStore';
import type { ClassSeats, MyHold } from '../types/api';

const exp = Date.parse('2026-11-01T04:10:00Z');
const hold = (over: Partial<MyHold> = {}): MyHold => ({
  holdId: 'h_789',
  classId: 'c_123',
  className: 'Class 6 - Morning Shift',
  status: 'HELD',
  expiresAt: '2026-11-01T04:10:00Z',
  createdAt: '2026-11-01T04:00:00Z',
  ...over,
});
const cls = (over: Partial<ClassSeats> = {}): ClassSeats => ({
  id: 'c_123', name: 'Class 6 - Morning Shift', totalSeats: 120, heldSeats: 15, confirmedSeats: 80, availableSeats: 25, ...over,
});

describe('StudentIdForm', () => {
  it('blocks a short id with a readable message and does not save it', async () => {
    const onSaved = vi.fn();
    render(<StudentIdForm onSaved={onSaved} />);
    await userEvent.type(screen.getByLabelText(/student registration number/i), '12345');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/exactly 17 digits/i);
    expect(onSaved).not.toHaveBeenCalled();
    expect(getStudentId()).toBeNull();
  });

  it('saves a valid id and persists it to localStorage', async () => {
    const onSaved = vi.fn();
    render(<StudentIdForm onSaved={onSaved} />);
    await userEvent.type(screen.getByLabelText(/student registration number/i), '20152691234567890');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onSaved).toHaveBeenCalledWith('20152691234567890');
    expect(window.localStorage.getItem('sas.studentId')).toBe('20152691234567890');
  });

  it('ignores non-digit characters as they are typed', async () => {
    render(<StudentIdForm />);
    const input = screen.getByLabelText(/student registration number/i) as HTMLInputElement;
    await userEvent.type(input, 'ab12-3');
    expect(input.value).toBe('123');
  });
});

describe('ApplicationCard', () => {
  const noop = () => {};
  it('shows countdown and enables pay/cancel while HELD', () => {
    render(<ApplicationCard hold={hold()} now={exp - 125_000} busy={null} onConfirm={noop} onCancel={noop} />);
    expect(screen.getByTestId('countdown')).toHaveTextContent('02:05');
    expect(screen.getByRole('button', { name: /pay admission fee/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /cancel application/i })).toBeEnabled();
  });

  it('shows EXPIRED and disables payment once the deadline passes, with no reload', () => {
    const { rerender } = render(<ApplicationCard hold={hold()} now={exp - 1000} busy={null} onConfirm={noop} onCancel={noop} />);
    expect(screen.getByTestId('status-label')).toHaveTextContent('Seat held');
    rerender(<ApplicationCard hold={hold()} now={exp + 1000} busy={null} onConfirm={noop} onCancel={noop} />);
    expect(screen.getByTestId('status-label')).toHaveTextContent('Expired');
    expect(screen.getByRole('button', { name: /pay admission fee/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /cancel application/i })).toBeNull();
  });

  it('fires onConfirm with the hold when paying', async () => {
    const onConfirm = vi.fn();
    render(<ApplicationCard hold={hold()} now={exp - 60_000} busy={null} onConfirm={onConfirm} onCancel={noop} />);
    await userEvent.click(screen.getByRole('button', { name: /pay admission fee/i }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ holdId: 'h_789' }));
  });

  it('shows confirmed state without payment actions', () => {
    render(<ApplicationCard hold={hold({ status: 'CONFIRMED' })} now={exp - 60_000} busy={null} onConfirm={noop} onCancel={noop} />);
    expect(screen.getByTestId('status-label')).toHaveTextContent('Confirmed');
    expect(screen.queryByRole('button', { name: /pay admission fee/i })).toBeNull();
  });
});

describe('ClassCard', () => {
  const wrap = (ui: React.ReactElement) => render(<MemoryRouter><TooltipProvider>{ui}</TooltipProvider></MemoryRouter>);

  it('lists total, held, confirmed and available seats', () => {
    wrap(<ClassCard cls={cls()} hasStudent onApply={() => {}} />);
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getAllByText('25').length).toBeGreaterThan(0);
  });

  it('disables apply without a student id', () => {
    wrap(<ClassCard cls={cls()} hasStudent={false} onApply={() => {}} />);
    expect(screen.getByRole('button', { name: /^apply$/i })).toBeDisabled();
  });

  it('disables apply when no seats are available', () => {
    wrap(<ClassCard cls={cls({ availableSeats: 0, heldSeats: 40, confirmedSeats: 80 })} hasStudent onApply={() => {}} />);
    expect(screen.getByRole('button', { name: /no seats available/i })).toBeDisabled();
  });

  it('calls onApply for an available class', async () => {
    const onApply = vi.fn();
    wrap(<ClassCard cls={cls()} hasStudent onApply={onApply} />);
    await userEvent.click(screen.getByRole('button', { name: /apply for this class/i }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ id: 'c_123' }));
  });
});
