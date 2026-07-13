import React from 'react';

export default function ViewText({ blocks, detailLevel }) {
  const sorted = [...blocks].sort((a, b) => a.order_index - b.order_index);

  const headingSize = (depth) => {
    if (depth === 0) return 'text-xl font-bold';
    if (depth === 1) return 'text-lg font-semibold';
    if (depth === 2) return 'text-base font-medium';
    return 'text-sm font-medium';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 py-4">
      {sorted.filter(b => !b.is_hidden).map(block => (
        <div key={block.id} style={{ marginLeft: `${Math.min(block.depth_level, 4) * 20}px` }}>
          <h3 className={headingSize(block.depth_level)}>{block.title}</h3>
          {detailLevel !== 'compact' && block.summary && (
            <p className="text-muted-foreground text-sm mt-1">{block.summary}</p>
          )}
          {(detailLevel === 'detailed' || detailLevel === 'complete') && block.content && (
            <p className="text-sm mt-2 whitespace-pre-wrap">{block.content}</p>
          )}
          {detailLevel === 'complete' && block.additional_content && (
            <p className="text-sm text-muted-foreground mt-1 italic">{block.additional_content}</p>
          )}
        </div>
      ))}
    </div>
  );
}