import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2, Copy, Eye, EyeOff, Star, ArrowUp, ArrowDown, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import BlockAttachmentsPanel from '@/components/editor/BlockAttachmentsPanel';

export default function BlockEditor({
  block, blockTypes, detailLevel, onUpdate, onDelete, onDuplicate,
  onMoveUp, onMoveDown, onIndent, onOutdent, onAddChild, isFirst, isLast,
  dragHandleProps, isDragging, children
}) {
  const [expanded, setExpanded] = useState(!block.is_collapsed);
  const [localBlock, setLocalBlock] = useState(block);
  const saveTimeoutRef = useRef(null);
  const blockType = blockTypes?.find(bt => bt.id === block.block_type_id);

  useEffect(() => { setLocalBlock(block); }, [block]);

  const handleFieldChange = (field, value) => {
    const updated = { ...localBlock, [field]: value };
    setLocalBlock(updated);
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      onUpdate(block.id, { [field]: value });
    }, 800);
  };

  const showSummary = detailLevel !== 'compact';
  const showContent = detailLevel === 'detailed' || detailLevel === 'complete';
  const showNotes = detailLevel === 'complete';
  const showAdditional = detailLevel === 'complete';

  return (
    <div
      className={`${block.is_hidden ? 'opacity-50' : ''} ${isDragging ? 'relative z-50' : ''}`}
      style={{ marginLeft: `${Math.min(block.depth_level, 4) * 16}px` }}
    >
      <Card className={`mb-1.5 border transition-shadow ${block.is_essential ? 'border-primary/40 bg-primary/5' : ''} ${isDragging ? 'shadow-2xl ring-2 ring-primary/40' : ''}`}>
        <div className="p-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 md:hidden" onClick={() => onMoveUp?.(block.id)} disabled={isFirst}>
              <ArrowUp className="w-3.5 h-3.5" />
            </Button>
            <div
              {...dragHandleProps}
              className="flex h-8 w-8 shrink-0 touch-none cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
              title="Segure e arraste para reorganizar"
              aria-label={`Arrastar ${block.title || 'tópico'}`}
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
            {blockType && <Badge variant="outline" className="text-[10px] shrink-0">{blockType.name}</Badge>}
            <Input
              className="flex-1 h-8 text-sm font-medium border-none shadow-none focus-visible:ring-0 px-1"
              value={localBlock.title}
              onChange={e => handleFieldChange('title', e.target.value)}
              placeholder="Título do bloco"
            />
            <div className="flex items-center gap-0.5 shrink-0">
              {block.is_essential && <Star className="w-3.5 h-3.5 text-primary fill-primary" />}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onUpdate(block.id, { is_essential: !block.is_essential })}>
                    <Star className="w-4 h-4 mr-2" />{block.is_essential ? 'Remover essencial' : 'Marcar essencial'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdate(block.id, { is_hidden: !block.is_hidden })}>
                    {block.is_hidden ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                    {block.is_hidden ? 'Mostrar' : 'Ocultar'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onIndent?.(block.id)}>Aumentar nível →</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onOutdent?.(block.id)}>Diminuir nível ←</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onAddChild?.(block.id)}><Plus className="w-4 h-4 mr-2" />Adicionar sub-bloco</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate?.(block.id)}><Copy className="w-4 h-4 mr-2" />Duplicar</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete?.(block)} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 md:hidden" onClick={() => onMoveDown?.(block.id)} disabled={isLast}>
              <ArrowDown className="w-3.5 h-3.5" />
            </Button>
          </div>

          {expanded && (
            <div className="mt-3 space-y-3 pl-1 md:pl-7">
              {showSummary && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Resumo</label>
                  <Textarea
                    className="min-h-[40px] text-sm resize-none"
                    rows={1}
                    value={localBlock.summary || ''}
                    onChange={e => handleFieldChange('summary', e.target.value)}
                    placeholder="Resumo breve..."
                  />
                </div>
              )}
              {showContent && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Conteúdo</label>
                  <Textarea
                    className="min-h-[80px] text-sm resize-none"
                    rows={3}
                    value={localBlock.content || ''}
                    onChange={e => handleFieldChange('content', e.target.value)}
                    placeholder="Conteúdo completo..."
                  />
                </div>
              )}
              {showAdditional && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Conteúdo adicional</label>
                  <Textarea
                    className="min-h-[40px] text-sm resize-none"
                    rows={2}
                    value={localBlock.additional_content || ''}
                    onChange={e => handleFieldChange('additional_content', e.target.value)}
                    placeholder="Informações complementares..."
                  />
                </div>
              )}
              {showNotes && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Notas do apresentador</label>
                  <Textarea
                    className="min-h-[40px] text-sm resize-none bg-yellow-50 border-yellow-200"
                    rows={2}
                    value={localBlock.presenter_notes || ''}
                    onChange={e => handleFieldChange('presenter_notes', e.target.value)}
                    placeholder="Anotações pessoais..."
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-muted-foreground">Importância:</label>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n}
                        className={`w-5 h-5 rounded text-xs font-medium ${localBlock.importance_level >= n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                        onClick={() => handleFieldChange('importance_level', n)}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-muted-foreground">Tempo (s):</label>
                  <Input
                    type="number"
                    className="w-20 h-7 text-xs"
                    value={localBlock.estimated_duration_seconds || 60}
                    onChange={e => handleFieldChange('estimated_duration_seconds', parseInt(e.target.value) || 60)}
                  />
                </div>
              </div>

              <BlockAttachmentsPanel blockId={block.id} />
            </div>
          )}
        </div>
      </Card>
      {children}
    </div>
  );
}