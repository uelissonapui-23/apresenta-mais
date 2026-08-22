import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  MoreVertical,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import {
  DragDropContext,
  Draggable,
  Droppable,
} from '@hello-pangea/dnd';

import BlockAttachmentsPanel from '@/components/editor/BlockAttachmentsPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function previewText(block) {
  const value = block.summary || block.content || block.additional_content || '';
  return String(value).trim();
}

function displayTitle(block) {
  const title = String(block.title || '').trim();
  if (title) return title;

  const preview = previewText(block).replace(/\s+/g, ' ').trim();
  if (!preview) return 'Tópico sem título';
  return preview.length > 58 ? `${preview.slice(0, 58).trim()}…` : preview;
}

function HybridTopicCard({
  block,
  index,
  blockTypes,
  detailLevel,
  onUpdate,
  onDelete,
  onDuplicate,
  onIndent,
  onOutdent,
  onAddChild,
  expanded,
  onToggle,
  dragHandleProps,
  isDragging,
}) {
  const [localBlock, setLocalBlock] = useState(block);
  const saveTimeoutRef = useRef(null);
  const blockType = useMemo(
    () => blockTypes?.find((type) => type.id === block.block_type_id),
    [block.block_type_id, blockTypes],
  );

  useEffect(() => {
    setLocalBlock(block);
  }, [block]);

  useEffect(() => () => window.clearTimeout(saveTimeoutRef.current), []);

  const changeField = (field, value) => {
    setLocalBlock((current) => ({ ...current, [field]: value }));
    window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      onUpdate(block.id, { [field]: value });
    }, 700);
  };

  const summary = previewText(localBlock);
  const minutes = Math.max(1, Math.round(Number(localBlock.estimated_duration_seconds || 60) / 60));
  const showContentField = detailLevel === 'detailed' || detailLevel === 'complete';
  const showNotesField = detailLevel === 'complete';

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-background transition-all ${
        expanded
          ? 'border-primary/40 shadow-md ring-1 ring-primary/10'
          : 'border-border/80 shadow-sm hover:border-primary/30 hover:shadow-md'
      } ${block.is_hidden ? 'opacity-55' : ''} ${isDragging ? 'z-50 shadow-2xl ring-2 ring-primary/30' : ''}`}
      style={{ marginLeft: `${Math.min(Number(block.depth_level || 0), 3) * 14}px` }}
    >
      <div className="flex items-start gap-2 p-3 sm:gap-3 sm:p-4">
        <button
          type="button"
          {...dragHandleProps}
          className="mt-0.5 flex h-9 w-9 shrink-0 touch-none cursor-grab items-center justify-center rounded-xl text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label={`Arrastar ${displayTitle(localBlock)}`}
          title="Segure e arraste para reorganizar"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 text-left"
          aria-expanded={expanded}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-muted px-2 text-xs font-bold text-muted-foreground">
              {index + 1}
            </span>
            {blockType?.name && (
              <Badge variant="outline" className="max-w-[150px] truncate text-[10px]">
                {blockType.name}
              </Badge>
            )}
            {localBlock.is_essential && (
              <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
                <Star className="h-3 w-3 fill-current" />
                Essencial
              </Badge>
            )}
            {localBlock.is_hidden && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <EyeOff className="h-3 w-3" /> Oculto
              </Badge>
            )}
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" /> {minutes} min
            </span>
          </div>

          <div className="mt-2 flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-[15px] font-bold leading-snug sm:text-base">
                {displayTitle(localBlock)}
              </h3>
              {!expanded && summary && (
                <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {summary}
                </p>
              )}
            </div>
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
          </div>

          {!expanded && (
            <div className="mt-3 flex items-center gap-2 border-t pt-3">
              <span className="text-[11px] text-muted-foreground">Importância</span>
              <span className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <span
                    key={level}
                    className={`h-2.5 w-2.5 rounded-full ${Number(localBlock.importance_level || 0) >= level ? 'bg-primary' : 'bg-muted'}`}
                  />
                ))}
              </span>
              <span className="ml-auto text-[11px] font-medium text-primary">Toque para editar</span>
            </div>
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl" aria-label="Ações do tópico">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onToggle}>
              {expanded ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
              {expanded ? 'Recolher edição' : 'Editar tópico'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdate(block.id, { is_essential: !block.is_essential })}>
              <Star className="mr-2 h-4 w-4" />
              {block.is_essential ? 'Remover destaque' : 'Marcar como essencial'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdate(block.id, { is_hidden: !block.is_hidden })}>
              {block.is_hidden ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
              {block.is_hidden ? 'Mostrar na apresentação' : 'Ocultar na apresentação'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onIndent?.(block.id)}>Virar subtópico</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOutdent?.(block.id)}>Subir um nível</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddChild?.(block.id)}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar subtópico
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate?.(block.id)}>
              <Copy className="mr-2 h-4 w-4" /> Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(block)}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded && (
        <div className="border-t bg-muted/[0.12] px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_230px]">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Título</label>
                <Input
                  value={localBlock.title || ''}
                  onChange={(event) => changeField('title', event.target.value)}
                  placeholder="Dê um título curto para localizar este tópico"
                  className="h-11 rounded-xl bg-background"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Resumo que você quer enxergar no roteiro</label>
                <Textarea
                  value={localBlock.summary || ''}
                  onChange={(event) => changeField('summary', event.target.value)}
                  placeholder="Escreva a ideia principal deste tópico..."
                  className="min-h-[96px] resize-y rounded-xl bg-background text-sm leading-relaxed"
                />
              </div>

              {showContentField && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Conteúdo completo</label>
                  <Textarea
                    value={localBlock.content || ''}
                    onChange={(event) => changeField('content', event.target.value)}
                    placeholder="Desenvolva o assunto, coloque exemplos, textos ou argumentos..."
                    className="min-h-[150px] resize-y rounded-xl bg-background text-sm leading-relaxed"
                  />
                </div>
              )}

              {detailLevel === 'complete' && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Conteúdo complementar</label>
                  <Textarea
                    value={localBlock.additional_content || ''}
                    onChange={(event) => changeField('additional_content', event.target.value)}
                    placeholder="Informações extras que podem ser usadas se houver tempo..."
                    className="min-h-[88px] resize-y rounded-xl bg-background text-sm"
                  />
                </div>
              )}

              {showNotesField && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Notas só para você</label>
                  <Textarea
                    value={localBlock.presenter_notes || ''}
                    onChange={(event) => changeField('presenter_notes', event.target.value)}
                    placeholder="Lembretes que não precisam aparecer para o público..."
                    className="min-h-[88px] resize-y rounded-xl border-amber-200 bg-amber-50/70 text-sm"
                  />
                </div>
              )}

              <BlockAttachmentsPanel blockId={block.id} />
            </div>

            <aside className="space-y-4 rounded-2xl border bg-background p-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Importância</p>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => changeField('importance_level', level)}
                      className={`h-9 rounded-lg text-xs font-bold transition ${Number(localBlock.importance_level || 0) >= level ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Tempo previsto</label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    value={localBlock.estimated_duration_seconds || 60}
                    onChange={(event) => changeField('estimated_duration_seconds', Number(event.target.value) || 60)}
                    className="h-10 rounded-xl"
                  />
                  <span className="text-xs text-muted-foreground">seg.</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">≈ {minutes} min</p>
              </div>

              <Button type="button" variant="secondary" className="w-full rounded-xl" onClick={onToggle}>
                <ChevronDown className="mr-2 h-4 w-4" /> Concluir edição
              </Button>
            </aside>
          </div>
        </div>
      )}
    </article>
  );
}

