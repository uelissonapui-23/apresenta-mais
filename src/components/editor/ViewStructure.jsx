import React from 'react';
import BlockEditor from '@/components/editor/BlockEditor';

export default function ViewStructure({ blocks, blockTypes, detailLevel, onUpdate, onDelete, onDuplicate, onMoveUp, onMoveDown, onIndent, onOutdent, onAddChild }) {
  const sortedBlocks = [...blocks].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-0">
      {sortedBlocks.map((block, index) => (
        <BlockEditor
          key={block.id}
          block={block}
          blockTypes={blockTypes}
          detailLevel={detailLevel}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onIndent={onIndent}
          onOutdent={onOutdent}
          onAddChild={onAddChild}
          isFirst={index === 0}
          isLast={index === sortedBlocks.length - 1}
        />
      ))}
    </div>
  );
}