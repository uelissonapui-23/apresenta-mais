import React from 'react';

import {
  Link,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';

import {
  ArrowLeft,
  Home,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

import useCurrentUser from '@/hooks/useCurrentUser';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';

function AdminRouteLoading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 text-center text-muted-foreground">
        <div className="relative h-11 w-11">
          <div className="absolute inset-0 rounded-full border-4 border-muted" />

          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />

          <LockKeyhole className="absolute inset-0 m-auto h-4 w-4 text-primary" />
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">
            Verificando acesso administrativo...
          </p>

          <p className="mt-1 text-xs">
            Aguarde alguns instantes.
          </p>
        </div>
      </div>
    </div>
  );
}

function AdminAccessError() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-4 py-10">
      <Card className="w-full border-destructive/30">
        <CardContent className="p-6 text-center sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>

          <h1 className="mt-5 text-xl font-bold sm:text-2xl">
            Não foi possível verificar sua permissão
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Ocorreu uma falha temporária ao consultar seu perfil.
            Atualize a página e tente novamente.
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>

            <Button
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar página
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-4 py-10">
      <Card className="w-full overflow-hidden border-amber-300/60">
        <CardContent className="p-6 text-center sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/40">
            <LockKeyhole className="h-8 w-8 text-amber-700 dark:text-amber-300" />
          </div>

          <div className="mt-5 flex justify-center">
            <Badge
              variant="outline"
              className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300"
            >
              Área restrita
            </Badge>
          </div>

          <h1 className="mt-4 text-xl font-bold sm:text-2xl">
            Você não possui acesso administrativo
          </h1>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Esta área é exclusiva para administradores ativos do
            Apresenta+. Seu perfil continua com acesso normal às
            apresentações, modelos, biblioteca e demais recursos.
          </p>

          <Alert className="mx-auto mt-6 max-w-lg text-left">
            <ShieldAlert className="h-4 w-4" />

            <AlertTitle>
              O acesso não depende apenas do menu
            </AlertTitle>

            <AlertDescription>
              Mesmo digitando diretamente uma URL administrativa,
              o sistema verifica a função e o status do perfil atual.
            </AlertDescription>
          </Alert>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>

            <Button asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Ir para o início
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminRoute({
  children,
  redirectUnauthorized = false,
}) {
  const location = useLocation();

  const {
    user,
    profile,
    loading,
    error,
  } = useCurrentUser();

  /*
  |--------------------------------------------------------------------------
  | Carregamento
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return <AdminRouteLoading />;
  }

  /*
  |--------------------------------------------------------------------------
  | Usuário não autenticado
  |--------------------------------------------------------------------------
  |
  | Normalmente o AdminRoute já está dentro do ProtectedRoute.
  | Esta verificação adicional protege o componente caso sua posição
  | nas rotas seja alterada futuramente.
  |
  */

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search || ''}`,
        }}
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Erro ao carregar o perfil
  |--------------------------------------------------------------------------
  |
  | Nunca autorizar acesso administrativo quando o perfil não pôde
  | ser verificado com segurança.
  |
  */

  if (error) {
    return <AdminAccessError />;
  }

  /*
  |--------------------------------------------------------------------------
  | Perfil ainda não disponível
  |--------------------------------------------------------------------------
  |
  | Se a autenticação carregou, mas o perfil ainda não existe, o usuário
  | não pode receber acesso administrativo.
  |
  */

  if (!profile) {
    if (redirectUnauthorized) {
      return (
        <Navigate
          to="/"
          replace
        />
      );
    }

    return <AccessDenied />;
  }

  /*
  |--------------------------------------------------------------------------
  | Conta inativa
  |--------------------------------------------------------------------------
  */

  if (profile.active === false) {
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
  | Verificação administrativa
  |--------------------------------------------------------------------------
  |
  | A comparação é normalizada para evitar falha por espaços ou letras
  | maiúsculas e minúsculas.
  |
  */

  const normalizedRole = String(
    profile.role || '',
  )
    .trim()
    .toLowerCase();

  const isAdmin = normalizedRole === 'admin';

  if (!isAdmin) {
    if (redirectUnauthorized) {
      return (
        <Navigate
          to="/"
          replace
        />
      );
    }

    return <AccessDenied />;
  }

  /*
  |--------------------------------------------------------------------------
  | Acesso autorizado
  |--------------------------------------------------------------------------
  */

  if (children) {
    return children;
  }

  return <Outlet />;
}