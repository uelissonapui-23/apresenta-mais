import React, {
  Component,
  StrictMode,
} from 'react';

import ReactDOM from 'react-dom/client';

import {
  AlertTriangle,
  Home,
  RefreshCw,
} from 'lucide-react';

import App from '@/App.jsx';
import '@/index.css';

/*
|--------------------------------------------------------------------------
| Identificação do aplicativo
|--------------------------------------------------------------------------
*/

const APP_NAME = 'Apresenta+';

/*
|--------------------------------------------------------------------------
| Registro de falhas globais
|--------------------------------------------------------------------------
|
| Esses registros ajudam durante os testes na Base44 e posteriormente
| no VS Code. Nenhum detalhe técnico é exibido para o usuário.
|
*/

function registerGlobalErrorHandlers() {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleWindowError = (event) => {
    console.error(
      `[${APP_NAME}] Erro global não tratado:`,
      event.error || event.message,
    );
  };

  const handleUnhandledRejection = (event) => {
    console.error(
      `[${APP_NAME}] Promise rejeitada sem tratamento:`,
      event.reason,
    );
  };

  window.addEventListener(
    'error',
    handleWindowError,
  );

  window.addEventListener(
    'unhandledrejection',
    handleUnhandledRejection,
  );

  return () => {
    window.removeEventListener(
      'error',
      handleWindowError,
    );

    window.removeEventListener(
      'unhandledrejection',
      handleUnhandledRejection,
    );
  };
}

/*
|--------------------------------------------------------------------------
| Tela para falha crítica
|--------------------------------------------------------------------------
|
| Esta tela é usada somente quando ocorre um erro fora do tratamento
| normal das páginas e componentes.
|
*/

function CriticalErrorScreen({
  error,
  onRetry,
}) {
  const handleGoHome = () => {
    window.location.assign('/');
  };

  return (
    <div className="flex min-h-screen min-w-0 items-center justify-center overflow-x-hidden bg-muted/20 px-4 py-8">
      <div className="w-full max-w-lg rounded-3xl border border-destructive/20 bg-background p-6 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-destructive">
          Falha inesperada
        </p>

        <h1 className="mt-2 text-2xl font-bold">
          O aplicativo encontrou um problema
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
          Seus dados não foram apagados. Atualize o aplicativo para
          tentar carregar novamente.
        </p>

        {import.meta.env.DEV && error?.message && (
          <div className="mt-5 max-h-36 overflow-auto rounded-xl border bg-muted/40 p-3 text-left">
            <p className="text-xs font-medium text-muted-foreground">
              Informação para desenvolvimento
            </p>

            <p className="mt-1 break-words font-mono text-xs text-destructive">
              {error.message}
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleGoHome}
            className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Home className="mr-2 h-4 w-4" />
            Ir para o início
          </button>

          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Recarregar
          </button>
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          Caso o problema continue, feche o aplicativo e abra
          novamente.
        </p>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Limite de erro global
|--------------------------------------------------------------------------
|
| Captura falhas de renderização que escaparem das páginas.
| Erros esperados de API continuam sendo tratados localmente.
|
*/

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      `[${APP_NAME}] Falha crítica de renderização:`,
      error,
      errorInfo,
    );
  }

  handleRetry = () => {
    /*
    | Recarregar completamente é mais seguro aqui, porque uma falha
    | global pode ter deixado contextos ou caches em estado inconsistente.
    */

    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <CriticalErrorScreen
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

/*
|--------------------------------------------------------------------------
| Encontrar o elemento raiz
|--------------------------------------------------------------------------
*/

function getRootElement() {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error(
      'O elemento raiz "#root" não foi encontrado no index.html.',
    );
  }

  return rootElement;
}

/*
|--------------------------------------------------------------------------
| Inicialização
|--------------------------------------------------------------------------
*/

function bootstrapApplication() {
  registerGlobalErrorHandlers();

  const rootElement = getRootElement();
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>,
  );
}

bootstrapApplication();