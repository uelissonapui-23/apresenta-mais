/*
|--------------------------------------------------------------------------
| Ambiente
|--------------------------------------------------------------------------
*/

const isBrowser = (
  typeof window !== 'undefined'
  && typeof document !== 'undefined'
);

/*
|--------------------------------------------------------------------------
| Armazenamento seguro
|--------------------------------------------------------------------------
|
| Alguns navegadores podem bloquear o localStorage, especialmente em
| modo privado, ambientes incorporados ou políticas restritivas.
|
| Este adaptador mantém o aplicativo funcionando mesmo quando o
| armazenamento do navegador não estiver disponível.
|
*/

const memoryStorage = new Map();

const safeStorage = {
  getItem(key) {
    if (!key) {
      return null;
    }

    if (isBrowser) {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        console.warn(
          `Não foi possível ler "${key}" do localStorage:`,
          error,
        );
      }
    }

    return memoryStorage.has(key)
      ? memoryStorage.get(key)
      : null;
  },

  setItem(key, value) {
    if (
      !key
      || value === undefined
      || value === null
      || String(value).trim() === ''
    ) {
      return;
    }

    const normalizedValue = String(value);

    if (isBrowser) {
      try {
        window.localStorage.setItem(
          key,
          normalizedValue,
        );

        return;
      } catch (error) {
        console.warn(
          `Não foi possível salvar "${key}" no localStorage:`,
          error,
        );
      }
    }

    memoryStorage.set(
      key,
      normalizedValue,
    );
  },

  removeItem(key) {
    if (!key) {
      return;
    }

    if (isBrowser) {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.warn(
          `Não foi possível remover "${key}" do localStorage:`,
          error,
        );
      }
    }

    memoryStorage.delete(key);
  },
};

/*
|--------------------------------------------------------------------------
| Normalização
|--------------------------------------------------------------------------
*/

function normalizeValue(value) {
  if (
    value === undefined
    || value === null
  ) {
    return null;
  }

  const normalizedValue = String(value).trim();

  return normalizedValue || null;
}

function toSnakeCase(value) {
  return String(value || '')
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_/, '')
    .toLowerCase();
}

/*
|--------------------------------------------------------------------------
| Informações da URL
|--------------------------------------------------------------------------
*/

function getCurrentUrl() {
  if (!isBrowser) {
    return '';
  }

  return window.location.href;
}

function getUrlSearchParams() {
  if (!isBrowser) {
    return new URLSearchParams();
  }

  return new URLSearchParams(
    window.location.search,
  );
}

function replaceUrlSearchParams(urlParams) {
  if (!isBrowser) {
    return;
  }

  const queryString = urlParams.toString();

  const newUrl = [
    window.location.pathname,
    queryString ? `?${queryString}` : '',
    window.location.hash || '',
  ].join('');

  const currentUrl = [
    window.location.pathname,
    window.location.search,
    window.location.hash || '',
  ].join('');

  if (newUrl === currentUrl) {
    return;
  }

  try {
    window.history.replaceState(
      window.history.state,
      document.title,
      newUrl,
    );
  } catch (error) {
    console.warn(
      'Não foi possível remover parâmetros sensíveis da URL:',
      error,
    );
  }
}

/*
|--------------------------------------------------------------------------
| Leitura de parâmetros do aplicativo
|--------------------------------------------------------------------------
|
| Ordem de prioridade:
|
| 1. Parâmetro recebido pela URL.
| 2. Valor padrão, normalmente variável de ambiente.
| 3. Valor salvo anteriormente no localStorage.
|
| Essa ordem preserva o comportamento original da Base44.
|
*/

