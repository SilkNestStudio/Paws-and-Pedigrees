import type { StateStorage } from 'zustand/middleware';
import { SAVE_KEY } from './config';

/** Storage boundary: versioned, atomic game snapshots independent of React/game rules. */
export const snapshotFields = ['user', 'dogs', 'hasAdoptedFirstDog', 'tutorialProgress', 'storyProgress', 'competitionEvents', 'eventRegistrations', 'championshipProgress'] as const;
export function cleanSnapshot(state: Record<string, unknown>) {
  return Object.fromEntries(snapshotFields.filter(key => key in state).map(key => [key, state[key]]));
}
function validateSnapshot(text: string) {
  const value = JSON.parse(text);
  if (value?.version !== 0 || !value.state?.user || typeof value.state.user.id !== 'string' || !Array.isArray(value.state.dogs)) {
    throw new Error('Unsupported or damaged save. Restore a compatible backup.');
  }
  return text;
}
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  return database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('paws-and-pedigrees', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('saves');
    request.onerror = () => { database = undefined; reject(request.error); };
    request.onblocked = () => { database = undefined; reject(new Error('Close other game tabs to open your save.')); };
    request.onsuccess = () => {
      request.result.onversionchange = () => { request.result.close(); database = undefined; };
      resolve(request.result);
    };
  });
}
async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('saves', mode);
    const request = action(tx.objectStore('saves'));
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () => reject(tx.error ?? new Error('Local save transaction aborted.'));
    tx.onerror = () => reject(tx.error);
  });
}
let pending = Promise.resolve();
let failure: unknown;
function write(action: () => Promise<unknown>) {
  pending = pending.then(action, action).then(() => { failure = undefined; }, error => {
    failure = error;
    window.dispatchEvent(new CustomEvent('local-save-error'));
  });
  return pending;
}
export async function flushLocalSave() {
  await pending;
  if (failure) throw failure;
}
export const localDatabase: StateStorage = {
  async getItem(key) {
    await flushLocalSave();
    const stored = await transaction('readonly', store => store.get(key));
    if (stored !== undefined) return validateSnapshot(stored as string);
    // Copy legacy browser progress once, retaining the original as a recovery copy.
    const legacy = localStorage.getItem(key);
    if (legacy) {
      validateSnapshot(legacy);
      await transaction('readwrite', store => store.put(legacy, key));
    }
    return legacy;
  },
  setItem: (key, value) => write(() => transaction('readwrite', store => store.put(value, key))),
  removeItem: key => write(() => transaction('readwrite', store => store.delete(key))),
};
export async function exportLocalSave(currentState?: Record<string, unknown>) {
  if (currentState) return JSON.stringify({ format: 'paws-and-pedigrees', version: 1, exportedAt: new Date().toISOString(), snapshot: { version: 0, state: cleanSnapshot(currentState) } }, null, 2);
  await flushLocalSave();
  const snapshot = await localDatabase.getItem(SAVE_KEY);
  if (!snapshot) throw new Error('No saved kennel yet.');
  return JSON.stringify({ format: 'paws-and-pedigrees', version: 1, exportedAt: new Date().toISOString(), snapshot: JSON.parse(snapshot) }, null, 2);
}
export async function importLocalSave(text: string) {
  const backup = JSON.parse(text);
  const state = backup?.snapshot?.state;
  if (backup.format !== 'paws-and-pedigrees' || backup.version !== 1 || backup.snapshot.version !== 0 ||
      !state?.user || typeof state.user.id !== 'string' || !Number.isFinite(state.user.cash) ||
      !Array.isArray(state.dogs) || !state.storyProgress || !Array.isArray(state.eventRegistrations) ||
      state.dogs.some((dog: { id?: unknown; user_id?: unknown }) => typeof dog.id !== 'string' || dog.user_id !== state.user.id)) {
    throw new Error('This is not a supported kennel backup.');
  }
  await flushLocalSave();
  // Keep the replaced save available for recovery rather than discarding it.
  const previous = await localDatabase.getItem(SAVE_KEY);
  if (previous) await localDatabase.setItem('before-import', previous);
  state.syncEnabled = false;
  state.loading = false;
  state.error = null;
  await localDatabase.setItem(SAVE_KEY, JSON.stringify({ version: 0, state: cleanSnapshot(state) }));
  await flushLocalSave();
}
