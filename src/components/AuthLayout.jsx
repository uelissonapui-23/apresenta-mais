import React from 'react';

import BrandLogo from '@/components/BrandLogo';

import {
  Link,
} from 'react-router-dom';


/*
|--------------------------------------------------------------------------
| Utilitário de classes
|--------------------------------------------------------------------------
*/

function joinClasses(...classes) {
  return classes
    .filter(Boolean)
    .join(' ');
}

/*
|--------------------------------------------------------------------------
| Cabeçalho da autenticação
|--------------------------------------------------------------------------
*/

function AuthHeader({
  icon: Icon,
  title,
  subtitle,
  showBrand,
}) {
  return (
    <div className="text-center">
      {showBrand && (
        <Link
          to="/"
          className="brand-focus mx-auto mb-6 inline-flex rounded-2xl px-2 py-1 transition-opacity hover:opacity-80"
          aria-label="Ir para a página inicial do Apresenta+"
        >
          <BrandLogo
            markClassName="h-11 w-11"
            nameClassName="text-lg"
          />
        </Link>
      )}

      {Icon && (
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Icon
            className="h-7 w-7"
            aria-hidden="true"
          />
        </div>
      )}

      <h1
        className={joinClasses(
          'break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl',
          Icon ? 'mt-5' : '',
        )}
      >
        {title}
      </h1>

      {subtitle && (
        <p className="mx-auto mt-2 max-w-md break-words text-sm leading-6 text-muted-foreground sm:text-base">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Layout de autenticação
|--------------------------------------------------------------------------
|
| Propriedades disponíveis:
|
| icon:
|   Ícone exibido acima do título.
|
| title:
|   Título principal.
|
| subtitle:
|   Texto de apoio.
|
| footer:
|   Conteúdo exibido abaixo do cartão.
|
| children:
|   Formulário ou conteúdo principal.
|
| showBrand:
|   Exibe ou oculta a marca Apresenta+.
|
| maxWidth:
|   Permite alterar a largura máxima quando necessário.
|
| cardClassName:
|   Classes adicionais para o cartão.
|
| contentClassName:
|   Classes adicionais para o conteúdo interno.
|
*/

export default function AuthLayout({
  icon: Icon,
  title,
  subtitle,
  footer,
  children,
  showBrand = true,
  maxWidth = 'max-w-md',
  cardClassName = '',
  contentClassName = '',
}) {
  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-muted/20">
      <div className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <main
          className={joinClasses(
            'w-full min-w-0',
            maxWidth,
          )}
        >
          <AuthHeader
            icon={Icon}
            title={title}
            subtitle={subtitle}
            showBrand={showBrand}
          />

          <section
            className={joinClasses(
              'mt-7 min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:mt-8',
              cardClassName,
            )}
            aria-label={title || 'Autenticação'}
          >
            <div
              className={joinClasses(
                'min-w-0 p-5 sm:p-7 md:p-8',
                contentClassName,
              )}
            >
              {children}
            </div>
          </section>

          {footer && (
            <footer className="mx-auto mt-6 max-w-lg px-2 text-center text-sm leading-6 text-muted-foreground">
              {footer}
            </footer>
          )}

          <p className="mt-5 text-center text-[11px] text-muted-foreground/80">
            Seus dados são protegidos de acordo com nossas políticas.
          </p>
        </main>
      </div>
    </div>
  );
}