function getAppParamValue(
  paramName,
  {
    defaultValue = undefined,
    removeFromUrl = false,
    persistDefault = true,
  } = {},
) {
  const normalizedParamName = normalizeValue(
    paramName,
  );

  if (!normalizedParamName) {
    return normalizeValue(defaultValue);
  }

  const storageKey = (
    `base44_${toSnakeCase(normalizedParamName)}`
  );

  const urlParams = getUrlSearchParams();

  const searchValue = normalizeValue(
    urlParams.get(normalizedParamName),
  );

  /*
  |--------------------------------------------------------------------------
  | Valor recebido pela URL
  |--------------------------------------------------------------------------
  */

  if (searchValue) {
    safeStorage.setItem(
      storageKey,
      searchValue,
    );

    if (removeFromUrl) {
      urlParams.delete(normalizedParamName);
      replaceUrlSearchParams(urlParams);
    }

    return searchValue;
  }

  /*
  |--------------------------------------------------------------------------
  | Remover parâmetro vazio ou já consumido
  |--------------------------------------------------------------------------
  */

  if (
    removeFromUrl
    && urlParams.has(normalizedParamName)
  ) {
    urlParams.delete(normalizedParamName);
    replaceUrlSearchParams(urlParams);
  }

  /*
  |--------------------------------------------------------------------------
  | Valor padrão
  |--------------------------------------------------------------------------
  */

  const normalizedDefaultValue = normalizeValue(
    defaultValue,
  );

  if (normalizedDefaultValue) {
    if (persistDefault) {
      safeStorage.setItem(
        storageKey,
        normalizedDefaultValue,
      );
    }

    return normalizedDefaultValue;
  }

  /*
  |--------------------------------------------------------------------------
  | Valor armazenado
  |--------------------------------------------------------------------------
  */

  return normalizeValue(
    safeStorage.getItem(storageKey),
  );
}

/*
|--------------------------------------------------------------------------
| Limpeza de tokens
|--------------------------------------------------------------------------
*/

function clearStoredAccessTokens() {
  [
    'base44_access_token',
    'base44_token',
    'token',
    'access_token',
  ].forEach((key) => {
    safeStorage.removeItem(key);
  });
}

/*
|--------------------------------------------------------------------------
| Parâmetros completos
|--------------------------------------------------------------------------
*/

function getAppParams() {
  const shouldClearAccessToken = (
    getAppParamValue(
      'clear_access_token',
      {
        persistDefault: false,
      },
    ) === 'true'
  );

  if (shouldClearAccessToken) {
    clearStoredAccessTokens();

    if (isBrowser) {
      const urlParams = getUrlSearchParams();

      if (urlParams.has('clear_access_token')) {
        urlParams.delete('clear_access_token');
        replaceUrlSearchParams(urlParams);
      }
    }
  }

  const appId = getAppParamValue(
    'app_id',
    {
      defaultValue: import.meta.env.VITE_BASE44_APP_ID,
    },
  );

  const token = shouldClearAccessToken
    ? null
    : getAppParamValue(
        'access_token',
        {
          removeFromUrl: true,
        },
      );

  const functionsVersion = getAppParamValue(
    'functions_version',
    {
      defaultValue:
        import.meta.env.VITE_BASE44_FUNCTIONS_VERSION,
    },
  );

  const appBaseUrl = getAppParamValue(
    'app_base_url',
    {
      defaultValue:
        import.meta.env.VITE_BASE44_APP_BASE_URL,
    },
  );

  const fromUrl = getAppParamValue(
    'from_url',
    {
      defaultValue: getCurrentUrl(),
      persistDefault: false,
    },
  );

  return {
    appId,
    token,
    functionsVersion,
    appBaseUrl,
    fromUrl,
  };
}

/*
|--------------------------------------------------------------------------
| Parâmetros exportados
|--------------------------------------------------------------------------
|
| O objeto permanece imutável durante a execução atual.
| Caso um novo token seja recebido depois, a autenticação deve ser
| atualizada pelo AuthContext ou pelo redirecionamento oficial da Base44.
|
*/

export const appParams = Object.freeze({
  ...getAppParams(),
});

export {
  clearStoredAccessTokens,
  getAppParamValue,
  safeStorage,
};

export default appParams;