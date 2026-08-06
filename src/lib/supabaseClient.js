import { createClient } from '@supabase/supabase-js';

import {
  assertSupabaseConfigured,
  backendConfig,
} from '@/lib/backendConfig';

const GLOBAL_KEY = '__APRESENTA_SUPABASE_CLIENT__';

function createSupabaseClient() {
  assertSupabaseConfigured();

  return createClient(
    backendConfig.supabaseUrl,
    backendConfig.supabasePublishableKey,
    {
      db: {
        schema: backendConfig.supabaseSchema,
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
}

export function getSupabaseClient() {
  if (typeof globalThis !== 'undefined' && globalThis[GLOBAL_KEY]) {
    return globalThis[GLOBAL_KEY];
  }

  const client = createSupabaseClient();

  if (typeof globalThis !== 'undefined') {
    globalThis[GLOBAL_KEY] = client;
  }

  return client;
}

export const supabase = new Proxy({}, {
  get(_target, property) {
    return getSupabaseClient()[property];
  },
});
