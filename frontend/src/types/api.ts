export type HoldStatus = 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';

export interface ClassSeats {
  id: string;
  name: string;
  totalSeats: number;
  heldSeats: number;
  confirmedSeats: number;
  availableSeats: number;
}

export interface CreateClassRequest {
  name: string;
  totalSeats: number;
}

export interface ClassCreated {
  id: string;
  name: string;
  totalSeats: number;
}

export interface HoldCreated {
  holdId: string;
  classId: string;
  studentId: string;
  status: HoldStatus;
  expiresAt: string;
}

export interface MyHold {
  holdId: string;
  classId: string;
  className: string;
  status: HoldStatus;
  expiresAt: string;
  createdAt?: string;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
}

export interface AdminHold {
  holdId: string;
  classId: string;
  className: string;
  studentId: string;
  status: HoldStatus;
  createdAt: string;
  expiresAt: string;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
}
