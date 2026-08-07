import { supabase } from '@/lib/supabaseClient';

const MIGRATED_TABLES = Object.freeze({
  Presentation: 'presentations',
  PresentationBlock: 'presentation_blocks',
  PresentationType: 'presentation_types',
  PresentationObjective: 'presentation_objectives',
  CommunicationStyle: 'communication_styles',
  PresentationTheme: 'presentation_themes',
  BlockType: 'block_types',
});

const SYSTEM_FIELD_MAP = Object.freeze({
  created_date: 'created_at',
  updated_date: 'updated_at',
});

function normalizeSort(sort) {
  const value = String(sort || '').trim();
  if (!value) return null;

  const descending = value.startsWith('-');
  const requested = descending ? value.slice(1) : value;
  const column = SYSTEM_FIELD_MAP[requested] || requested;

  return {
    column,
    ascending: !descending,
  };
}

function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;

  return {
    ...row,
    created_date: row.created_at || row.created_date || null,
    updated_date: row.updated_at || row.updated_date || null,
  };
}

function normalizePayload(payload = {}) {
  const result = { ...payload };

  delete result.created_date;
  delete result.updated_date;
  delete result.created_at;
  delete result.updated_at;

  // Campos calculados/legados que nunca devem ser enviados ao banco.
  delete result.created_by;
  delete result.updated_by;

  return result;
}

function applyFilters(query, filters = {}) {
  let next = query;

  Object.entries(filters || {}).forEach(([key, value]) => {
    const column = SYSTEM_FIELD_MAP[key] || key;

    if (value === undefined) return;

    if (value === null) {
      next = next.is(column, null);
      return;
    }

    if (Array.isArray(value)) {
      next = next.in(column, value);
      return;
    }

    next = next.eq(column, value);
  });

  return next;
}

function ensureResult(data, error) {
  if (error) throw error;
  return data;
}

function createAdapter(table) {
  return Object.freeze({
    async list(sort, limit) {
      let query = supabase.from(table).select('*');

      const order = normalizeSort(sort);
      if (order) {
        query = query.order(order.column, {
          ascending: order.ascending,
          nullsFirst: false,
        });
      }

      if (Number.isFinite(Number(limit)) && Number(limit) > 0) {
        query = query.limit(Number(limit));
      }

      const { data, error } = await query;
      return ensureResult(data, error)?.map(normalizeRow) || [];
    },

    async filter(filters = {}, sort, limit) {
      let query = supabase.from(table).select('*');
      query = applyFilters(query, filters);

      const order = normalizeSort(sort);
      if (order) {
        query = query.order(order.column, {
          ascending: order.ascending,
          nullsFirst: false,
        });
      }

      if (Number.isFinite(Number(limit)) && Number(limit) > 0) {
        query = query.limit(Number(limit));
      }

      const { data, error } = await query;
      return ensureResult(data, error)?.map(normalizeRow) || [];
    },

    async get(id) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      return normalizeRow(ensureResult(data, error));
    },

    async create(payload) {
      const { data, error } = await supabase
        .from(table)
        .insert(normalizePayload(payload))
        .select('*')
        .single();

      return normalizeRow(ensureResult(data, error));
    },

    async bulkCreate(rows = []) {
      if (!Array.isArray(rows) || rows.length === 0) return [];

      const { data, error } = await supabase
        .from(table)
        .insert(rows.map(normalizePayload))
        .select('*');

      return ensureResult(data, error)?.map(normalizeRow) || [];
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from(table)
        .update(normalizePayload(updates))
        .eq('id', id)
        .select('*')
        .single();

      return normalizeRow(ensureResult(data, error));
    },

    async delete(id) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    },
  });
}

const adapters = Object.fromEntries(
  Object.entries(MIGRATED_TABLES).map(([entityName, table]) => [
    entityName,
    createAdapter(table),
  ]),
);

export function isMigratedEntity(entityName) {
  return Object.prototype.hasOwnProperty.call(MIGRATED_TABLES, entityName);
}

export function getSupabaseEntity(entityName) {
  return adapters[entityName] || null;
}

export const migratedEntityNames = Object.freeze(Object.keys(MIGRATED_TABLES));
