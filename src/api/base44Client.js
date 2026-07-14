import { createClient } from '@base44/sdk';

import { appParams } from '@/lib/app-params';

/*
|--------------------------------------------------------------------------
| Identificador global do cliente
|--------------------------------------------------------------------------
|
| Durante o desenvolvimento, o Vite pode recarregar módulos sem atualizar
| completamente a página. Guardar a instância no globalThis evita criar
| vários clientes Base44 simultaneamente.
|
*/

const GLOBAL_CLIENT_KEY = '__APRESENTA_BASE44_CLIENT__';

/*
|--------------------------------------------------------------------------
| Normalização de valores
|--------------------------------------------------------------------------
*/

function normalizeOptionalString(value) {
  if (
    value === undefined
    || value === null
  ) {
    return undefined;
  }

  const normalizedValue = String(value).trim();

  return normalizedValue || undefined;
}

/*
|--------------------------------------------------------------------------
| Parâmetros do aplicativo
|--------------------------------------------------------------------------
*/

const clientConfiguration = {
  appId: normalizeOptionalString(appParams.appId),
  token: normalizeOptionalString(appParams.token),

  functionsVersion: normalizeOptionalString(
    appParams.functionsVersion,
  ),

  appBaseUrl: normalizeOptionalString(
    appParams.appBaseUrl,
  ),

  /*
  | O projeto atual utiliza o mesmo domínio para o backend.
  | Manter uma string vazia preserva o comportamento gerado pela Base44.
  */

  serverUrl: '',

  /*
  | As rotas públicas, como login, cadastro, termos e privacidade,
  | precisam abrir antes da autenticação.
  |
  | A proteção das páginas privadas é realizada pelo ProtectedRoute.
  */

  requiresAuth: false,
};

/*
|--------------------------------------------------------------------------
| Validação da configuração
|--------------------------------------------------------------------------
*/

function validateClientConfiguration(configuration) {
  const missingValues = [];

  if (!configuration.appId) {
    missingValues.push('VITE_BASE44_APP_ID');
  }

  if (
    missingValues.length > 0
    && import.meta.env.DEV
  ) {
    console.warn(
      [
        'Configuração incompleta do cliente Base44.',
        `Variáveis ausentes: ${missingValues.join(', ')}.`,
        'O aplicativo pode não conseguir acessar autenticação ou entidades.',
      ].join(' '),
    );
  }
}

/*
|--------------------------------------------------------------------------
| Criação do cliente
|--------------------------------------------------------------------------
*/

function createBase44Client() {
  validateClientConfiguration(clientConfiguration);

  return createClient(clientConfiguration);
}

/*
|--------------------------------------------------------------------------
| Instância única
|--------------------------------------------------------------------------
|
| Em produção o módulo normalmente é executado apenas uma vez.
| Durante hot reload, reutilizamos a instância anterior.
|
*/

function getBase44Client() {
  if (
    typeof globalThis !== 'undefined'
    && globalThis[GLOBAL_CLIENT_KEY]
  ) {
    return globalThis[GLOBAL_CLIENT_KEY];
  }

  const client = createBase44Client();

  if (typeof globalThis !== 'undefined') {
    globalThis[GLOBAL_CLIENT_KEY] = client;
  }

  return client;
}

/*
|--------------------------------------------------------------------------
| Cliente compartilhado
|--------------------------------------------------------------------------
|
| Todas as páginas, hooks e componentes devem importar esta mesma instância:
|
| import { base44 } from '@/api/base44Client';
|
*/

export const base44 = getBase44Client();

export default base44;