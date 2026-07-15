import { useEffect } from 'react';

import {
  useLocation,
  useNavigationType,
} from 'react-router-dom';

/*
|--------------------------------------------------------------------------
| Configurações
|--------------------------------------------------------------------------
|
| Páginas carregadas com React.lazy podem levar alguns instantes para
| renderizar o elemento indicado por uma âncora.
|
| Por isso, o componente tenta localizar o elemento algumas vezes antes
| de desistir.
|
*/

const HASH_SCROLL_ATTEMPTS = 12;
const HASH_SCROLL_INTERVAL = 80;

/*
|--------------------------------------------------------------------------
| Normalização da âncora
|--------------------------------------------------------------------------
*/

function getHashId(hash) {
  const rawId = String(hash || '')
    .replace(/^#/, '')
    .trim();

  if (!rawId) {
    return '';
  }

  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
}

/*
|--------------------------------------------------------------------------
| Preferência de movimento reduzido
|--------------------------------------------------------------------------
*/

function prefersReducedMotion() {
  if (
    typeof window === 'undefined'
    || typeof window.matchMedia !== 'function'
  ) {
    return false;
  }

  return window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
}

/*
|--------------------------------------------------------------------------
| Rolagem até uma âncora
|--------------------------------------------------------------------------
*/

function scrollToHashElement(
  elementId,
  {
    attempt = 0,
    onTimer,
  } = {},
) {
  if (
    typeof document === 'undefined'
    || !elementId
  ) {
    return;
  }

  const targetElement = document.getElementById(
    elementId,
  );

  if (targetElement) {
    targetElement.scrollIntoView({
      behavior: prefersReducedMotion()
        ? 'auto'
        : 'smooth',

      block: 'start',
      inline: 'nearest',
    });

    /*
    | Garante que leitores de tela e navegação por teclado reconheçam
    | corretamente o conteúdo de destino.
    */

    if (!targetElement.hasAttribute('tabindex')) {
      targetElement.setAttribute(
        'tabindex',
        '-1',
      );

      targetElement.dataset.scrollTemporaryTabindex = 'true';
    }

    try {
      targetElement.focus({
        preventScroll: true,
      });
    } catch {
      // Alguns elementos ou navegadores podem não aceitar focus().
    }

    return;
  }

  if (attempt >= HASH_SCROLL_ATTEMPTS) {
    return;
  }

  const timerId = window.setTimeout(() => {
    scrollToHashElement(
      elementId,
      {
        attempt: attempt + 1,
        onTimer,
      },
    );
  }, HASH_SCROLL_INTERVAL);

  onTimer?.(timerId);
}

/*
|--------------------------------------------------------------------------
| Componente
|--------------------------------------------------------------------------
*/

export default function ScrollToTop() {
  const {
    pathname,
    search,
    hash,
  } = useLocation();

  const navigationType = useNavigationType();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const pendingTimers = new Set();
    let cancelled = false;

    const registerTimer = (timerId) => {
      if (cancelled) {
        window.clearTimeout(timerId);
        return;
      }

      pendingTimers.add(timerId);
    };

    /*
    |--------------------------------------------------------------------------
    | Navegação para uma âncora
    |--------------------------------------------------------------------------
    */

    if (hash) {
      const elementId = getHashId(hash);

      /*
      | Um primeiro requestAnimationFrame permite que o React finalize
      | a atualização imediata da rota antes da busca pelo elemento.
      */

      const frameId = window.requestAnimationFrame(() => {
        if (cancelled) {
          return;
        }

        scrollToHashElement(
          elementId,
          {
            onTimer: registerTimer,
          },
        );
      });

      return () => {
        cancelled = true;

        window.cancelAnimationFrame(frameId);

        pendingTimers.forEach((timerId) => {
          window.clearTimeout(timerId);
        });

        pendingTimers.clear();
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Botões voltar e avançar
    |--------------------------------------------------------------------------
    |
    | Em navegação POP, o navegador normalmente restaura a posição
    | anterior da página. Não devemos forçar a tela para o topo.
    |
    */

    if (navigationType === 'POP') {
      return undefined;
    }

    /*
    |--------------------------------------------------------------------------
    | Nova rota
    |--------------------------------------------------------------------------
    |
    | Ao navegar por links internos, a nova página começa no topo.
    | "auto" possui compatibilidade mais ampla que "instant".
    |
    */

    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto',
      });

      /*
      | Algumas páginas podem possuir contêineres próprios de rolagem.
      | O elemento raiz também é restaurado como proteção adicional.
      */

      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
      }

      if (document.body) {
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [
    pathname,
    search,
    hash,
    navigationType,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Remover tabindex temporário
  |--------------------------------------------------------------------------
  |
  | Quando outra rota é aberta, removemos os atributos colocados apenas
  | para foco de acessibilidade.
  |
  */

  useEffect(() => {
    return () => {
      if (typeof document === 'undefined') {
        return;
      }

      document
        .querySelectorAll(
          '[data-scroll-temporary-tabindex="true"]',
        )
        .forEach((element) => {
          element.removeAttribute('tabindex');
          delete element.dataset.scrollTemporaryTabindex;
        });
    };
  }, [pathname]);

  return null;
}