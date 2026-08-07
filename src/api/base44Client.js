import { getSupabaseEntity, isMigratedEntity } from '@/services/data/supabaseEntityAdapter';
import { uploadUserFile } from '@/services/storageRepository';

const DISABLED_ENTITIES = new Set([
  'Plan', 'PlanRequest', 'SupportContribution',
  'PaymentConfiguration', 'AdConfiguration', 'AdPlacement',
]);

const disabledEntity = Object.freeze({
  async list() { return []; },
  async filter() { return []; },
  async get() { return null; },
  async create() { throw new Error('Este recurso está desativado nesta versão do Apresenta+.'); },
  async bulkCreate() { throw new Error('Este recurso está desativado nesta versão do Apresenta+.'); },
  async update() { throw new Error('Este recurso está desativado nesta versão do Apresenta+.'); },
  async delete() { throw new Error('Este recurso está desativado nesta versão do Apresenta+.'); },
});

const entities = new Proxy({}, {
  get(_target, entityName) {
    if (typeof entityName !== 'string') return undefined;
    if (isMigratedEntity(entityName)) return getSupabaseEntity(entityName);
    if (DISABLED_ENTITIES.has(entityName)) return disabledEntity;
    throw new Error(`Entidade ainda não disponível no backend Supabase: ${entityName}`);
  },
});

// Nome mantido temporariamente para evitar uma refatoração enorme das telas.
// Não existe mais SDK, API, analytics ou backend Base44 por trás deste objeto.
/** @type {any} */
export const base44 = Object.freeze({
  entities,
  integrations: Object.freeze({
    Core: Object.freeze({
      UploadFile: async ({ file }) => uploadUserFile(file),
    }),
  }),
});

export default base44;
