import type { GameState } from './state';

/**
 * Local save storage. The game talks only to these three functions, so a
 * cloud save can replace IndexedDB later without touching gameplay code.
 * The database name is new, so saves from earlier prototypes are untouched.
 */
const DB_NAME = 'paws-rebuild';
const STORE = 'saves';
const SLOT = 'week-one';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function isValid(data: unknown): data is GameState {
  const s = data as GameState;
  return !!s && s.version === 1 && Array.isArray(s.dogs) && typeof s.day === 'number' && typeof s.story === 'string';
}

export async function loadGame(): Promise<GameState | null> {
  try {
    const db = await open();
    return await new Promise((resolve) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(SLOT);
      request.onsuccess = () => resolve(isValid(request.result) ? request.result : null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

let pending: GameState | null = null;
let writing = false;

/** Saves the latest state; rapid calls collapse into one write. */
export function saveGame(state: GameState): void {
  pending = state;
  if (!writing) void flush();
}

async function flush(): Promise<void> {
  writing = true;
  try {
    const db = await open();
    while (pending) {
      const next = pending;
      pending = null;
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(next, SLOT);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch {
    // Storage unavailable (private browsing): the game keeps running unsaved.
  } finally {
    writing = false;
  }
}

export async function deleteGame(): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(SLOT);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Nothing to delete.
  }
}
