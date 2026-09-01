import { getSupabaseEntity as getOnlineEntity, isMigratedEntity } from '@/services/data/supabaseEntityAdapter';
import { cacheRows, flushMutationQueue, getCachedRow, getCachedRows, isOffline, queueMutation, removeCachedRow } from '@/services/data/offlineStore';

const adapters = new Map();

function matches(row, filters = {}) {
  return Object.entries(filters).every(([key, value]) => {
    const actual = row?.[key];
    if (Array.isArray(value)) return value.includes(actual);
    return value === null ? actual == null : actual === value;
  });
}

function sortRows(rows, sort) {
  const value = String(sort || '').trim();
  if (!value) return rows;
  const desc = value.startsWith('-');
  const field = desc ? value.slice(1) : value;
  return [...rows].sort((a, b) => {
    const left = a?.[field] ?? '';
    const right = b?.[field] ?? '';
    const result = typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right), 'pt-BR', { numeric: true });
    return desc ? -result : result;
  });
}

function limitRows(rows, limit) {
  const amount = Number(limit);
  return Number.isFinite(amount) && amount > 0 ? rows.slice(0, amount) : rows;
}

async function syncQueue() {
  await flushMutationQueue(async ({ entityName, operation, id, payload }) => {
    const online = getOnlineEntity(entityName);
    if (operation === 'update') await online.update(id, payload);
    if (operation === 'delete') await online.delete(id);
    if (operation === 'create') {
      const clean = { ...payload };
      delete clean._offline_pending;
      await online.create(clean);
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncQueue().catch((error) => console.error('Falha ao sincronizar dados offline:', error));
  });
}

function createOfflineAdapter(entityName) {
  const online = getOnlineEntity(entityName);
  const tableKey = entityName;

  const create = async (payload) => {
    if (!isOffline()) {
      const row = await online.create(payload);
      await cacheRows(tableKey, [row]);
      return row;
    }
    const row = {
      ...payload,
      id: payload?.id || crypto.randomUUID(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      _offline_pending: true,
    };
    await cacheRows(tableKey, [row]);
    await queueMutation({ entityName, operation: 'create', payload: row });
    return row;
  };

  return Object.freeze({
    async list(sort, limit) {
      if (!isOffline()) {
        try {
          await syncQueue();
          const rows = await online.list(sort, limit);
          await cacheRows(tableKey, rows);
          return rows;
        } catch (error) {
          if (!isOffline()) throw error;
        }
      }
      return limitRows(sortRows(await getCachedRows(tableKey), sort), limit);
    },

    async filter(filters = {}, sort, limit) {
      if (!isOffline()) {
        try {
          await syncQueue();
          const rows = await online.filter(filters, sort, limit);
          await cacheRows(tableKey, rows);
          return rows;
        } catch (error) {
          if (!isOffline()) throw error;
        }
      }
      const rows = (await getCachedRows(tableKey)).filter((row) => matches(row, filters));
      return limitRows(sortRows(rows, sort), limit);
    },

    async get(id) {
      if (!isOffline()) {
        try {
          await syncQueue();
          const row = await online.get(id);
          if (row) await cacheRows(tableKey, [row]);
          return row;
        } catch (error) {
          if (!isOffline()) throw error;
        }
      }
      return getCachedRow(tableKey, id);
    },

    create,

    async bulkCreate(rows = []) {
      const created = [];
      for (const row of rows) created.push(await create(row));
      return created;
    },

    async update(id, updates) {
      if (!isOffline()) {
        const row = await online.update(id, updates);
        await cacheRows(tableKey, [row]);
        return row;
      }
      const previous = (await getCachedRow(tableKey, id)) || { id };
      const row = { ...previous, ...updates, updated_date: new Date().toISOString(), _offline_pending: true };
      await cacheRows(tableKey, [row]);
      await queueMutation({ entityName, operation: 'update', id, payload: updates });
      return row;
    },

    async delete(id) {
      if (!isOffline()) {
        await online.delete(id);
        await removeCachedRow(tableKey, id);
        return true;
      }
      await removeCachedRow(tableKey, id);
      await queueMutation({ entityName, operation: 'delete', id });
      return true;
    },
  });
}

export { isMigratedEntity };

export function getSupabaseEntity(entityName) {
  if (!isMigratedEntity(entityName)) return null;
  if (!adapters.has(entityName)) adapters.set(entityName, createOfflineAdapter(entityName));
  return adapters.get(entityName);
}
