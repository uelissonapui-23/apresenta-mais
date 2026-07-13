import React from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';

export default function AutosaveIndicator({ status }) {
  if (status === 'saving') return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="w-3 h-3 animate-spin" />
      <span>Salvando...</span>
    </div>
  );
  if (status === 'saved') return (
    <div className="flex items-center gap-1.5 text-xs text-green-600">
      <Check className="w-3 h-3" />
      <span>Salvo</span>
    </div>
  );
  if (status === 'error') return (
    <div className="flex items-center gap-1.5 text-xs text-destructive">
      <AlertCircle className="w-3 h-3" />
      <span>Erro ao salvar</span>
    </div>
  );
  return null;
}