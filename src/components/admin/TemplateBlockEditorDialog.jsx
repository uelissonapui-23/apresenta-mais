import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function uniqueById(rows) {
  const map = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.id) {
      map.set(row.id, row);
    }
  }

  return [...map.values()];
}

function sortSiblings(rows) {
  return [...rows].sort((left, right) => (
    toNumber(left.order_index) - toNumber(right.order_index)
    || String(left.id).localeCompare(String(right.id))
  ));
}

function collectDescendants(blockId, blocks) {
  const childrenByParent = new Map();

  for (const block of blocks) {
    const key = block.parent_id || null;

    if (!childrenByParent.has(key)) {
      childrenByParent.set(key, []);
    }

    childrenByParent.get(key).push(block);
  }

  const result = [];
  const queue = [...(childrenByParent.get(blockId) || [])];
  const visited = new Set();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current?.id || visited.has(current.id)) {
      continue;
    }

    visited.add(current.id);
    result.push(current);

    queue.push(...(childrenByParent.get(current.id) || []));
  }

  return result;
}

function sortDeepestFirst(rows) {
  return [...rows].sort((left, right) => (
    toNumber(right.depth_level) - toNumber(left.depth_level)
    || toNumber(right.order_index) - toNumber(left.order_index)
  ));
}

function buildUniqueCopyTitle(title, siblings) {
  const base = String(title || 'Bloco').trim() || 'Bloco';
  const siblingTitles = new Set(
    siblings.map((item) => String(item.title || '').trim().toLowerCase()),
  );

  let attempt = 1;
  let candidate = `${base} (cópia)`;

  while (siblingTitles.has(candidate.toLowerCase())) {
    attempt += 1;
    candidate = `${base} (cópia ${attempt})`;
  }

  return candidate;
}

