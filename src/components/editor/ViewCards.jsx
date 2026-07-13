import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Clock } from 'lucide-react';

export default function ViewCards({ blocks, blockTypes, detailLevel }) {
  const sorted = [...blocks].filter(b => !b.is_hidden).sort((a, b) => a.order_index - b.order_index);
  const btMap = Object.fromEntries((blockTypes || []).map(bt => [bt.id, bt.name]));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
      {sorted.map(block => (
        <Card key={block.id} className={block.is_essential ? 'border-primary/40' : ''}>
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-start justify-between">
              <CardTitle className="text-sm font-semibold">{block.title}</CardTitle>
              {block.is_essential && <Star className="w-4 h-4 text-primary fill-primary shrink-0" />}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {btMap[block.block_type_id] && <Badge variant="outline" className="text-[10px]">{btMap[block.block_type_id]}</Badge>}
              <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{Math.round((block.estimated_duration_seconds || 60) / 60)}min</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {detailLevel !== 'compact' && block.summary && (
              <p className="text-xs text-muted-foreground">{block.summary}</p>
            )}
            {(detailLevel === 'detailed' || detailLevel === 'complete') && block.content && (
              <p className="text-xs mt-2 whitespace-pre-wrap">{block.content}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}