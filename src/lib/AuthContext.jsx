import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { authProvider } from '@/services/authProvider';
import { getSupabaseClient } from '@/lib/supabaseClient';

const AuthContext = createContext(null);

function normalizeAuthError(error, fallbackType = 'unknown') {
  const status = (
    error?.status
    || error?.response?.status
    || error?.data?.status
    || null
  );

  const reason = (
    error?.data?.extra_data?.reason
    || error?.response?.data?.extra_data?.reason
    || error?.data?.reason
    || null
  );

  const message = (
    error?.message
    || error?.data?.message
    || error?.response?.data?.message
    || 'Não foi possível verificar a autenticação.'
  );

  if (
    status === 401
    || reason === 'auth_required'
  ) {
    return {
      type: 'auth_required',
      message: 'Autenticação necessária.',
      status,
      originalError: error,
    };
  }

  if (
    status === 403
    && reason === 'user_not_registered'
  ) {
    return {
      type: 'user_not_registered',
      message: 'O usuário ainda não está registrado neste aplicativo.',
      status,
      originalError: error,
    };
  }

  if (reason) {
    return {
      type: reason,
      message,
      status,
      originalError: error,
    };
  }

  return {
    type: fallbackType,
    message,
    status,
    originalError: error,
  };
}


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [
    isLoadingPublicSettings,
    setIsLoadingPublicSettings,
  ] = useState(true);

  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [
    appPublicSettings,
    setAppPublicSettings,
  ] = useState(null);

  const mountedRef = useRef(true);
  const appCheckPromiseRef = useRef(null);
  const authCheckPromiseRef = useRef(null);

  /*
  |--------------------------------------------------------------------------
  | Atualização segura dos estados de autenticação
  |--------------------------------------------------------------------------
  */

  const clearAuthenticatedUser = useCallback(() => {
    if (!mountedRef.current) {
      return;
    }

    setUser(null);
    setIsAuthenticated(false);
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Verificação do usuário autenticado
  |--------------------------------------------------------------------------
  |
  | Esta é a única função do contexto que consulta authProvider.me().
  | O hook useCurrentUser reutiliza o usuário daqui e consulta somente
  | o UserProfile.
  |
  */

  const checkUserAuth = useCallback(
    async ({
      force = false,
      preserveError = false,
    } = {}) => {
      if (
        authCheckPromiseRef.current
        && !force
      ) {
        return authCheckPromiseRef.current;
      }

      const authPromise = (async () => {
        if (mountedRef.current) {
          setIsLoadingAuth(true);
        }

        try {
          const currentUser = await authProvider.me();

          if (!mountedRef.current) {
            return currentUser;
          }

          setUser(currentUser || null);
          setIsAuthenticated(Boolean(currentUser));

          if (!preserveError) {
            setAuthError(null);
          }

          return currentUser || null;
        } catch (error) {
          console.error(
            'Falha ao verificar usuário autenticado:',
            error,
          );

          const normalizedError = normalizeAuthError(
            error,
            'auth_check_failed',
          );

          if (mountedRef.current) {
            clearAuthenticatedUser();
            setAuthError(normalizedError);
          }

          return null;
        } finally {
          if (mountedRef.current) {
            setIsLoadingAuth(false);
            setAuthChecked(true);
          }

          authCheckPromiseRef.current = null;
        }
      })();

      authCheckPromiseRef.current = authPromise;

      return authPromise;
    },
    [clearAuthenticatedUser],
  );

  /*
  |--------------------------------------------------------------------------
  | Configurações públicas do aplicativo
  |--------------------------------------------------------------------------
  |
  | Esta consulta informa o estado público do app e se a autenticação
  | é necessária. Mantemos o mesmo endpoint criado pela Base44, mas com
  | controle de concorrência e finalização garantida.
  |
  */

  const checkAppState = useCallback(
    async ({ force = false } = {}) => {
      if (
        appCheckPromiseRef.current
        && !force
      ) {
        return appCheckPromiseRef.current;
      }

      const appPromise = (async () => {
        if (mountedRef.current) {
          setIsLoadingPublicSettings(true);
          setAuthError(null);
        }

        try {
          const currentUser = await checkUserAuth({ force });
          const publicSettings = { auth_required: true, backend: 'supabase' };

          if (mountedRef.current) {
            setAppPublicSettings(publicSettings);
          }

          return { publicSettings, user: currentUser };
        } catch (error) {
          console.error(
            'Falha ao verificar o estado público do aplicativo:',
            error,
          );

          const normalizedError = normalizeAuthError(
            error,
            'app_state_failed',
          );

          if (mountedRef.current) {
            setAuthError(normalizedError);

            /*
            | Erros de autenticação não significam que o aplicativo
            | público falhou. Apenas indicam que o usuário precisa
            | entrar na conta.
            */

            if (
              normalizedError.type === 'auth_required'
              || normalizedError.type === 'user_not_registered'
            ) {
              clearAuthenticatedUser();
              setAuthChecked(true);
            }
          }

          return null;
        } finally {
          if (mountedRef.current) {
            setIsLoadingPublicSettings(false);
            setIsLoadingAuth(false);
            setAuthChecked(true);
          }

          appCheckPromiseRef.current = null;
        }
      })();

      appCheckPromiseRef.current = appPromise;

      return appPromise;
    },
    [
      checkUserAuth,
      clearAuthenticatedUser,
    ],
  );

  /*
  |--------------------------------------------------------------------------
  | Inicialização
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    mountedRef.current = true;

    checkAppState();

    return () => {
      mountedRef.current = false;
    };
  }, [checkAppState]);

  useEffect(() => {
    const { data } = getSupabaseClient().auth.onAuthStateChange(() => {
      if (mountedRef.current) {
        checkUserAuth({ force: true });
      }
    });

    return () => data?.subscription?.unsubscribe?.();
  }, [checkUserAuth]);

  /*
  |--------------------------------------------------------------------------
  | Logout
  |--------------------------------------------------------------------------
  |
  | A função é assíncrona para ser compatível com páginas que utilizam:
  |
  | await logout()
  |
  | shouldRedirect=true usa o redirecionamento oficial do SDK.
  |
  */

  const logout = useCallback(
    async (
      shouldRedirect = true,
      redirectUrl = null,
    ) => {
      if (mountedRef.current) {
        setIsLoadingAuth(true);
        setAuthError(null);
      }

      clearAuthenticatedUser();

      try {
        if (shouldRedirect) {
          const destination = (
            redirectUrl
            || `${window.location.origin}/login`
          );

          await authProvider.logout(destination);
        } else {
          await authProvider.logout();
        }
      } catch (error) {
        console.error(
          'Falha ao sair da conta:',
          error,
        );

        const normalizedError = normalizeAuthError(
          error,
          'logout_failed',
        );

        if (mountedRef.current) {
          setAuthError(normalizedError);
        }

        throw error;
      } finally {
        if (mountedRef.current) {
          setIsLoadingAuth(false);
          setAuthChecked(true);
        }
      }
    },
    [clearAuthenticatedUser],
  );

  /*
  |--------------------------------------------------------------------------
  | Redirecionar para login oficial
  |--------------------------------------------------------------------------
  */

  const navigateToLogin = useCallback(
    (returnUrl = null) => {
      const destination = (
        returnUrl
        || window.location.href
      );

      return authProvider.redirectToLogin(destination);
    },
    [],
  );

  /*
  |--------------------------------------------------------------------------
  | Atualizar sessão depois de login ou mudança externa
  |--------------------------------------------------------------------------
  */

  const refreshAuth = useCallback(
    async () => {
      setAuthError(null);

      return checkUserAuth({
        force: true,
      });
    },
    [checkUserAuth],
  );

  /*
  |--------------------------------------------------------------------------
  | Limpar erro manualmente
  |--------------------------------------------------------------------------
  */

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Valor compartilhado
  |--------------------------------------------------------------------------
  */

  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated,

      isLoadingAuth,
      isLoadingPublicSettings,

      loading: (
        isLoadingAuth
        || isLoadingPublicSettings
      ),

      authError,
      appPublicSettings,
      authChecked,

      checkUserAuth,
      checkAppState,
      refreshAuth,

      logout,
      navigateToLogin,
      clearAuthError,
    }),
    [
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      checkUserAuth,
      checkAppState,
      refreshAuth,
      logout,
      navigateToLogin,
      clearAuthError,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth deve ser utilizado dentro de um AuthProvider.',
    );
  }

  return context;
}

export default AuthContext;