export const STUDENT_ID_LENGTH = 17;

/** Keeps digits only and caps the length, so pasted values like "2015 2691 ..." still work. */
export function sanitizeStudentId(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, STUDENT_ID_LENGTH);
}

export function isValidStudentId(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^\d{17}$/.test(value);
}

/** Returns a human-readable problem, or null when the value is a valid 17-digit id. */
export function studentIdError(value: string): string | null {
  if (value.length === 0) return 'Enter the 17-digit student registration number.';
  if (/\D/.test(value)) return 'The student ID can contain digits only.';
  if (value.length < STUDENT_ID_LENGTH)
    return `The student ID must be exactly ${STUDENT_ID_LENGTH} digits. You have entered ${value.length}.`;
  if (value.length > STUDENT_ID_LENGTH) return `The student ID must be exactly ${STUDENT_ID_LENGTH} digits.`;
  return null;
}

/** 20152691234567890 -> 2015 2691 2345 6789 0 (for display only). */
export function formatStudentId(id: string): string {
  return id.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function maskStudentId(id: string): string {
  return id.length === STUDENT_ID_LENGTH ? `${id.slice(0, 4)}•••••••••${id.slice(-4)}` : id;
}
