import React from 'react';
import { Clock, Star } from 'lucide-react';

export default function ViewScript({ blocks, detailLevel }) {
  const sorted = [...blocks].filter(b => !b.is_hidden).sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-2">
      {sorted.map((block, index) => (
        <div key={block.id} className={`flex items-start gap-3 p-3 rounded-lg border ${block.is_essential ? 'bg-primary/5 border-primary/30' : 'bg-background'}`}>
          <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
            <span className="text-xs text-muted-foreground font-mono w-6 text-center">{index + 1}</span>
            {block.is_essential && <Star className="w-3 h-3 text-primary fill-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm truncate">{block.title}</h4>
              <div className="flex items-center gap-0.5 text-xs text-muted-foreground shrink-0">
                <Clock className="w-3 h-3" />
                <span>{Math.round((block.estimated_duration_seconds || 60) / 60)}min</span>
              </div>
            </div>
            {detailLevel !== 'compact' && block.summary && (
              <p className="text-xs text-muted-foreground mt-1">{block.summary}</p>
            )}
            {detailLevel === 'complete' && block.presenter_notes && (
              <p className="text-xs mt-1 text-yellow-700 bg-yellow-50 px-2 py-1 rounded italic">{block.presenter_notes}</p>
            )}
          </div>
          <div className="flex shrink-0">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className={`w-1.5 h-4 rounded-sm mx-px ${block.importance_level >= n ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}