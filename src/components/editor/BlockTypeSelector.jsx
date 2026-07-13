import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function BlockTypeSelector({ open, onOpenChange, blockTypes, onSelect }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tipo do bloco</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {blockTypes?.filter(bt => bt.active).map(bt => (
            <button
              key={bt.id}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors text-left"
              onClick={() => { onSelect(bt); onOpenChange(false); }}
            >
              <span className="text-sm font-medium">{bt.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}