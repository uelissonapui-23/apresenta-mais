// @ts-nocheck
import { supabase } from '@/lib/supabaseClient';

const MIGRATED_TABLES = Object.freeze({
  Presentation: 'presentations',
  PresentationBlock: 'presentation_blocks',
  PresentationType: 'presentation_types',
  PresentationObjective: 'presentation_objectives',
  CommunicationStyle: 'communication_styles',
  PresentationStyle: 'communication_styles',
  PresentationTheme: 'presentation_themes',
  BlockType: 'block_types',
  UserPreference: 'user_preferences',
  PresentationSession: 'presentation_sessions',
  SessionBlockProgress: 'session_block_progress',
  GuidedFlow: 'guided_flows',
  GuidedQuestion: 'guided_questions',
  GuidedAnswer: 'guided_answers',
  LibraryItem: 'library_items',
  Tag: 'tags',
  PresentationTag: 'presentation_tags',
  BlockAttachment: 'block_attachments',
  BlockReference: 'block_references',
  PresentationTemplate: 'presentation_templates',
  TemplateBlock: 'template_blocks',
  PresentationVersion: 'presentation_versions',
  AppTip: 'app_tips',
  UserProfile: 'profiles',
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

function normalizeRow(row, table = '') {
  if (!row || typeof row !== 'object') return row;

  const normalized = {
    ...row,
    created_date: row.created_at || row.created_date || null,
    updated_date: row.updated_at || row.updated_date || null,
  };

  if (table === 'profiles') {
    normalized.user_id = row.id;
    normalized.name = row.full_name || '';
    normalized.active = row.account_status !== 'inactive';
  }

  return normalized;
}

const NULLABLE_UUID_FIELDS = Object.freeze({
  presentations: new Set([
    'presentation_type_id',
    'objective_id',
    'communication_style_id',
    'theme_id',
  ]),
  presentation_blocks: new Set([
    'parent_id',
    'block_type_id',
  ]),
  presentation_sessions: new Set([
    'current_block_id',
  ]),
  guided_flows: new Set([
    'presentation_type_id',
    'objective_id',
    'communication_style_id',
  ]),
  presentation_templates: new Set([
    'owner_user_id',
    'presentation_type_id',
    'objective_id',
    'communication_style_id',
  ]),
  template_blocks: new Set([
    'parent_id',
    'block_type_id',
  ]),
  presentation_versions: new Set([
    'created_by',
  ]),
});

const ENTITY_FIELD_MAPS = Object.freeze({
  profiles: Object.freeze({
    user_id: 'id',
    name: 'full_name',
    active: 'account_status',
  }),
});

function mapFieldName(table, field) {
  return ENTITY_FIELD_MAPS[table]?.[field] || field;
}

function mapFieldValue(table, field, value) {
  if (table === 'profiles' && field === 'active') {
    return value === false ? 'inactive' : 'active';
  }
  return value;
}

const NULLABLE_TIMESTAMP_FIELDS = Object.freeze({
  presentation_sessions: new Set([
    'paused_at',
    'finished_at',
  ]),
  session_block_progress: new Set([
    'started_at',
    'completed_at',
  ]),
});

function normalizePayload(payload = {}, table = '') {
  const result = { ...payload };

  delete result.created_date;
  delete result.updated_date;
  delete result.created_at;
  delete result.updated_at;

  // Campos calculados/legados que nunca devem ser enviados ao banco.
  delete result.created_by;
  delete result.updated_by;

  if (table === 'profiles') {
    if ('user_id' in result && !('id' in result)) result.id = result.user_id;
    if ('name' in result && !('full_name' in result)) result.full_name = result.name;
    if ('active' in result && !('account_status' in result)) {
      result.account_status = result.active === false ? 'inactive' : 'active';
    }

    delete result.user_id;
    delete result.name;
    delete result.active;

    [
      'plan_id', 'plan_start_date', 'plan_expires_at', 'plan_status',
      'plan_changed_at', 'plan_changed_by', 'supporter',
    ].forEach((field) => delete result[field]);
  }

  // O Base44 aceitava string vazia em relacionamentos opcionais. No Postgres,
  // colunas UUID aceitam UUID válido ou NULL, nunca ''. Normalizamos aqui para
  // proteger todas as telas que ainda usam o contrato legado.
  const nullableUuidFields = NULLABLE_UUID_FIELDS[table];

  if (nullableUuidFields) {
    nullableUuidFields.forEach((field) => {
      if (typeof result[field] === 'string' && result[field].trim() === '') {
        result[field] = null;
      }
    });
  }

  // O Base44 também tolerava '' em datas opcionais. PostgreSQL timestamptz não.
  const nullableTimestampFields = NULLABLE_TIMESTAMP_FIELDS[table];

  if (nullableTimestampFields) {
    nullableTimestampFields.forEach((field) => {
      if (typeof result[field] === 'string' && result[field].trim() === '') {
        result[field] = null;
      }
    });
  }

  // Preferências foram armazenadas historicamente tanto como objeto quanto JSON.
  if (
    table === 'user_preferences'
    && result.accessibility_settings_json
    && typeof result.accessibility_settings_json !== 'string'
  ) {
    result.accessibility_settings_json = JSON.stringify(result.accessibility_settings_json);
  }

  return result;
}

function applyFilters(query, filters = {}, table = '') {
  let next = query;

  Object.entries(filters || {}).forEach(([key, value]) => {
    const requestedColumn = SYSTEM_FIELD_MAP[key] || key;
    const column = mapFieldName(table, requestedColumn);
    const mappedValue = mapFieldValue(table, key, value);

    if (value === undefined) return;

    if (value === null) {
      next = next.is(column, null);
      return;
    }

    if (Array.isArray(value)) {
      next = next.in(column, value.map((item) => mapFieldValue(table, key, item)));
      return;
    }

    next = next.eq(column, mappedValue);
  });

  return next;
}

function ensureResult(data, error) {
  if (error) {
    const normalizedError = new Error(
      [error.message, error.details, error.hint]
        .filter(Boolean)
        .join(' — '),
    );

    normalizedError.name = 'SupabaseDataError';
    normalizedError.code = error.code;
    normalizedError.details = error.details;
    normalizedError.hint = error.hint;
    normalizedError.original = error;

    throw normalizedError;
  }

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
      return ensureResult(data, error)?.map((row) => normalizeRow(row, table)) || [];
    },

    async filter(filters = {}, sort, limit) {
      let query = supabase.from(table).select('*');
      query = applyFilters(query, filters, table);

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
      return ensureResult(data, error)?.map((row) => normalizeRow(row, table)) || [];
    },

    async get(id) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      return normalizeRow(ensureResult(data, error), table);
    },

    async create(payload) {
      const { data, error } = await supabase
        .from(table)
        .insert(normalizePayload(payload, table))
        .select('*')
        .single();

      return normalizeRow(ensureResult(data, error), table);
    },

    async bulkCreate(rows = []) {
      if (!Array.isArray(rows) || rows.length === 0) return [];

      const { data, error } = await supabase
        .from(table)
        .insert(rows.map((row) => normalizePayload(row, table)))
        .select('*');

      return ensureResult(data, error)?.map((row) => normalizeRow(row, table)) || [];
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from(table)
        .update(normalizePayload(updates, table))
        .eq('id', id)
        .select('*')
        .single();

      return normalizeRow(ensureResult(data, error), table);
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
