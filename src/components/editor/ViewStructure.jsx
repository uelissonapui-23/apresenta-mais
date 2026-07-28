import React from 'react';
import {
  DragDropContext,
  Draggable,
  Droppable,
} from '@hello-pangea/dnd';

import BlockEditor from '@/components/editor/BlockEditor';

export default function ViewStructure({
  blocks,
  blockTypes,
  detailLevel,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onIndent,
  onOutdent,
  onAddChild,
  onDragReorder,
  dragDisabled = false,
}) {
  const sortedBlocks = [...blocks].sort((left, right) => (
    Number(left.order_index || 0) - Number(right.order_index || 0)
  ));

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    if (
      !destination
      || source.index === destination.index
      || dragDisabled
    ) {
      return;
    }

    const targetBlock = sortedBlocks[destination.index];

    if (!targetBlock?.id || !draggableId) {
      return;
    }

    onDragReorder?.({
      draggedId: draggableId,
      targetId: targetBlock.id,
      sourceIndex: source.index,
      destinationIndex: destination.index,
    });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="presentation-structure">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-0 rounded-xl transition-colors ${
              snapshot.isDraggingOver ? 'bg-primary/5' : ''
            }`}
          >
            {sortedBlocks.map((block, index) => (
              <Draggable
                key={block.id}
                draggableId={block.id}
                index={index}
                isDragDisabled={dragDisabled}
              >
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    style={dragProvided.draggableProps.style}
                  >
                    <BlockEditor
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
                      dragHandleProps={dragProvided.dragHandleProps}
                      isDragging={dragSnapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}