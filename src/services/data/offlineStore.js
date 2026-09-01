const DB_NAME = 'apresenta-plus-offline';
const DB_VERSION = 1;
const ROWS = 'rows';
const QUEUE = 'queue';

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ROWS)) db.createObjectStore(ROWS, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function store(mode, name) {
  const db = await openDb();
  if (!db) return null;
  return db.transaction(name, mode).objectStore(name);
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheRows(table, rows = []) {
  const objectStore = await store('readwrite', ROWS);
  if (!objectStore) return;
  await Promise.all((rows || []).filter((row) => row?.id).map((row) => requestResult(objectStore.put({ key: `${table}:${row.id}`, table, row }))));
}

export async function removeCachedRow(table, id) {
  const objectStore = await store('readwrite', ROWS);
  if (objectStore) await requestResult(objectStore.delete(`${table}:${id}`));
}

export async function getCachedRows(table) {
  const objectStore = await store('readonly', ROWS);
  if (!objectStore) return [];
  const all = await requestResult(objectStore.getAll());
  return all.filter((entry) => entry.table === table).map((entry) => entry.row);
}

export async function getCachedRow(table, id) {
  const objectStore = await store('readonly', ROWS);
  if (!objectStore) return null;
  const entry = await requestResult(objectStore.get(`${table}:${id}`));
  return entry?.row || null;
}

export async function queueMutation(mutation) {
  const objectStore = await store('readwrite', QUEUE);
  if (objectStore) await requestResult(objectStore.add({ ...mutation, queuedAt: Date.now() }));
}

export async function flushMutationQueue(executor) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const objectStore = await store('readonly', QUEUE);
  if (!objectStore) return;
  const entries = await requestResult(objectStore.getAll());
  for (const entry of entries) {
    await executor(entry);
    const writeStore = await store('readwrite', QUEUE);
    await requestResult(writeStore.delete(entry.id));
  }
}

export function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}
