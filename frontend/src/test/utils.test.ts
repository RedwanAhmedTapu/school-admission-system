import { describe, expect, it } from 'vitest';
import { formatCountdown, effectiveStatus, msRemaining } from '../utils/time';
import { isValidStudentId, sanitizeStudentId, studentIdError } from '../utils/studentId';

describe('student id validation', () => {
  it('accepts exactly 17 digits', () => {
    expect(studentIdError('20152691234567890')).toBeNull();
    expect(isValidStudentId('20152691234567890')).toBe(true);
  });
  it('explains what is wrong', () => {
    expect(studentIdError('')).toMatch(/enter/i);
    expect(studentIdError('123')).toMatch(/exactly 17 digits.*3/);
    expect(studentIdError('1234567890123456a')).toMatch(/digits only/i);
  });
  it('sanitizes pasted values to digits, max 17', () => {
    expect(sanitizeStudentId('2015 2691-2345 67890 999')).toBe('20152691234567890');
  });
  it('rejects wrong lengths', () => {
    expect(isValidStudentId('123')).toBe(false);
    expect(isValidStudentId(null)).toBe(false);
  });
});

describe('countdown maths', () => {
  const exp = '2026-11-01T04:10:00Z';
  const t0 = Date.parse(exp);
  it('formats mm:ss and rounds up', () => {
    expect(formatCountdown(600_000)).toBe('10:00');
    expect(formatCountdown(599_100)).toBe('10:00');
    expect(formatCountdown(61_000)).toBe('01:01');
    expect(formatCountdown(1)).toBe('00:01');
  });
  it('is computed from expiresAt, never negative', () => {
    expect(msRemaining(exp, t0 - 5000)).toBe(5000);
    expect(msRemaining(exp, t0 + 5000)).toBe(0);
  });
  it('shows EXPIRED once the deadline passes, without waiting for a poll', () => {
    expect(effectiveStatus('HELD', exp, t0 - 1)).toBe('HELD');
    expect(effectiveStatus('HELD', exp, t0)).toBe('EXPIRED');
    expect(effectiveStatus('CONFIRMED', exp, t0 + 99999)).toBe('CONFIRMED');
  });
});
