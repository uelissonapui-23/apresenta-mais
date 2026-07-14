import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCurrentUser from '@/hooks/useCurrentUser';

export default function PageNotFound() {
  const navigate = useNavigate();
  const { user, loading } = useCurrentUser();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setChecked(true);
  }, []);

  const goHome = () => {
    if (user) {
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  if (loading || !checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-muted/20 px-4 py-8">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FileQuestion className="h-8 w-8" />
        </div>

        <p className="text-6xl font-light text-muted-foreground/40 sm:text-7xl">404</p>

        <h1 className="mt-4 text-xl font-bold sm:text-2xl">
          Página não encontrada
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          A página que você procura não existe ou foi movida. Verifique o endereço
          digitado ou volte para uma página conhecida.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={goHome} className="w-full sm:w-auto">
            <Home className="mr-2 h-4 w-4" />
            Ir para o início
          </Button>
        </div>
      </div>
    </main>
  );
}