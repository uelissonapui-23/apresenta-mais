import React, {
  useState,
} from 'react';

import {
  AlertTriangle,
  ArrowLeft,
  LogIn,
  LogOut,
  Mail,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import { base44 } from '@/api/base44Client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';

const SUPPORT_EMAIL = 'suporte@apresentamais.app';

export default function UserNotRegisteredError({
  message,
  showBackButton = true,
}) {
  const navigate = useNavigate();

  const [loggingOut, setLoggingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState('');

  const handleRefresh = () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    setActionError('');

    window.location.reload();
  };

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    setActionError('');

    try {
      await base44.auth.logout(
        `${window.location.origin}/login`,
      );
    } catch (error) {
      console.error(
        'Erro ao sair da conta:',
        error,
      );

      setActionError(
        'Não foi possível sair da conta agora. Tente novamente.',
      );

      setLoggingOut(false);
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/login', {
      replace: true,
    });
  };

  return (
    <div className="flex min-h-screen min-w-0 items-center justify-center overflow-x-hidden bg-muted/20 px-4 py-8 sm:px-6">
      <div className="w-full max-w-2xl">
        <Card className="overflow-hidden border-amber-300/60 shadow-sm">
          <CardContent className="p-6 sm:p-10">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/40">
                <ShieldAlert className="h-8 w-8 text-amber-700 dark:text-amber-300" />
              </div>

              <div className="mt-5 flex justify-center">
                <Badge
                  variant="outline"
                  className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300"
                >
                  Acesso não liberado
                </Badge>
              </div>

              <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
                Esta conta ainda não possui acesso ao aplicativo
              </h1>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
                {message || (
                  'Você está autenticado, mas sua conta ainda não foi '
                  + 'registrada ou autorizada para usar o Apresenta+.'
                )}
              </p>
            </div>

            <Alert className="mt-7">
              <AlertTriangle className="h-4 w-4" />

              <AlertTitle>
                Verifique antes de solicitar acesso
              </AlertTitle>

              <AlertDescription>
                Confirme se você entrou com o e-mail correto. Caso esta
                seja sua conta principal, entre em contato com o
                responsável pelo aplicativo.
              </AlertDescription>
            </Alert>

            <div className="mt-6 rounded-2xl border bg-muted/30 p-4 sm:p-5">
              <h2 className="text-sm font-semibold">
                O que você pode fazer agora
              </h2>

              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <LogIn className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                  <p>
                    Confirme se entrou com a conta correta.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                  <p>
                    Solicite liberação pelo e-mail{' '}
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {SUPPORT_EMAIL}
                    </a>.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                  <p>
                    Caso sua conta tenha acabado de ser liberada,
                    atualize a página.
                  </p>
                </div>
              </div>
            </div>

            {actionError && (
              <Alert
                variant="destructive"
                className="mt-5"
              >
                <AlertTriangle className="h-4 w-4" />

                <AlertTitle>
                  Não foi possível concluir a ação
                </AlertTitle>

                <AlertDescription>
                  {actionError}
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-7 grid gap-2 sm:grid-cols-2">
              {showBackButton && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoBack}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${
                    refreshing ? 'animate-spin' : ''
                  }`}
                />
                Atualizar página
              </Button>

              <Button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="sm:col-span-2"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {loggingOut
                  ? 'Saindo...'
                  : 'Entrar com outra conta'}
              </Button>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
              Nenhuma apresentação ou conteúdo foi apagado. O acesso
              depende apenas da liberação da conta correta.
            </p>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <Link
            to="/terms"
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            Termos de Uso
          </Link>

          <span className="mx-2 text-muted-foreground">
            •
          </span>

          <Link
            to="/privacy"
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            Política de Privacidade
          </Link>
        </div>
      </div>
    </div>
  );
}