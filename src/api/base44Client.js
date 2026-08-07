import { createClient } from '@base44/sdk';

import { appParams } from '@/lib/app-params';
import { backendConfig } from '@/lib/backendConfig';
import {
  getSupabaseEntity,
  isMigratedEntity,
} from '@/services/data/supabaseEntityAdapter';

const GLOBAL_CLIENT_KEY = '__APRESENTA_BASE44_CLIENT__';

function normalizeOptionalString(value) {
  if (value === undefined || value === null) return undefined;
  const normalizedValue = String(value).trim();
  return normalizedValue || undefined;
}

const clientConfiguration = {
  appId: normalizeOptionalString(appParams.appId),
  token: normalizeOptionalString(appParams.token),
  functionsVersion: normalizeOptionalString(appParams.functionsVersion),
  appBaseUrl: normalizeOptionalString(appParams.appBaseUrl),
  serverUrl: '',
  requiresAuth: false,
};

let legacyClient = null;

function getLegacyClient() {
  if (legacyClient) return legacyClient;

  if (
    typeof globalThis !== 'undefined'
    && globalThis[GLOBAL_CLIENT_KEY]
  ) {
    legacyClient = globalThis[GLOBAL_CLIENT_KEY];
    return legacyClient;
  }

  legacyClient = createClient(clientConfiguration);

  if (typeof globalThis !== 'undefined') {
    globalThis[GLOBAL_CLIENT_KEY] = legacyClient;
  }

  return legacyClient;
}

const entitiesProxy = new Proxy({}, {
  get(_target, entityName) {
    if (
      backendConfig.provider === 'supabase'
      && typeof entityName === 'string'
      && isMigratedEntity(entityName)
    ) {
      return getSupabaseEntity(entityName);
    }

    return getLegacyClient().entities[entityName];
  },
});

export const base44 = new Proxy({}, {
  get(_target, property) {
    if (property === 'entities') {
      return entitiesProxy;
    }

    return getLegacyClient()[property];
  },
});

export default base44;
