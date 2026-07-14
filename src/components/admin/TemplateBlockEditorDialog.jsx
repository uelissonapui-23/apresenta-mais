import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

const EMPTY_FORM = {
  title: '',
  summary: '',
  content: '',
  presenter_notes: '',
  block_type_id: '',
  order_index: 0,
  depth_level: 0,
  importance_level: 3,
  estimated_duration_seconds: 60,
  is_essential: false,
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildTree(blocks) {
  const sorted = [...blocks].sort((a, b) => {
    const depthDiff = toNumber(a.depth_level) - toNumber(b.depth_level);
    if (depthDiff !== 0) return depthDiff;
    return toNumber(a.order_index) - toNumber(b.order_index);
  });

  const byParent = new Map();
  sorted.forEach((block) => {
    const key = block.parent_id || 'root';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(block);
  });

  const attach = (parentId = 'root') =>
    (byParent.get(parentId) || []).map((block) => ({
      ...block,
      children: attach(block.id),
    }));

  return attach();
}

function flattenTree(nodes, depth = 0, result = []) {
  nodes.forEach((node) => {
    result.push({ ...node, computed_depth: depth });
    if (node.children?.length > 0) {
      flattenTree(node.children, depth + 1, result);
    }
  });
  return result;
}

function TemplateBlockRow({
  node,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onIndent,
  onOutdent,
  onDuplicate,
  onAddChild,
}) {
  return (
    <div
      className="rounded-lg border border-border/70 bg-background p-3"
      style={{ marginLeft: Math.min(node.computed_depth * 14, 56) }}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
          {toNumber(node.order_index) + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-sm">{node.title || 'Bloco sem título'}</p>
            {node.is_essential && (
              <Badge variant="outline" className="text-[10px]">Essencial</Badge>
            )}
          </div>
          {node.summary && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{node.summary}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMoveUp(node)} title="Mover para cima">
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMoveDown(node)} title="Mover para baixo">
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onIndent(node)} title="Aumentar nível">
            <ArrowUp className="h-3.5 w-3.5 rotate-45" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOutdent(node)} title="Diminuir nível">
            <ArrowDown className="h-3.5 w-3.5 rotate-45" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddChild(node)} title="Adicionar subtópico">
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(node)} title="Duplicar">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(node)} title="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(node)} title="Excluir">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {node.children?.length > 0 && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <TemplateBlockRow
              key={child.id}
              node={child}
              onEdit={onEdit}
              onDelete={onDelete}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onIndent={onIndent}
              onOutdent={onOutdent}
              onDuplicate={onDuplicate}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TemplateBlockEditorDialog({
  open,
  onOpenChange,
  template,
  blocks: allBlocks,
  blockTypes,
  onBlocksChanged,
}) {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState([]);
  const [editingBlock, setEditingBlock] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const templateId = template?.id;

  useEffect(() => {
    if (templateId && allBlocks) {
      setBlocks(allBlocks.filter((b) => b.template_id === templateId));
    } else {
      setBlocks([]);
    }
  }, [templateId, allBlocks]);

  const tree = useMemo(() => buildTree(blocks), [blocks]);

  const siblingsOf = useCallback(
    (parentId) => blocks.filter((b) => (b.parent_id || null) === (parentId || null)),
    [blocks],
  );

  const openCreate = (parentId = null) => {
    setEditingBlock(null);
    const siblings = siblingsOf(parentId);
    const nextOrder = siblings.length > 0 ? Math.max(...siblings.map((s) => toNumber(s.order_index))) + 1 : 0;
    const parent = parentId ? blocks.find((b) => b.id === parentId) : null;
    setForm({
      ...EMPTY_FORM,
      parent_id: parentId,
      depth_level: parent ? toNumber(parent.depth_level) + 1 : 0,
      order_index: nextOrder,
    });
    setFormOpen(true);
  };

  const openEdit = (block) => {
    setEditingBlock(block);
    setForm({
      ...EMPTY_FORM,
      ...block,
      parent_id: block.parent_id || null,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Informe o título do bloco', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const payload = {
      template_id: templateId,
      parent_id: form.parent_id || null,
      block_type_id: form.block_type_id || null,
      title: form.title.trim(),
      summary: form.summary || '',
      content: form.content || '',
      presenter_notes: form.presenter_notes || '',
      order_index: toNumber(form.order_index),
      depth_level: toNumber(form.depth_level),
      importance_level: toNumber(form.importance_level, 3),
      estimated_duration_seconds: toNumber(form.estimated_duration_seconds, 60),
      is_essential: Boolean(form.is_essential),
    };

    try {
      if (editingBlock?.id) {
        const updated = await base44.entities.TemplateBlock.update(editingBlock.id, payload);
        setBlocks((prev) => prev.map((b) => (b.id === editingBlock.id ? { ...b, ...updated, ...payload } : b)));
        toast({ title: 'Bloco atualizado' });
      } else {
        const created = await base44.entities.TemplateBlock.create(payload);
        setBlocks((prev) => [...prev, created]);
        toast({ title: 'Bloco criado' });
      }
      setFormOpen(false);
      if (onBlocksChanged) onBlocksChanged();
    } catch (error) {
      console.error('Erro ao salvar bloco:', error);
      toast({ title: 'Não foi possível salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleMoveUp = async (block) => {
    const sorted = blocks
      .filter((b) => (b.parent_id || null) === (block.parent_id || null))
      .sort((a, b) => toNumber(a.order_index) - toNumber(b.order_index));
    const idx = sorted.findIndex((b) => b.id === block.id);
    if (idx <= 0) return;
    const prev = sorted[idx - 1];
    await Promise.all([
      base44.entities.TemplateBlock.update(block.id, { order_index: toNumber(prev.order_index) }),
      base44.entities.TemplateBlock.update(prev.id, { order_index: toNumber(block.order_index) }),
    ]);
    setBlocks((prev) => prev.map((b) => {
      if (b.id === block.id) return { ...b, order_index: toNumber(prev.order_index) };
      if (b.id === prev.id) return { ...b, order_index: toNumber(block.order_index) };
      return b;
    }));
    if (onBlocksChanged) onBlocksChanged();
  };

  const handleMoveDown = async (block) => {
    const sorted = blocks
      .filter((b) => (b.parent_id || null) === (block.parent_id || null))
      .sort((a, b) => toNumber(a.order_index) - toNumber(b.order_index));
    const idx = sorted.findIndex((b) => b.id === block.id);
    if (idx >= sorted.length - 1) return;
    const next = sorted[idx + 1];
    await Promise.all([
      base44.entities.TemplateBlock.update(block.id, { order_index: toNumber(next.order_index) }),
      base44.entities.TemplateBlock.update(next.id, { order_index: toNumber(block.order_index) }),
    ]);
    setBlocks((prev) => prev.map((b) => {
      if (b.id === block.id) return { ...b, order_index: toNumber(next.order_index) };
      if (b.id === next.id) return { ...b, order_index: toNumber(block.order_index) };
      return b;
    }));
    if (onBlocksChanged) onBlocksChanged();
  };

  const handleIndent = async (block) => {
    const sorted = blocks
      .filter((b) => (b.parent_id || null) === (block.parent_id || null))
      .sort((a, b) => toNumber(a.order_index) - toNumber(b.order_index));
    const idx = sorted.findIndex((b) => b.id === block.id);
    const prevBlock = idx > 0 ? sorted[idx - 1] : null;
    if (!prevBlock) return;
    await base44.entities.TemplateBlock.update(block.id, {
      depth_level: toNumber(block.depth_level) + 1,
      parent_id: prevBlock.id,
    });
    setBlocks((prev) => prev.map((b) => b.id === block.id ? { ...b, depth_level: toNumber(block.depth_level) + 1, parent_id: prevBlock.id } : b));
    if (onBlocksChanged) onBlocksChanged();
  };

  const handleOutdent = async (block) => {
    if (toNumber(block.depth_level) <= 0) return;
    const parent = block.parent_id ? blocks.find((b) => b.id === block.parent_id) : null;
    const newParentId = parent?.parent_id || null;
    await base44.entities.TemplateBlock.update(block.id, {
      depth_level: toNumber(block.depth_level) - 1,
      parent_id: newParentId,
    });
    setBlocks((prev) => prev.map((b) => b.id === block.id ? { ...b, depth_level: toNumber(block.depth_level) - 1, parent_id: newParentId } : b));
    if (onBlocksChanged) onBlocksChanged();
  };

  const handleDuplicate = async (block) => {
    try {
      const created = await base44.entities.TemplateBlock.create({
        template_id: templateId,
        parent_id: block.parent_id || null,
        block_type_id: block.block_type_id || null,
        title: `${block.title || 'Bloco'} (cópia)`,
        summary: block.summary || '',
        content: block.content || '',
        presenter_notes: block.presenter_notes || '',
        order_index: toNumber(block.order_index) + 0.5,
        depth_level: toNumber(block.depth_level),
        importance_level: toNumber(block.importance_level, 3),
        estimated_duration_seconds: toNumber(block.estimated_duration_seconds, 60),
        is_essential: Boolean(block.is_essential),
      });
      setBlocks((prev) => [...prev, created].sort((a, b) => toNumber(a.order_index) - toNumber(b.order_index)));
      toast({ title: 'Bloco duplicado' });
      if (onBlocksChanged) onBlocksChanged();
    } catch (error) {
      toast({ title: 'Não foi possível duplicar', variant: 'destructive' });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const children = blocks.filter((b) => b.parent_id === deleteTarget.id);
      for (const child of children) {
        await base44.entities.TemplateBlock.update(child.id, { parent_id: deleteTarget.parent_id || null, depth_level: Math.max(0, toNumber(child.depth_level) - 1) });
      }
      await base44.entities.TemplateBlock.delete(deleteTarget.id);
      setBlocks((prev) => prev
        .filter((b) => b.id !== deleteTarget.id)
        .map((b) => b.parent_id === deleteTarget.id ? { ...b, parent_id: deleteTarget.parent_id || null, depth_level: Math.max(0, toNumber(b.depth_level) - 1) } : b));
      setDeleteTarget(null);
      toast({ title: 'Bloco excluído' });
      if (onBlocksChanged) onBlocksChanged();
    } catch (error) {
      toast({ title: 'Não foi possível excluir', variant: 'destructive' });
    }
  };

  if (!template) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Estrutura do modelo</DialogTitle>
            <DialogDescription>
              Gerencie os blocos de &ldquo;{template.name}&rdquo;. A hierarquia é
              preservada com parent_id, order_index e depth_level.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {blocks.length} bloco(s) neste modelo.
              </p>
              <Button size="sm" onClick={() => openCreate(null)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Adicionar bloco
              </Button>
            </div>

            {tree.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Este modelo ainda não possui blocos. Clique em &ldquo;Adicionar bloco&rdquo; para começar.
              </div>
            ) : (
              <div className="space-y-2">
                {tree.map((node) => (
                  <TemplateBlockRow
                    key={node.id}
                    node={node}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    onIndent={handleIndent}
                    onOutdent={handleOutdent}
                    onDuplicate={handleDuplicate}
                    onAddChild={(block) => openCreate(block.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={(o) => !o && setFormOpen(false)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingBlock ? 'Editar bloco' : 'Novo bloco'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Título do bloco"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de bloco</Label>
              <Select
                value={form.block_type_id || 'none'}
                onValueChange={(v) => setForm((f) => ({ ...f, block_type_id: v === 'none' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem tipo</SelectItem>
                  {blockTypes.map((bt) => (
                    <SelectItem key={bt.id} value={bt.id}>{bt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Resumo</Label>
              <Textarea
                rows={2}
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="Resumo curto..."
              />
            </div>

            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea
                rows={4}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Conteúdo detalhado..."
              />
            </div>

            <div className="space-y-2">
              <Label>Notas do apresentador</Label>
              <Textarea
                rows={2}
                value={form.presenter_notes}
                onChange={(e) => setForm((f) => ({ ...f, presenter_notes: e.target.value }))}
                placeholder="Notas privadas..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Importância (1-5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={form.importance_level}
                  onChange={(e) => setForm((f) => ({ ...f, importance_level: toNumber(e.target.value, 3) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tempo (segundos)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.estimated_duration_seconds}
                  onChange={(e) => setForm((f) => ({ ...f, estimated_duration_seconds: toNumber(e.target.value, 60) }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Marcar como essencial</p>
                <p className="text-xs text-muted-foreground">Priorizado em versões curtas.</p>
              </div>
              <Switch
                checked={Boolean(form.is_essential)}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, is_essential: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingBlock ? 'Salvar' : 'Criar bloco'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir bloco?"
        description={
          deleteTarget && blocks.some((b) => b.parent_id === deleteTarget.id)
            ? `"${deleteTarget?.title}" possui sub-blocos. Eles serão movidos para o nível acima.`
            : `Tem certeza que deseja excluir "${deleteTarget?.title}"?`
        }
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </>
  );
}