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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ViewCards({
  blocks,
  blockTypes,
  detailLevel,
  onDragReorder,
  dragDisabled = false,
}) {
  const sorted = [...blocks].sort((left, right) => (
    Number(left.order_index || 0)
    - Number(right.order_index || 0)
  ));

  const blockTypeMap = Object.fromEntries(
    (blockTypes || []).map((blockType) => [
      blockType.id,
      blockType.name,
    ]),
  );

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
      <Droppable
        droppableId="presentation-cards"
        direction="vertical"
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`grid grid-cols-1 gap-3 rounded-xl py-4 transition-colors sm:grid-cols-2 ${
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
                    className={`min-w-0 ${
                      block.is_hidden ? 'opacity-50' : ''
                    } ${
                      dragSnapshot.isDragging
                        ? 'z-50'
                        : ''
                    }`}
                  >
                    <Card
                      className={`h-full transition-all ${
                        block.is_essential
                          ? 'border-primary/40'
                          : ''
                      } ${
                        dragSnapshot.isDragging
                          ? 'shadow-2xl ring-2 ring-primary/30'
                          : ''
                      }`}
                    >
                      <CardHeader className="px-4 pb-2 pt-3">
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            {...dragProvided.dragHandleProps}
                            className="flex h-8 w-8 shrink-0 touch-none cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
                            title="Segure e arraste o cartão"
                            aria-label={`Arrastar ${block.title || 'tópico'}`}
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm font-semibold">
                                {block.title}
                              </CardTitle>

                              {block.is_essential && (
                                <Star className="h-4 w-4 shrink-0 fill-primary text-primary" />
                              )}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {blockTypeMap[block.block_type_id] && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {blockTypeMap[block.block_type_id]}
                                </Badge>
                              )}

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

                              <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
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
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="px-4 pb-4 pl-14">
                        {detailLevel !== 'compact'
                          && block.summary && (
                          <p className="text-xs text-muted-foreground">
                            {block.summary}
                          </p>
                        )}

                        {(detailLevel === 'detailed'
                          || detailLevel === 'complete')
                          && block.content && (
                          <p className="mt-2 whitespace-pre-wrap text-xs">
                            {block.content}
                          </p>
                        )}
                      </CardContent>
                    </Card>
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