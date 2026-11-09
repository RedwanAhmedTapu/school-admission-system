import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelHold,
  confirmHold,
  createClass,
  createHold,
  listAdminHolds,
  listClasses,
  listMyHolds,
} from '../services/admissionApi';
import { isValidStudentId } from '../utils/studentId';
import { useStudentId } from '../services/studentStore';

/** How often seat counts and application statuses are re-read from the backend. */
export const POLL_MS = 5000;

export const keys = {
  classes: ['classes'] as const,
  myHolds: (studentId: string | null) => ['myHolds', studentId] as const,
  adminHolds: (filters: object) => ['adminHolds', filters] as const,
};

/** Polls only while the tab is visible; React Query stops the interval on unmount. */
export function useClasses() {
  return useQuery({
    queryKey: keys.classes,
    queryFn: ({ signal }) => listClasses(signal),
    refetchInterval: POLL_MS,
  });
}

export function useMyHolds() {
  const studentId = useStudentId();
  return useQuery({
    queryKey: keys.myHolds(studentId),
    queryFn: ({ signal }) => listMyHolds(signal),
    enabled: isValidStudentId(studentId),
    refetchInterval: POLL_MS,
  });
}

export function useAdminHolds(filters: { classId?: string; status?: string; q?: string }) {
  return useQuery({
    queryKey: keys.adminHolds(filters),
    queryFn: ({ signal }) => listAdminHolds(filters, signal),
    refetchInterval: POLL_MS,
  });
}

function useRefreshAll() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['classes'] }),
      qc.invalidateQueries({ queryKey: ['myHolds'] }),
      qc.invalidateQueries({ queryKey: ['adminHolds'] }),
    ]);
}

export function useApply() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (classId: string) => createHold(classId),
    onSettled: refresh, // success or failure (e.g. 409) -> show the latest truth
  });
}

export function useConfirm() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: (holdId: string) => confirmHold(holdId), onSettled: refresh });
}

export function useCancel() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: (holdId: string) => cancelHold(holdId), onSettled: refresh });
}

export function useCreateClass() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: createClass, onSettled: refresh });
}

export function useRefreshSeatData() {
  return useRefreshAll();
}
