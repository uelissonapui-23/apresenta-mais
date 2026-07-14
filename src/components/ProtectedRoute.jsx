import React, {
  useEffect,
  useMemo,
} from 'react';

import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';

import useCurrentUser from '@/hooks/useCurrentUser';

function ProtectedRouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />

        <div>
          <p className="text-sm font-medium">
            Verificando sua sessão...
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Aguarde alguns instantes.
          </p>
        </div>
      </div>
    </div>
  );
}

function AccessUnavailable() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          !
        </div>

        <h1 className="mt-4 text-xl font-bold">
          Não foi possível verificar sua conta
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Ocorreu uma falha temporária ao carregar seus dados.
          Atualize a página e tente novamente.
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Atualizar página
        </button>
      </div>
    </div>
  );
}

export default function ProtectedRoute({
  children,
  unauthenticatedElement = null,
  requireOnboarding = true,
}) {
  const location = useLocation();

  const {
    user,
    profile,
    loading,
    error,
  } = useCurrentUser();

  const currentPath = useMemo(
    () => (
      `${location.pathname}${location.search || ''}`
    ),
    [
      location.pathname,
      location.search,
    ],
  );

  /*
  |--------------------------------------------------------------------------
  | Preservar o endereço solicitado
  |--------------------------------------------------------------------------
  |
  | Caso o usuário tente abrir uma rota privada sem autenticação,
  | guardamos o endereço para retornar após o login.
  |
  */

  useEffect(() => {
    if (
      !loading
      && !user
      && location.pathname !== '/login'
    ) {
      try {
        window.sessionStorage.setItem(
          'apresenta_redirect_after_login',
          currentPath,
        );
      } catch (storageError) {
        console.warn(
          'Não foi possível salvar a rota de retorno:',
          storageError,
        );
      }
    }
  }, [
    currentPath,
    loading,
    location.pathname,
    user,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Carregamento
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return <ProtectedRouteLoading />;
  }

  /*
  |--------------------------------------------------------------------------
  | Falha ao carregar autenticação
  |--------------------------------------------------------------------------
  |
  | Evita ciclos de redirecionamento quando o serviço está indisponível.
  |
  */

  if (error && user) {
    return <AccessUnavailable />;
  }

  /*
  |--------------------------------------------------------------------------
  | Usuário não autenticado
  |--------------------------------------------------------------------------
  */

  if (!user) {
    if (unauthenticatedElement) {
      return unauthenticatedElement;
    }

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: currentPath,
        }}
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Conta inativa
  |--------------------------------------------------------------------------
  |
  | Quando existe perfil e ele está explicitamente inativo,
  | o acesso ao aplicativo deve ser bloqueado.
  |
  */

  if (
    profile
    && profile.active === false
  ) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          reason: 'inactive_account',
        }}
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Onboarding
  |--------------------------------------------------------------------------
  |
  | A própria rota /onboarding precisa continuar acessível.
  | Por isso não redirecionamos quando o usuário já está nela.
  |
  */

  const isOnboardingRoute = (
    location.pathname === '/onboarding'
  );

  const onboardingPending = (
    !profile
    || profile.onboarding_completed !== true
  );

  if (
    requireOnboarding
    && onboardingPending
    && !isOnboardingRoute
  ) {
    return (
      <Navigate
        to="/onboarding"
        replace
        state={{
          from: currentPath,
        }}
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Usuário já concluiu onboarding
  |--------------------------------------------------------------------------
  |
  | Evita que ele volte para /onboarding sem necessidade.
  |
  */

  if (
    isOnboardingRoute
    && profile?.onboarding_completed === true
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Conteúdo autorizado
  |--------------------------------------------------------------------------
  */

  if (children) {
    return children;
  }

  return <Outlet />;
}