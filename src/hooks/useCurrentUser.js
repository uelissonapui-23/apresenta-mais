import { useMemo } from 'react';
import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const PROFILE_QUERY_KEY = 'current-user-profile';

function normalizeRole(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function getFirstProfile(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return rows[0] || null;
}

function createReadableError(error) {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return error;
  }

  const message = (
    error?.message
    || error?.data?.message
    || 'Não foi possível carregar os dados do usuário.'
  );

  const normalizedError = new Error(message);

  if (error?.status) {
    normalizedError.status = error.status;
  }

  if (error?.type) {
    normalizedError.type = error.type;
  }

  return normalizedError;
}

export default function useCurrentUser() {
  const queryClient = useQueryClient();

  const {
    user,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    authChecked,
    checkUserAuth,
    checkAppState,
    logout,
    navigateToLogin,
  } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | Perfil do usuário
  |--------------------------------------------------------------------------
  |
  | O AuthContext já consulta base44.auth.me().
  | Portanto, este hook não deve consultar a autenticação novamente.
  |
  | O React Query mantém uma única consulta compartilhada entre todas
  | as páginas que utilizam useCurrentUser.
  |
  */

  const profileQuery = useQuery({
    queryKey: [
      PROFILE_QUERY_KEY,
      user?.id || null,
    ],

    queryFn: async () => {
      if (!user?.id) {
        return null;
      }

      const rows = await base44.entities.UserProfile.filter({
        user_id: user.id,
      });

      return getFirstProfile(rows);
    },

    enabled: Boolean(
      user?.id
      && isAuthenticated
      && authChecked,
    ),

    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const profile = profileQuery.data || null;

  /*
  |--------------------------------------------------------------------------
  | Estado de carregamento
  |--------------------------------------------------------------------------
  |
  | Enquanto o aplicativo verifica configurações públicas, autenticação
  | ou perfil, as páginas devem permanecer em estado de carregamento.
  |
  */

  const loading = Boolean(
    isLoadingPublicSettings
    || isLoadingAuth
    || (
      Boolean(user?.id)
      && profileQuery.isPending
    ),
  );

  /*
  |--------------------------------------------------------------------------
  | Erros
  |--------------------------------------------------------------------------
  |
  | O erro auth_required representa apenas que o usuário não está logado.
  | Isso não deve ser tratado como uma falha técnica pelo ProtectedRoute.
  |
  */

  const error = useMemo(() => {
    if (profileQuery.error) {
      return createReadableError(profileQuery.error);
    }

    if (
      authError
      && authError.type !== 'auth_required'
      && authError.type !== 'user_not_registered'
    ) {
      return createReadableError(authError);
    }

    return null;
  }, [
    authError,
    profileQuery.error,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Permissões
  |--------------------------------------------------------------------------
  |
  | O UserProfile é a fonte principal da função administrativa.
  | O papel existente no usuário autenticado fica apenas como fallback
  | para compatibilidade com contas antigas.
  |
  */

  const profileRole = normalizeRole(profile?.role);
  const userRole = normalizeRole(user?.role);

  const accountActive = (
    profile?.active !== false
  );

  const isAdmin = Boolean(
    accountActive
    && (
      profileRole === 'admin'
      || (
        !profile
        && userRole === 'admin'
      )
    ),
  );

  /*
  |--------------------------------------------------------------------------
  | Atualização do perfil
  |--------------------------------------------------------------------------
  |
  | Use refreshProfile depois de atualizar o UserProfile para que todas
  | as páginas recebam os novos dados imediatamente.
  |
  */

  const refreshProfile = async () => {
    if (!user?.id) {
      return null;
    }

    const result = await profileQuery.refetch();

    return result.data || null;
  };

  const invalidateProfile = async () => {
    if (!user?.id) {
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: [
        PROFILE_QUERY_KEY,
        user.id,
      ],
    });
  };

  const setProfileCache = (nextProfile) => {
    if (!user?.id) {
      return;
    }

    queryClient.setQueryData(
      [
        PROFILE_QUERY_KEY,
        user.id,
      ],
      nextProfile || null,
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Atualização completa da conta
  |--------------------------------------------------------------------------
  |
  | Revalida autenticação e, em seguida, recarrega o perfil.
  |
  */

  const refreshCurrentUser = async () => {
    await checkUserAuth();

    if (user?.id) {
      return refreshProfile();
    }

    return null;
  };

  return {
    user,
    profile,

    loading,
    error,

    isAuthenticated,
    authChecked,

    isAdmin,
    accountActive,

    profileLoading: profileQuery.isPending,
    profileFetching: profileQuery.isFetching,
    profileError: profileQuery.error || null,

    refreshProfile,
    invalidateProfile,
    setProfileCache,
    refreshCurrentUser,

    checkUserAuth,
    checkAppState,
    logout,
    navigateToLogin,
  };
}