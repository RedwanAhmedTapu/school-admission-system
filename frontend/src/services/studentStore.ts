import { useSyncExternalStore } from 'react';
import { isValidStudentId } from '../utils/studentId';

const KEY = 'sas.studentId';
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return isValidStudentId(v) ? v : null;
  } catch {
    return null; // storage blocked (private mode): the id then lives only for this page view
  }
}

let memory: string | null = read();

function emit() {
  listeners.forEach((l) => l());
}

export function getStudentId(): string | null {
  return memory;
}

export function setStudentId(id: string | null) {
  memory = id;
  try {
    if (id) window.localStorage.setItem(KEY, id);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      memory = read();
      cb();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * The remembered student id. This is ONLY the identity - application statuses are never cached
 * here; they are always fetched from the backend.
 */
export function useStudentId(): string | null {
  return useSyncExternalStore(subscribe, getStudentId, () => null);
}
