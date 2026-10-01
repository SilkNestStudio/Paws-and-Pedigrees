import { newJourney, readJourney, type Journey } from './journey';

export interface JourneyRecord { revision: number; journey: Journey }
export interface JourneyRepository {
  load(): Promise<JourneyRecord>;
  save(journey: Journey, expectedRevision: number): Promise<number>;
}
export const JOURNEY_DATABASE = 'paws-homecoming';
async function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(JOURNEY_DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('journey');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other Homecoming tabs to open this save.'));
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
  });
}
/** Only this adapter knows IndexedDB. Gameplay uses versioned, serializable records. */
export const journeyRepository: JourneyRepository = {
  async load() {
    const db = await open();
    try {
      return await new Promise<JourneyRecord>((resolve, reject) => {
        const tx = db.transaction('journey', 'readonly'), request = tx.objectStore('journey').get('current');
        tx.onabort = () => reject(tx.error);
        tx.onerror = () => reject(tx.error);
        tx.oncomplete = () => {
          try {
            const record = request.result as JourneyRecord | undefined;
            if (record && (!Number.isSafeInteger(record.revision) || record.revision < 0)) throw new Error('This save has an invalid revision.');
            resolve(record ? { revision: record.revision, journey: readJourney(record.journey) } : { revision: 0, journey: newJourney() });
          } catch (error) { reject(error); }
        };
      });
    } finally { db.close(); }
  },
  async save(journey, expectedRevision) {
    readJourney(journey);
    const db = await open();
    try {
      return await new Promise<number>((resolve, reject) => {
        const tx = db.transaction('journey', 'readwrite'), store = tx.objectStore('journey'), request = store.get('current');
        let conflict = false;
        request.onsuccess = () => {
          if ((request.result?.revision ?? 0) !== expectedRevision) { conflict = true; tx.abort(); return; }
          store.put({ revision: expectedRevision + 1, journey }, 'current');
        };
        tx.oncomplete = () => resolve(expectedRevision + 1);
        tx.onabort = () => reject(conflict ? new Error('Another tab saved newer progress. Download your backup, then reload this tab before continuing.') : tx.error ?? new Error('Your browser could not save Homecoming.'));
        tx.onerror = () => reject(tx.error);
      });
    } finally { db.close(); }
  },
};
