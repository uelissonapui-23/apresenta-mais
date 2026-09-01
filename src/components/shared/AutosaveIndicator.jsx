import React, { useState } from 'react';
import { Check, Loader2, AlertCircle, Pencil } from 'lucide-react';

import { base44 } from '@/api/base44Client';

function getEditorPresentationId() {
  if (typeof window === 'undefined') return null;

  const match = window.location.pathname.match(/^\/presentations\/([^/]+)\/editor\/?$/);
  return match?.[1] || null;
}

export default function AutosaveIndicator({ status }) {
  const [renaming, setRenaming] = useState(false);
  const presentationId = getEditorPresentationId();

  const handleRename = async () => {
    if (!presentationId || renaming) return;

    const titleElement = document.querySelector('main')?.previousElementSibling?.querySelector('h1')
      || document.querySelector('h1');
    const currentTitle = titleElement?.textContent?.trim() || '';
    const nextTitle = window.prompt('Editar título da palestra', currentTitle);

    if (nextTitle === null) return;

    const normalizedTitle = nextTitle.trim();
    if (!normalizedTitle || normalizedTitle === currentTitle) return;

    setRenaming(true);

    try {
      await base44.entities.Presentation.update(presentationId, {
        title: normalizedTitle,
      });

      // Recarrega o registro para manter o título da tela e o estado local sincronizados.
      window.location.reload();
    } catch (error) {
      console.error('Erro ao editar título da palestra:', error);
      window.alert('Não foi possível alterar o título agora. Tente novamente.');
      setRenaming(false);
    }
  };

  const indicator = status === 'saving' ? (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>Salvando...</span>
    </div>
  ) : status === 'saved' ? (
    <div className="flex items-center gap-1.5 text-xs text-green-600">
      <Check className="h-3 w-3" />
      <span>Salvo</span>
    </div>
  ) : status === 'error' ? (
    <div className="flex items-center gap-1.5 text-xs text-destructive">
      <AlertCircle className="h-3 w-3" />
      <span>Erro ao salvar</span>
    </div>
  ) : null;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {indicator}

      {presentationId && (
        <button
          type="button"
          onClick={handleRename}
          disabled={renaming || status === 'saving'}
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-border/80 bg-background px-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
          title="Editar título da palestra"
          aria-label="Editar título da palestra"
        >
          {renaming ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Pencil className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Editar título</span>
        </button>
      )}
    </div>
  );
}