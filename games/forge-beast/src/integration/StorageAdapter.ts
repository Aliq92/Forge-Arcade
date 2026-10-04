import type { SaveStorage } from '../systems/Persistence';
/** Synchronous host storage; async/cloud synchronization belongs to the host. */
export interface ForgeBeastStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}
export type StorageOption = SaveStorage | ForgeBeastStorage | null;
export function resolveStorage(storage?: StorageOption): SaveStorage | null {
  if (storage === undefined) {
    try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
  }
  if (storage === null || 'getItem' in storage) return storage;
  return {
    getItem: key => storage.get(key),
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.remove(key),
  };
}
