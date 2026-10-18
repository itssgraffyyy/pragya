/**
 * Storage singleton.
 * Uses IndexedDB when available; falls back to memory (with a console
 * warning) so the app remains usable in restricted environments.
 */

import type { StorageAdapter } from './storage';
import { IndexedDbStorage } from './indexedDbStorage';
import { MemoryStorage } from './memoryStorage';

let storageWarning:string|null=null;
export function getStorageWarning(){return storageWarning;}
let instance: StorageAdapter | null = null;
let initPromise: Promise<StorageAdapter> | null = null;

/** Get the app-wide storage adapter (initializes on first use). */
export function getStorage(): StorageAdapter {
  if (!instance) {
    instance = typeof indexedDB !== 'undefined' ? new IndexedDbStorage() : new MemoryStorage();
    if(instance instanceof MemoryStorage)storageWarning='Persistent storage unavailable; this session uses temporary memory. Export data before closing.';
  }
  return instance;
}

/** Initialize storage once; resolves to the active adapter. */
export function initStorage(): Promise<StorageAdapter> {
  if (!initPromise) {
    const adapter = getStorage();
    initPromise = adapter
      .init()
      .then(() => adapter)
      .catch((e) => {
        console.warn('IndexedDB init failed; falling back to in-memory storage.', e);
        storageWarning='IndexedDB could not open; existing data was retained. Changes use temporary memory. Export before closing and check the browser profile/database version.';
        const memory = new MemoryStorage();
        instance = memory;
        return memory.init().then(() => memory);
      });
  }
  return initPromise;
}
