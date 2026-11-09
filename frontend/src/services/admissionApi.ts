import { request } from './api';
import type {
  AdminHold,
  ClassCreated,
  ClassSeats,
  CreateClassRequest,
  HoldCreated,
  HoldStatus,
  MyHold,
} from '../types/api';

// One function per endpoint of the assignment contract (plus the read-only admin listing).

export const createClass = (body: CreateClassRequest) =>
  request<ClassCreated>({ method: 'POST', url: '/classes', data: body });

export const listClasses = (signal?: AbortSignal) =>
  request<ClassSeats[]>({ method: 'GET', url: '/classes', signal });

export const getClass = (classId: string, signal?: AbortSignal) =>
  request<ClassSeats>({ method: 'GET', url: `/classes/${encodeURIComponent(classId)}`, signal });

export const createHold = (classId: string) =>
  request<HoldCreated>({
    method: 'POST',
    url: `/classes/${encodeURIComponent(classId)}/holds`,
    withStudent: true,
  });

export const getHold = (holdId: string, signal?: AbortSignal) =>
  request<{ holdId: string; classId: string; status: HoldStatus; expiresAt: string }>({
    method: 'GET',
    url: `/holds/${encodeURIComponent(holdId)}`,
    signal,
  });

export const confirmHold = (holdId: string) =>
  request<{ holdId: string; status: HoldStatus }>({
    method: 'POST',
    url: `/holds/${encodeURIComponent(holdId)}/confirm`,
    withStudent: true,
  });

export const cancelHold = (holdId: string) =>
  request<void>({ method: 'DELETE', url: `/holds/${encodeURIComponent(holdId)}`, withStudent: true });

export const listMyHolds = (signal?: AbortSignal) =>
  request<MyHold[]>({ method: 'GET', url: '/me/holds', withStudent: true, signal });

export const listAdminHolds = (
  params: { classId?: string; status?: string; q?: string },
  signal?: AbortSignal,
) => request<AdminHold[]>({ method: 'GET', url: '/admin/holds', params, signal });