function buildTree(blocks) {
  const safeBlocks = uniqueById(blocks);
  const byId = new Map(safeBlocks.map((block) => [block.id, block]));
  const byParent = new Map();

  for (const block of safeBlocks) {
    const parentId = (
      block.parent_id
      && block.parent_id !== block.id
      && byId.has(block.parent_id)
    )
      ? block.parent_id
      : null;

    if (!byParent.has(parentId)) {
      byParent.set(parentId, []);
    }

    byParent.get(parentId).push({
      ...block,
      parent_id: parentId,
    });
  }

  for (const siblings of byParent.values()) {
    siblings.sort((left, right) => (
      toNumber(left.order_index) - toNumber(right.order_index)
      || String(left.id).localeCompare(String(right.id))
    ));
  }

  const attach = (parentId = null, ancestry = new Set()) => {
    return (byParent.get(parentId) || []).map((block) => {
      if (ancestry.has(block.id)) {
        return {
          ...block,
          children: [],
        };
      }

      const nextAncestry = new Set(ancestry);
      nextAncestry.add(block.id);

      return {
        ...block,
        children: attach(block.id, nextAncestry),
      };
    });
  };

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
  const [busyAction, setBusyAction] = useState('');
  const saveLockRef = useRef(false);
  const actionLockRef = useRef(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const templateId = template?.id;

  useEffect(() => {
    if (templateId && allBlocks) {
      setBlocks(
        uniqueById(allBlocks).filter(
          (block) => block.template_id === templateId,
        ),
      );
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
    if (
      !templateId
      || saving
      || saveLockRef.current
    ) {
      return;
    }

    if (!form.title.trim()) {
      toast({
        title: 'Informe o título do bloco',
        variant: 'destructive',
      });
      return;
    }

    const parent = form.parent_id
      ? blocks.find((block) => block.id === form.parent_id)
      : null;

    if (form.parent_id && !parent) {
      toast({
        title: 'Bloco pai inválido',
        description: 'Atualize a estrutura e tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    saveLockRef.current = true;
    setSaving(true);

    const payload = {
      template_id: templateId,
      parent_id: parent?.id || null,
      block_type_id: form.block_type_id || null,
      title: form.title.trim(),
      summary: String(form.summary || '').trim(),
      content: String(form.content || '').trim(),
      presenter_notes: String(form.presenter_notes || '').trim(),
      order_index: Math.max(0, toNumber(form.order_index)),
      depth_level: parent
        ? toNumber(parent.depth_level) + 1
        : 0,
      importance_level: Math.min(
        5,
        Math.max(1, toNumber(form.importance_level, 3)),
      ),
      estimated_duration_seconds: Math.max(
        0,
        toNumber(form.estimated_duration_seconds, 60),
      ),
      is_essential: Boolean(form.is_essential),
    };

    try {
      if (editingBlock?.id) {
        const updated = await base44.entities.TemplateBlock.update(
          editingBlock.id,
          payload,
        );

        setBlocks((current) => current.map((block) => (
          block.id === editingBlock.id
            ? {
                ...block,
                ...payload,
                ...(updated || {}),
              }
            : block
        )));

        toast({ title: 'Bloco atualizado' });
      } else {
        const created = await base44.entities.TemplateBlock.create(
          payload,
        );

        if (!created?.id) {
          throw new Error('O novo bloco não retornou um ID válido.');
        }

        setBlocks((current) => [
          ...current,
          created,
        ]);

        toast({ title: 'Bloco criado' });
      }

      setFormOpen(false);
      setEditingBlock(null);

      if (onBlocksChanged) {
        await onBlocksChanged();
      }
    } catch (error) {
      console.error('Erro ao salvar bloco:', error);

      toast({
        title: 'Não foi possível salvar',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  };

  const swapOrder = async (block, target) => {
    if (
      !block?.id
      || !target?.id
      || actionLockRef.current
    ) {
      return;
    }

    actionLockRef.current = true;
    setBusyAction(`move:${block.id}`);

    const blockOrder = toNumber(block.order_index);
    const targetOrder = toNumber(target.order_index);

    try {
      await base44.entities.TemplateBlock.update(
        block.id,
        { order_index: targetOrder },
      );

      try {
        await base44.entities.TemplateBlock.update(
          target.id,
          { order_index: blockOrder },
        );
      } catch (targetError) {
        try {
          await base44.entities.TemplateBlock.update(
            block.id,
            { order_index: blockOrder },
          );
        } catch {
          // A lista será recarregada pelo componente pai.
        }

        throw targetError;
      }

      setBlocks((current) => current.map((item) => {
        if (item.id === block.id) {
          return {
            ...item,
            order_index: targetOrder,
          };
        }

        if (item.id === target.id) {
          return {
            ...item,
            order_index: blockOrder,
          };
        }

        return item;
      }));

      if (onBlocksChanged) {
        await onBlocksChanged();
      }
    } catch (error) {
      console.error('Erro ao mover bloco:', error);

      toast({
        title: 'Não foi possível mover o bloco',
        variant: 'destructive',
      });
    } finally {
      actionLockRef.current = false;
      setBusyAction('');
    }
  };

  const handleMoveUp = async (block) => {
    const siblings = sortSiblings(
      blocks.filter((item) => (
        (item.parent_id || null)
        === (block.parent_id || null)
      )),
    );

    const index = siblings.findIndex(
      (item) => item.id === block.id,
    );

    if (index <= 0) {
      return;
    }

    await swapOrder(block, siblings[index - 1]);
  };

  const handleMoveDown = async (block) => {
    const siblings = sortSiblings(
      blocks.filter((item) => (
        (item.parent_id || null)
        === (block.parent_id || null)
      )),
    );

    const index = siblings.findIndex(
      (item) => item.id === block.id,
    );

    if (index < 0 || index >= siblings.length - 1) {
      return;
    }

    await swapOrder(block, siblings[index + 1]);
  };

  const updateBlockDepthTree = async (
    block,
    {
      newParentId,
      depthDelta,
    },
  ) => {
    if (
      !block?.id
      || actionLockRef.current
    ) {
      return;
    }

    const descendants = collectDescendants(
      block.id,
      blocks,
    );

    actionLockRef.current = true;
    setBusyAction(`level:${block.id}`);

    try {
      const rootDepth = Math.max(
        0,
        toNumber(block.depth_level) + depthDelta,
      );

      await base44.entities.TemplateBlock.update(
        block.id,
        {
          parent_id: newParentId || null,
          depth_level: rootDepth,
        },
      );

      for (const descendant of descendants) {
        await base44.entities.TemplateBlock.update(
          descendant.id,
          {
            depth_level: Math.max(
              0,
              toNumber(descendant.depth_level) + depthDelta,
            ),
          },
        );
      }

      const descendantIds = new Set(
        descendants.map((item) => item.id),
      );

      setBlocks((current) => current.map((item) => {
        if (item.id === block.id) {
          return {
            ...item,
            parent_id: newParentId || null,
            depth_level: rootDepth,
          };
        }

        if (descendantIds.has(item.id)) {
          return {
            ...item,
            depth_level: Math.max(
              0,
              toNumber(item.depth_level) + depthDelta,
            ),
          };
        }

        return item;
      }));

      if (onBlocksChanged) {
        await onBlocksChanged();
      }
    } catch (error) {
      console.error(
        'Erro ao alterar o nível do bloco:',
        error,
      );

      toast({
        title: 'Não foi possível alterar o nível',
        description:
          'Atualize a estrutura antes de tentar novamente.',
        variant: 'destructive',
      });
    } finally {
      actionLockRef.current = false;
      setBusyAction('');
    }
  };

  const handleIndent = async (block) => {
    const siblings = sortSiblings(
      blocks.filter((item) => (
        (item.parent_id || null)
        === (block.parent_id || null)
      )),
    );

    const index = siblings.findIndex(
      (item) => item.id === block.id,
    );

    const previousSibling = index > 0
      ? siblings[index - 1]
      : null;

    if (!previousSibling) {
      return;
    }

    const previousDescendantIds = new Set(
      collectDescendants(block.id, blocks)
        .map((item) => item.id),
    );

    if (
      previousSibling.id === block.id
      || previousDescendantIds.has(previousSibling.id)
    ) {
      toast({
        title: 'Hierarquia inválida',
        variant: 'destructive',
      });
      return;
    }

    await updateBlockDepthTree(block, {
      newParentId: previousSibling.id,
      depthDelta: 1,
    });
  };

  const handleOutdent = async (block) => {
    if (
      toNumber(block.depth_level) <= 0
      || !block.parent_id
    ) {
      return;
    }

    const parent = blocks.find(
      (item) => item.id === block.parent_id,
    );

    if (!parent) {
      toast({
        title: 'Bloco pai não encontrado',
        description: 'Atualize a estrutura.',
        variant: 'destructive',
      });
      return;
    }

    await updateBlockDepthTree(block, {
      newParentId: parent.parent_id || null,
      depthDelta: -1,
    });
  };

  const handleDuplicate = async (block) => {
    if (
      !block?.id
      || actionLockRef.current
    ) {
      return;
    }

    actionLockRef.current = true;
    setBusyAction(`duplicate:${block.id}`);

    const sourceTree = [
      block,
      ...collectDescendants(block.id, blocks),
    ].sort((left, right) => (
      toNumber(left.depth_level)
      - toNumber(right.depth_level)
      || toNumber(left.order_index)
      - toNumber(right.order_index)
    ));

    const siblings = blocks.filter((item) => (
      (item.parent_id || null)
      === (block.parent_id || null)
    ));

    const idMap = new Map();
    const createdBlocks = [];

    try {
      for (const sourceBlock of sourceTree) {
        const isRoot = sourceBlock.id === block.id;

        const created = await base44.entities.TemplateBlock.create({
          template_id: templateId,
          parent_id: isRoot
            ? block.parent_id || null
            : idMap.get(sourceBlock.parent_id) || null,
          block_type_id: sourceBlock.block_type_id || null,
          title: isRoot
            ? buildUniqueCopyTitle(block.title, siblings)
            : sourceBlock.title || '',
          summary: sourceBlock.summary || '',
          content: sourceBlock.content || '',
          presenter_notes: sourceBlock.presenter_notes || '',
          order_index: isRoot
            ? toNumber(block.order_index) + 0.5
            : toNumber(sourceBlock.order_index),
          depth_level: toNumber(sourceBlock.depth_level),
          importance_level: toNumber(
            sourceBlock.importance_level,
            3,
          ),
          estimated_duration_seconds: toNumber(
            sourceBlock.estimated_duration_seconds,
            60,
          ),
          is_essential: Boolean(sourceBlock.is_essential),
        });

        if (!created?.id) {
          throw new Error(
            'A duplicação não retornou um ID válido.',
          );
        }

        idMap.set(sourceBlock.id, created.id);
        createdBlocks.push(created);
      }

      setBlocks((current) => [
        ...current,
        ...createdBlocks,
      ]);

      toast({
        title: sourceTree.length > 1
          ? 'Bloco e subtópicos duplicados'
          : 'Bloco duplicado',
      });

      if (onBlocksChanged) {
        await onBlocksChanged();
      }
    } catch (error) {
      console.error('Erro ao duplicar bloco:', error);

      for (const created of sortDeepestFirst(createdBlocks)) {
        try {
          await base44.entities.TemplateBlock.delete(
            created.id,
          );
        } catch {
          // A lista será recarregada pelo componente pai.
        }
      }

      toast({
        title: 'Não foi possível duplicar',
        description:
          'A cópia incompleta foi removida.',
        variant: 'destructive',
      });
    } finally {
      actionLockRef.current = false;
      setBusyAction('');
    }
  };

  const confirmDelete = async () => {
    const target = deleteTarget;

    if (
      !target?.id
      || actionLockRef.current
    ) {
      return;
    }

    actionLockRef.current = true;
    setBusyAction(`delete:${target.id}`);

    const directChildren = sortSiblings(
      blocks.filter(
        (item) => item.parent_id === target.id,
      ),
    );

    const descendants = collectDescendants(
      target.id,
      blocks,
    );

    try {
      const depthDelta = -1;

      for (const child of directChildren) {
        await base44.entities.TemplateBlock.update(
          child.id,
          {
            parent_id: target.parent_id || null,
            depth_level: Math.max(
              0,
              toNumber(child.depth_level) + depthDelta,
            ),
          },
        );
      }

      const directChildIds = new Set(
        directChildren.map((item) => item.id),
      );

      for (const descendant of descendants) {
        if (directChildIds.has(descendant.id)) {
          continue;
        }

        await base44.entities.TemplateBlock.update(
          descendant.id,
          {
            depth_level: Math.max(
              0,
              toNumber(descendant.depth_level) + depthDelta,
            ),
          },
        );
      }

      await base44.entities.TemplateBlock.delete(
        target.id,
      );

      const descendantIds = new Set(
        descendants.map((item) => item.id),
      );

      setBlocks((current) => current
        .filter((item) => item.id !== target.id)
        .map((item) => {
          if (directChildIds.has(item.id)) {
            return {
              ...item,
              parent_id: target.parent_id || null,
              depth_level: Math.max(
                0,
                toNumber(item.depth_level) - 1,
              ),
            };
          }

          if (descendantIds.has(item.id)) {
            return {
              ...item,
              depth_level: Math.max(
                0,
                toNumber(item.depth_level) - 1,
              ),
            };
          }

          return item;
        }));

      toast({ title: 'Bloco excluído' });

      if (onBlocksChanged) {
        await onBlocksChanged();
      }
    } catch (error) {
      console.error('Erro ao excluir bloco:', error);

      toast({
        title: 'Não foi possível excluir',
        description:
          'A estrutura será atualizada para refletir o estado real.',
        variant: 'destructive',
      });

      if (onBlocksChanged) {
        await onBlocksChanged();
      }
    } finally {
      actionLockRef.current = false;
      setBusyAction('');
      setDeleteTarget(null);
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
              <Button
                size="sm"
                onClick={() => openCreate(null)}
                disabled={Boolean(busyAction) || saving}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Adicionar bloco
              </Button>
            </div>

            {tree.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Este modelo ainda não possui blocos. Clique em &ldquo;Adicionar bloco&rdquo; para começar.
              </div>
            ) : (
              <div
                className={`space-y-2 ${
                  busyAction ? 'pointer-events-none opacity-70' : ''
                }`}
              >
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
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={Boolean(busyAction) || saving}
            >
              Fechar
            </Button>
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
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
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