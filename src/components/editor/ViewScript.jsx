import React from 'react';
import {
  DragDropContext,
  Draggable,
  Droppable,
} from '@hello-pangea/dnd';
import {
  Clock,
  EyeOff,
  GripVertical,
  Star,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';

export default function ViewScript({
  blocks,
  detailLevel,
  onDragReorder,
  dragDisabled = false,
}) {
  const sorted = [...blocks].sort((left, right) => (
    Number(left.order_index || 0)
    - Number(right.order_index || 0)
  ));

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
      <Droppable droppableId="presentation-script">
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
                    style={dragProvided.draggableProps.style}
                    className={`flex items-start gap-2 rounded-lg border p-3 transition-all ${
                      block.is_essential
                        ? 'border-primary/30 bg-primary/5'
                        : 'bg-background'
                    } ${
                      block.is_hidden ? 'opacity-50' : ''
                    } ${
                      dragSnapshot.isDragging
                        ? 'z-50 shadow-2xl ring-2 ring-primary/30'
                        : ''
                    }`}
                  >
                    <button
                      type="button"
                      {...dragProvided.dragHandleProps}
                      className="flex h-8 w-8 shrink-0 touch-none cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
                      title="Segure e arraste para reorganizar"
                      aria-label={`Arrastar ${block.title || 'tópico'}`}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>

                    <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
                      <span className="w-6 text-center font-mono text-xs text-muted-foreground">
                        {index + 1}
                      </span>

                      {block.is_essential && (
                        <Star className="h-3 w-3 fill-primary text-primary" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold">
                          {block.title}
                        </h4>

                        <Badge
                          variant="secondary"
                          className="text-[10px]"
                        >
                          Nível {Number(block.depth_level || 0) + 1}
                        </Badge>

                        {block.is_hidden && (
                          <Badge
                            variant="outline"
                            className="gap-1 text-[10px]"
                          >
                            <EyeOff className="h-3 w-3" />
                            Oculto
                          </Badge>
                        )}

                        <div className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {Math.round(
                              (block.estimated_duration_seconds || 60)
                              / 60,
                            )}
                            min
                          </span>
                        </div>
                      </div>

                      {detailLevel !== 'compact'
                        && block.summary && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {block.summary}
                        </p>
                      )}

                      {detailLevel === 'complete'
                        && block.presenter_notes && (
                        <p className="mt-1 rounded bg-yellow-50 px-2 py-1 text-xs italic text-yellow-700">
                          {block.presenter_notes}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 pt-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`mx-px h-4 w-1.5 rounded-sm ${
                            block.importance_level >= level
                              ? 'bg-primary'
                              : 'bg-muted'
                          }`}
                        />
                      ))}
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