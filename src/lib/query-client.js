import {
  QueryClient,
} from '@tanstack/react-query';

/*
|--------------------------------------------------------------------------
| Identificação de erros
|--------------------------------------------------------------------------
*/

function getErrorStatus(error) {
  return (
    error?.status
    || error?.response?.status
    || error?.data?.status
    || error?.response?.data?.status
    || null
  );
}

function getErrorReason(error) {
  return (
    error?.type
    || error?.data?.reason
    || error?.data?.extra_data?.reason
    || error?.response?.data?.reason
    || error?.response?.data?.extra_data?.reason
    || null
  );
}

function isNetworkError(error) {
  const message = String(
    error?.message || '',
  ).toLowerCase();

  return (
    error?.name === 'NetworkError'
    || message.includes('network')
    || message.includes('failed to fetch')
    || message.includes('load failed')
    || message.includes('connection')
    || error?.code === 'ERR_NETWORK'
  );
}

/*
|--------------------------------------------------------------------------
| Política de nova tentativa para consultas
|--------------------------------------------------------------------------
|
| Não repetimos automaticamente erros que não serão resolvidos por uma
| nova tentativa, como falta de autenticação, acesso negado, registro
| inexistente ou erro de validação.
|
*/

function shouldRetryQuery(failureCount, error) {
  const status = getErrorStatus(error);
  const reason = getErrorReason(error);

  if (
    status === 400
    || status === 401
    || status === 403
    || status === 404
    || status === 409
    || status === 422
  ) {
    return false;
  }

  if (
    reason === 'auth_required'
    || reason === 'user_not_registered'
    || reason === 'permission_denied'
    || reason === 'validation_error'
  ) {
    return false;
  }

  /*
  | Falhas temporárias de internet ou servidor podem receber
  | uma nova tentativa.
  */

  if (
    isNetworkError(error)
    || status === 408
    || status === 425
    || status === 429
    || status === 500
    || status === 502
    || status === 503
    || status === 504
  ) {
    return failureCount < 1;
  }

  return false;
}

/*
|--------------------------------------------------------------------------
| Tempo entre tentativas
|--------------------------------------------------------------------------
*/

function getRetryDelay(attemptIndex) {
  return Math.min(
    1000 * (2 ** attemptIndex),
    5000,
  );
}

/*
|--------------------------------------------------------------------------
| Cliente React Query
|--------------------------------------------------------------------------
|
| No projeto atual, o React Query é utilizado principalmente para manter
| dados compartilhados, como UserProfile, evitando várias consultas iguais
| quando Layout, ProtectedRoute e páginas carregam ao mesmo tempo.
|
*/

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      /*
      | Durante 30 segundos, os dados são considerados recentes.
      | Isso reduz consultas repetidas ao navegar entre páginas.
      */

      staleTime: 30 * 1000,

      /*
      | Dados sem observadores permanecem no cache por cinco minutos.
      */

      gcTime: 5 * 60 * 1000,

      /*
      | Não refazer consultas sempre que o usuário alternar entre
      | o navegador e outro aplicativo.
      */

      refetchOnWindowFocus: false,

      /*
      | Quando a internet voltar, consultas ativas podem ser atualizadas.
      */

      refetchOnReconnect: true,

      /*
      | Ao montar novamente um componente, somente dados antigos
      | serão consultados outra vez.
      */

      refetchOnMount: true,

      /*
      | Mantém o comportamento padrão de consultas conectadas à internet.
      */

      networkMode: 'online',

      /*
      | Nova tentativa apenas para falhas realmente temporárias.
      */

      retry: shouldRetryQuery,
      retryDelay: getRetryDelay,

      /*
      | Mantém referências anteriores quando o conteúdo não mudou,
      | reduzindo renderizações desnecessárias.
      */

      structuralSharing: true,
    },

    mutations: {
      /*
      | Operações de escrita não devem ser repetidas automaticamente.
      |
      | Repetir uma criação, duplicação ou exclusão pode causar:
      | - registros duplicados;
      | - exclusões repetidas;
      | - ordem incorreta;
      | - sessões duplicadas.
      */

      retry: false,
      networkMode: 'online',
    },
  },
});

/*
|--------------------------------------------------------------------------
| Limpeza de dados da conta
|--------------------------------------------------------------------------
|
| Deve ser usada ao sair da conta para impedir que dados do usuário
| anterior permaneçam em memória.
|
*/

export function clearQueryCache() {
  queryClientInstance.clear();
}

/*
|--------------------------------------------------------------------------
| Atualização de uma consulta específica
|--------------------------------------------------------------------------
*/

export async function invalidateQuery(queryKey) {
  if (!queryKey) {
    return;
  }

  const normalizedKey = Array.isArray(queryKey)
    ? queryKey
    : [queryKey];

  await queryClientInstance.invalidateQueries({
    queryKey: normalizedKey,
  });
}

/*
|--------------------------------------------------------------------------
| Remoção de consultas de um usuário
|--------------------------------------------------------------------------
|
| Útil quando o perfil é atualizado, a conta é desativada ou o usuário
| troca de sessão.
|
*/

export function removeUserQueries(userId) {
  if (!userId) {
    return;
  }

  queryClientInstance.removeQueries({
    predicate: (query) => (
      Array.isArray(query.queryKey)
      && query.queryKey.includes(userId)
    ),
  });
}

export default queryClientInstance;