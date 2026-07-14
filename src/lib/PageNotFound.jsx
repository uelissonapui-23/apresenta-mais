import React, { useMemo } from 'react';

import {
  ArrowLeft,
  FileQuestion,
  Home,
  LayoutDashboard,
  Search,
} from 'lucide-react';

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';

const ROUTE_SUGGESTIONS = [
  {
    label: 'Início',
    description: 'Voltar ao painel principal.',
    path: '/',
    icon: Home,
  },
  {
    label: 'Apresentações',
    description: 'Abrir suas apresentações.',
    path: '/presentations',
    icon: LayoutDashboard,
  },
  {
    label: 'Modelos',
    description: 'Explorar estruturas prontas.',
    path: '/templates',
    icon: Search,
  },
];

function normalizePath(pathname) {
  return String(pathname || '')
    .trim()
    .toLowerCase();
}

function getContextualMessage(pathname) {
  const normalizedPath = normalizePath(pathname);

  if (
    normalizedPath.startsWith('/admin')
  ) {
    return {
      title: 'Página administrativa não encontrada',
      description:
        'O endereço administrativo informado não existe, foi alterado ou não está mais disponível.',
    };
  }

  if (
    normalizedPath.includes('presentation')
    || normalizedPath.includes('apresentacao')
    || normalizedPath.includes('editor')
  ) {
    return {
      title: 'Apresentação não encontrada',
      description:
        'A apresentação ou página solicitada pode ter sido removida, arquivada ou o endereço pode estar incorreto.',
    };
  }

  if (
    normalizedPath.includes('rehearsal')
    || normalizedPath.includes('ensaio')
  ) {
    return {
      title: 'Ensaio não encontrado',
      description:
        'Não encontramos o ensaio solicitado. Ele pode ter sido encerrado ou o endereço pode estar incorreto.',
    };
  }

  if (
    normalizedPath.includes('present')
    || normalizedPath.includes('apresentar')
  ) {
    return {
      title: 'Modo apresentação não encontrado',
      description:
        'Não foi possível localizar a apresentação solicitada para iniciar ou continuar a sessão.',
    };
  }

  return {
    title: 'Página não encontrada',
    description:
      'O endereço informado não existe, foi alterado ou não está mais disponível.',
  };
}

export default function PageNotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  const message = useMemo(
    () => getContextualMessage(location.pathname),
    [location.pathname],
  );

  const displayedPath = useMemo(() => {
    const fullPath = `${location.pathname}${location.search || ''}`;

    if (fullPath.length <= 90) {
      return fullPath;
    }

    return `${fullPath.slice(0, 87)}...`;
  }, [
    location.pathname,
    location.search,
  ]);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/', {
      replace: true,
    });
  };

  return (
    <div className="flex min-h-screen min-w-0 items-center justify-center overflow-x-hidden bg-muted/20 px-4 py-8 sm:px-6">
      <div className="w-full max-w-3xl">
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardContent className="p-0">
            <div className="grid min-h-[520px] lg:grid-cols-[0.9fr_1.1fr]">
              <div className="hidden items-center justify-center bg-primary/5 p-8 lg:flex">
                <div className="relative flex h-60 w-60 items-center justify-center">
                  <div className="absolute h-56 w-56 rounded-full border border-primary/10" />

                  <div className="absolute h-40 w-40 rounded-full border border-primary/20" />

                  <div className="absolute h-24 w-24 rounded-3xl bg-primary/10" />

                  <FileQuestion className="relative h-14 w-14 text-primary" />

                  <span className="absolute bottom-2 text-7xl font-black tracking-tight text-primary/10">
                    404
                  </span>
                </div>
              </div>

              <div className="flex min-w-0 flex-col justify-center p-6 sm:p-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 lg:hidden">
                  <FileQuestion className="h-7 w-7 text-primary" />
                </div>

                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-primary lg:mt-0">
                  Erro 404
                </p>

                <h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">
                  {message.title}
                </h1>

                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                  {message.description}
                </p>

                <div className="mt-5 min-w-0 rounded-xl border bg-muted/40 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Endereço solicitado
                  </p>

                  <p className="mt-1 break-all font-mono text-xs text-foreground">
                    {displayedPath || '/'}
                  </p>
                </div>

                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoBack}
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

                <div className="mt-8 border-t pt-6">
                  <p className="text-sm font-semibold">
                    Você também pode acessar:
                  </p>

                  <div className="mt-3 grid gap-2">
                    {ROUTE_SUGGESTIONS.map((item) => {
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="group flex min-w-0 items-center gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/50"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                            <Icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {item.label}
                            </p>

                            <p className="truncate text-xs text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Nenhum dado foi alterado. Verifique o endereço ou retorne
          para uma página válida.
        </p>
      </div>
    </div>
  );
}