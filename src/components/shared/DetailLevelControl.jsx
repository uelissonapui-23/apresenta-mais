import React from 'react';
import { Button } from '@/components/ui/button';

const levels = [
  { key: 'compact', label: 'Compacto' },
  { key: 'normal', label: 'Normal' },
  { key: 'detailed', label: 'Detalhado' },
  { key: 'complete', label: 'Completo' },
];

export default function DetailLevelControl({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
      {levels.map(l => (
        <Button
          key={l.key}
          variant={value === l.key ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-7 px-2"
          onClick={() => onChange(l.key)}
        >
          {l.label}
        </Button>
      ))}
    </div>
  );
}