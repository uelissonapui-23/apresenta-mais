import React from 'react';
import {
  DragDropContext,
  Draggable,
  Droppable,
} from '@hello-pangea/dnd';
import { EyeOff, GripVertical } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

export default function ViewText({
  blocks,
  detailLevel,
  onDragReorder,
  dragDisabled = false,
}) {
  const sorted = [...blocks].sort((left, right) => (
    Number(left.order_index || 0)
    - Number(right.order_index || 0)
  ));

  const headingSize = (depth) => {
    if (depth === 0) return 'text-xl font-bold';
    if (depth === 1) return 'text-lg font-semibold';
    if (depth === 2) return 'text-base font-medium';
    return 'text-sm font-medium';
  };

  const handleDragEnd = (result) => {
    const {
      source,
      destination,
      draggableId,
    } = result;

    if (
      !destination
      || source.index === destination.index
      || dragDisabled
    ) {
      return;
    }

    const targetBlock = sorted[destination.index];

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
      <Droppable droppableId="presentation-text">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`mx-auto max-w-2xl space-y-2 rounded-xl py-4 transition-colors ${
              snapshot.isDraggingOver ? 'bg-primary/5' : ''
            }`}
          >
            {sorted.map((block, index) => (
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
                    style={{
                      ...dragProvided.draggableProps.style,
                      marginLeft: `${Math.min(
                        Number(block.depth_level || 0),
                        4,
                      ) * 20}px`,
                    }}
                    className={`group rounded-lg border border-transparent px-2 py-2 transition-all hover:border-border hover:bg-muted/30 ${
                      block.is_hidden ? 'opacity-50' : ''
                    } ${
                      dragSnapshot.isDragging
                        ? 'z-50 border-primary/40 bg-background shadow-xl ring-2 ring-primary/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        {...dragProvided.dragHandleProps}
                        className="mt-0.5 flex h-8 w-8 shrink-0 touch-none cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
                        title="Segure e arraste para reorganizar"
                        aria-label={`Arrastar ${block.title || 'tópico'}`}
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={headingSize(block.depth_level)}>
                            {block.title}
                          </h3>

                          {block.is_hidden && (
                            <Badge
                              variant="outline"
                              className="gap-1 text-[10px]"
                            >
                              <EyeOff className="h-3 w-3" />
                              Oculto
                            </Badge>
                          )}
                        </div>

                        {detailLevel !== 'compact' && block.summary && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {block.summary}
                          </p>
                        )}

                        {(detailLevel === 'detailed'
                          || detailLevel === 'complete')
                          && block.content && (
                          <p className="mt-2 whitespace-pre-wrap text-sm">
                            {block.content}
                          </p>
                        )}

                        {detailLevel === 'complete'
                          && block.additional_content && (
                          <p className="mt-1 text-sm italic text-muted-foreground">
                            {block.additional_content}
                          </p>
                        )}
                      </div>
                    </div>
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