export default function ViewHybrid({
  blocks,
  blockTypes,
  detailLevel,
  onUpdate,
  onDelete,
  onDuplicate,
  onIndent,
  onOutdent,
  onAddChild,
  onDragReorder,
  dragDisabled = false,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const sortedBlocks = useMemo(
    () => [...blocks].sort((left, right) => Number(left.order_index || 0) - Number(right.order_index || 0)),
    [blocks],
  );

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.index === destination.index || dragDisabled) return;

    const targetBlock = sortedBlocks[destination.index];
    if (!targetBlock?.id || !draggableId) return;

    onDragReorder?.({
      draggedId: draggableId,
      targetId: targetBlock.id,
      sourceIndex: source.index,
      destinationIndex: destination.index,
    });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="presentation-hybrid-builder">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`mx-auto max-w-4xl space-y-2.5 rounded-2xl transition-colors ${snapshot.isDraggingOver ? 'bg-primary/[0.035]' : ''}`}
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
                    <HybridTopicCard
                      block={block}
                      index={index}
                      blockTypes={blockTypes}
                      detailLevel={detailLevel}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      onDuplicate={onDuplicate}
                      onIndent={onIndent}
                      onOutdent={onOutdent}
                      onAddChild={onAddChild}
                      expanded={expandedId === block.id}
                      onToggle={() => setExpandedId((current) => (current === block.id ? null : block.id))}
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
