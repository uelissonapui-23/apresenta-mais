import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  Layers3,
  LayoutTemplate,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  XCircle,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import EmptyState from '@/components/shared/EmptyState';
import TemplateBlockEditorDialog from '@/components/admin/TemplateBlockEditorDialog';

const DEFAULT_FORM = {
  name: '',
  description: '',
  thumbnail_url: '',
  presentation_type_id: '',
  objective_id: '',
  communication_style_id: '',
  is_official: true,
  is_public: true,
  is_premium: false,
  active: true,
};

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
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

function sortDeepestFirst(blocks) {
  return [...blocks].sort((left, right) => {
    const depthDifference = (
      normalizeNumber(right?.depth_level)
      - normalizeNumber(left?.depth_level)
    );

    if (depthDifference !== 0) {
      return depthDifference;
    }

    return (
      normalizeNumber(right?.order_index)
      - normalizeNumber(left?.order_index)
    );
  });
}

function sortForHierarchyCreation(blocks) {
  return [...blocks].sort((left, right) => {
    const depthDifference = (
      normalizeNumber(left?.depth_level)
      - normalizeNumber(right?.depth_level)
    );

    if (depthDifference !== 0) {
      return depthDifference;
    }

    return (
      normalizeNumber(left?.order_index)
      - normalizeNumber(right?.order_index)
    );
  });
}

function createUniqueCopyName(baseName, templates) {
  const normalizedBase = String(baseName || 'Modelo').trim() || 'Modelo';
  const existingNames = new Set(
    uniqueById(templates).map((template) => (
      String(template.name || '').trim().toLowerCase()
    )),
  );

  let attempt = 1;
  let candidate = `${normalizedBase} — cópia`;

  while (existingNames.has(candidate.toLowerCase())) {
    attempt += 1;
    candidate = `${normalizedBase} — cópia ${attempt}`;
  }

  return candidate;
}

function AccessDenied() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-xl items-center px-4 py-10">
      <Card className="w-full border-destructive/25">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <XCircle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Apenas administradores podem gerenciar os modelos oficiais.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <p className="text-sm">Carregando modelos...</p>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, description }) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-5 w-5 text-foreground/70" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateCard({
  template,
  typeName,
  objectiveName,
  styleName,
  blockCount,
  busy,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
  onPreview,
}) {
  return (
    <Card className={`overflow-hidden border-border/70 ${!template.active ? 'opacity-70' : ''}`}>
      {template.thumbnail_url ? (
        <div className="aspect-[16/7] overflow-hidden bg-muted">
          <img
            src={template.thumbnail_url}
            alt={template.name || 'Modelo'}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex aspect-[16/7] items-center justify-center bg-gradient-to-br from-primary/15 via-background to-muted">
          <LayoutTemplate className="h-12 w-12 text-primary/70" />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate text-lg">
                {template.name || 'Modelo sem nome'}
              </CardTitle>
              <Badge variant={template.active ? 'default' : 'secondary'}>
                {template.active ? 'Ativo' : 'Inativo'}
              </Badge>
              {template.is_official && (
                <Badge variant="outline" className="gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Oficial
                </Badge>
              )}
              {template.is_premium && (
                <Badge className="gap-1 bg-amber-500 text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                  Premium
                </Badge>
              )}
            </div>

            <p className="mt-2 line-clamp-3 min-h-10 text-sm text-muted-foreground">
              {template.description || 'Sem descrição cadastrada.'}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="flex flex-wrap gap-2 text-xs">
          {typeName && <Badge variant="outline">{typeName}</Badge>}
          {objectiveName && <Badge variant="outline">{objectiveName}</Badge>}
          {styleName && <Badge variant="outline">{styleName}</Badge>}
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Blocos</p>
            <p className="font-semibold">{blockCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Visibilidade</p>
            <p className="font-semibold">{template.is_public ? 'Público' : 'Privado'}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onPreview(template)}>
            <Eye className="mr-2 h-4 w-4" />
            Estrutura
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(template)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDuplicate(template)} disabled={busy}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleActive(template)}
            disabled={busy}
          >
            {template.active ? (
              <Lock className="mr-2 h-4 w-4" />
            ) : (
              <Unlock className="mr-2 h-4 w-4" />
            )}
            {template.active ? 'Desativar' : 'Ativar'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(template)}
            disabled={busy}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function buildTree(blocks) {
  const sorted = [...blocks].sort((a, b) => {
    const depthDiff = normalizeNumber(a.depth_level) - normalizeNumber(b.depth_level);
    if (depthDiff !== 0) return depthDiff;
    return normalizeNumber(a.order_index) - normalizeNumber(b.order_index);
  });

  const byParent = new Map();
  sorted.forEach((block) => {
    const key = block.parent_id || 'root';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(block);
  });

  const attach = (parentId = 'root') => (
    (byParent.get(parentId) || []).map((block) => ({
      ...block,
      children: attach(block.id),
    }))
  );

  return attach();
}

function StructureItem({ node, level = 0 }) {
  return (
    <div>
      <div
        className="flex items-start gap-3 rounded-lg border border-border/70 bg-background p-3"
        style={{ marginLeft: Math.min(level * 14, 56) }}
      >
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
          {normalizeNumber(node.order_index) + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{node.title || 'Bloco sem título'}</p>
            {node.is_essential && <Badge variant="outline">Essencial</Badge>}
            {node.is_hidden && <Badge variant="secondary">Oculto</Badge>}
          </div>
          {node.summary && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{node.summary}</p>
          )}
        </div>
      </div>

      {node.children?.length > 0 && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <StructureItem key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminTemplates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    user,
    isAdmin,
    loading: userLoading,
  } = useCurrentUser();

  const [templates, setTemplates] = useState([]);
  const [templateBlocks, setTemplateBlocks] = useState([]);
  const [types, setTypes] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [styles, setStyles] = useState([]);
  const [blockTypes, setBlockTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const saveLockRef = useRef(false);
  const actionLockRef = useRef(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [structureEditorTemplate, setStructureEditorTemplate] = useState(null);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id || !isAdmin) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!silent) setLoading(true);

    try {
      const [templateRows, blockRows, typeRows, objectiveRows, styleRows, blockTypeRows] = await Promise.all([
        base44.entities.PresentationTemplate.list('-updated_date'),
        base44.entities.TemplateBlock.list('order_index'),
        base44.entities.PresentationType.list('order_index'),
        base44.entities.PresentationObjective.list('order_index'),
        base44.entities.CommunicationStyle.list('order_index'),
        base44.entities.BlockType.filter({ active: true }, 'order_index'),
      ]);

      const normalizedTemplates = uniqueById(templateRows);
      const validTemplateIds = new Set(
        normalizedTemplates.map((template) => template.id),
      );

      setTemplates(normalizedTemplates);
      setTemplateBlocks(
        uniqueById(blockRows).filter(
          (block) => validTemplateIds.has(block.template_id),
        ),
      );
      setTypes(uniqueById(typeRows));
      setObjectives(uniqueById(objectiveRows));
      setStyles(uniqueById(styleRows));
      setBlockTypes(uniqueById(blockTypeRows));
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      toast({
        title: 'Falha ao carregar os modelos',
        description: 'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, toast, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const typeMap = useMemo(() => Object.fromEntries(types.map((item) => [item.id, item.name])), [types]);
  const objectiveMap = useMemo(() => Object.fromEntries(objectives.map((item) => [item.id, item.name])), [objectives]);
  const styleMap = useMemo(() => Object.fromEntries(styles.map((item) => [item.id, item.name])), [styles]);

  const blockCountMap = useMemo(() => {
    const result = {};
    templateBlocks.forEach((block) => {
      result[block.template_id] = (result[block.template_id] || 0) + 1;
    });
    return result;
  }, [templateBlocks]);

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return templates.filter((template) => {
      if (statusFilter === 'active' && !template.active) return false;
      if (statusFilter === 'inactive' && template.active) return false;
      if (kindFilter === 'official' && !template.is_official) return false;
      if (kindFilter === 'public' && !template.is_public) return false;
      if (kindFilter === 'premium' && !template.is_premium) return false;
      if (kindFilter === 'free' && template.is_premium) return false;
      if (typeFilter !== 'all' && template.presentation_type_id !== typeFilter) return false;

      if (!query) return true;

      return [
        template.name,
        template.description,
        typeMap[template.presentation_type_id],
        objectiveMap[template.objective_id],
        styleMap[template.communication_style_id],
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [kindFilter, objectiveMap, search, statusFilter, styleMap, templates, typeFilter, typeMap]);

  const openCreate = () => {
    setEditingTemplate(null);
    setForm({ ...DEFAULT_FORM });
    setDialogOpen(true);
  };

  const openEdit = (template) => {
    setEditingTemplate(template);
    setForm({
      name: template.name || '',
      description: template.description || '',
      thumbnail_url: template.thumbnail_url || '',
      presentation_type_id: template.presentation_type_id || '',
      objective_id: template.objective_id || '',
      communication_style_id: template.communication_style_id || '',
      is_official: template.is_official !== false,
      is_public: template.is_public !== false,
      is_premium: Boolean(template.is_premium),
      active: template.active !== false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (saving || saveLockRef.current) {
      return;
    }

    if (!form.name.trim()) {
      toast({ title: 'Informe o nome do modelo', variant: 'destructive' });
      return;
    }

    const duplicate = templates.some((template) => (
      template.id !== editingTemplate?.id
      && String(template.name || '').trim().toLowerCase() === form.name.trim().toLowerCase()
    ));

    if (duplicate) {
      toast({ title: 'Já existe um modelo com esse nome', variant: 'destructive' });
      return;
    }

    const payload = {
      owner_user_id: editingTemplate?.owner_user_id || user.id,
      name: form.name.trim(),
      description: form.description.trim(),
      thumbnail_url: form.thumbnail_url.trim(),
      presentation_type_id: form.presentation_type_id || null,
      objective_id: form.objective_id || null,
      communication_style_id: form.communication_style_id || null,
      is_official: Boolean(form.is_official),
      is_public: Boolean(form.is_public),
      is_premium: Boolean(form.is_premium),
      active: Boolean(form.active),
    };

    saveLockRef.current = true;
    setSaving(true);

    try {
      if (editingTemplate?.id) {
        const updated = await base44.entities.PresentationTemplate.update(editingTemplate.id, payload);
        setTemplates((current) => current.map((item) => item.id === editingTemplate.id ? { ...item, ...updated, ...payload } : item));
        toast({ title: 'Modelo atualizado' });
      } else {
        const created = await base44.entities.PresentationTemplate.create(payload);
        setTemplates((current) => [created, ...current]);
        toast({ title: 'Modelo criado' });
      }

      setDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      toast({
        title: 'Não foi possível salvar o modelo',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  };

  const handleToggleActive = async (template) => {
    if (!template?.id || busyId || actionLockRef.current) {
      return;
    }

    actionLockRef.current = true;
    setBusyId(template.id);

    try {
      const active = !template.active;
      const updated = await base44.entities.PresentationTemplate.update(
        template.id,
        { active },
      );

      setTemplates((current) => current.map((item) => (
        item.id === template.id
          ? {
              ...item,
              ...(updated || {}),
              active,
            }
          : item
      )));

      toast({
        title: active
          ? 'Modelo ativado'
          : 'Modelo desativado',
      });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: 'Não foi possível alterar o status',
        variant: 'destructive',
      });
    } finally {
      actionLockRef.current = false;
      setBusyId('');
    }
  };

  const handleDuplicate = async (template) => {
    if (
      !template?.id
      || !user?.id
      || busyId
      || actionLockRef.current
    ) {
      return;
    }

    actionLockRef.current = true;
    setBusyId(template.id);

    let createdTemplate = null;
    const createdBlocks = [];

    try {
      createdTemplate = await base44.entities.PresentationTemplate.create({
        owner_user_id: user.id,
        presentation_type_id: template.presentation_type_id || null,
        objective_id: template.objective_id || null,
        communication_style_id: template.communication_style_id || null,
        name: createUniqueCopyName(template.name, templates),
        description: template.description || '',
        thumbnail_url: template.thumbnail_url || '',
        is_official: false,
        is_public: false,
        is_premium: false,
        active: true,
      });

      if (!createdTemplate?.id) {
        throw new Error('A cópia do modelo não retornou um ID válido.');
      }

      const sourceBlocks = sortForHierarchyCreation(
        uniqueById(templateBlocks).filter(
          (block) => block.template_id === template.id,
        ),
      );

      const idMap = new Map();
      const pending = [...sourceBlocks];
      let safetyCounter = pending.length + 1;

      while (pending.length > 0 && safetyCounter > 0) {
        safetyCounter -= 1;
        let createdInRound = 0;

        for (let index = pending.length - 1; index >= 0; index -= 1) {
          const block = pending[index];
          const parentReady = (
            !block.parent_id
            || idMap.has(block.parent_id)
          );

          if (!parentReady) {
            continue;
          }

          const createdBlock = await base44.entities.TemplateBlock.create({
            template_id: createdTemplate.id,
            parent_id: block.parent_id
              ? idMap.get(block.parent_id)
              : null,
            block_type_id: block.block_type_id || null,
            title: block.title || '',
            summary: block.summary || '',
            content: block.content || '',
            additional_content: block.additional_content || '',
            presenter_notes: block.presenter_notes || '',
            order_index: normalizeNumber(block.order_index),
            depth_level: normalizeNumber(block.depth_level),
            importance_level: normalizeNumber(
              block.importance_level,
              3,
            ),
            estimated_duration_seconds: normalizeNumber(
              block.estimated_duration_seconds,
              60,
            ),
            is_essential: Boolean(block.is_essential),
            is_hidden: Boolean(block.is_hidden),
            show_to_audience: block.show_to_audience !== false,
            icon: block.icon || '',
            background_style: block.background_style || '',
            text_style: block.text_style || '',
          });

          if (!createdBlock?.id) {
            throw new Error(
              'A cópia de um bloco não retornou um ID válido.',
            );
          }

          idMap.set(block.id, createdBlock.id);
          createdBlocks.push(createdBlock);
          pending.splice(index, 1);
          createdInRound += 1;
        }

        if (createdInRound === 0) {
          throw new Error(
            'A estrutura possui uma referência de pai inválida.',
          );
        }
      }

      if (pending.length > 0) {
        throw new Error(
          'A estrutura não pôde ser copiada por completo.',
        );
      }

      setTemplates((current) => [
        createdTemplate,
        ...current,
      ]);

      setTemplateBlocks((current) => [
        ...current,
        ...createdBlocks,
      ]);

      toast({
        title: 'Modelo duplicado com sucesso',
      });
    } catch (error) {
      console.error('Erro ao duplicar modelo:', error);

      for (const block of sortDeepestFirst(createdBlocks)) {
        try {
          await base44.entities.TemplateBlock.delete(block.id);
        } catch (cleanupError) {
          console.error(
            'Erro ao remover bloco incompleto:',
            cleanupError,
          );
        }
      }

      if (createdTemplate?.id) {
        try {
          const remainingBlocks = uniqueById(
            await base44.entities.TemplateBlock.filter({
              template_id: createdTemplate.id,
            }),
          );

          for (const block of sortDeepestFirst(remainingBlocks)) {
            await base44.entities.TemplateBlock.delete(block.id);
          }

          await base44.entities.PresentationTemplate.delete(
            createdTemplate.id,
          );
        } catch (cleanupError) {
          console.error(
            'Erro ao remover modelo incompleto:',
            cleanupError,
          );
        }
      }

      toast({
        title: 'Não foi possível duplicar o modelo',
        description:
          error.message
          || 'A cópia incompleta foi removida.',
        variant: 'destructive',
      });
    } finally {
      actionLockRef.current = false;
      setBusyId('');
    }
  };

  const confirmDelete = async () => {
    const template = deleteTarget;

    if (
      !template?.id
      || busyId
      || actionLockRef.current
    ) {
      return;
    }

    actionLockRef.current = true;
    setBusyId(template.id);

    try {
      const relatedBlocks = uniqueById(
        await base44.entities.TemplateBlock.filter({
          template_id: template.id,
        }),
      );

      for (const block of sortDeepestFirst(relatedBlocks)) {
        await base44.entities.TemplateBlock.delete(block.id);
      }

      await base44.entities.PresentationTemplate.delete(
        template.id,
      );

      setTemplates((current) => current.filter(
        (item) => item.id !== template.id,
      ));

      setTemplateBlocks((current) => current.filter(
        (block) => block.template_id !== template.id,
      ));

      toast({
        title: 'Modelo excluído',
      });
    } catch (error) {
      console.error('Erro ao excluir modelo:', error);

      toast({
        title: 'Não foi possível excluir o modelo',
        description:
          'A exclusão foi interrompida para evitar inconsistências.',
        variant: 'destructive',
      });

      await loadData({ silent: true });
    } finally {
      actionLockRef.current = false;
      setBusyId('');
      setDeleteTarget(null);
    }
  };

  const handleRefresh = async () => {
    if (refreshing || saving || busyId) {
      return;
    }

    setRefreshing(true);
    await loadData({ silent: true });
  };

  const previewBlocks = previewTemplate
    ? buildTree(templateBlocks.filter((block) => block.template_id === previewTemplate.id))
    : [];

  if (userLoading || loading) return <LoadingState />;
  if (!isAdmin) return <AccessDenied />;

  const activeCount = templates.filter((item) => item.active).length;
  const officialCount = templates.filter((item) => item.is_official).length;
  const premiumCount = templates.filter((item) => item.is_premium).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Administração
            </Link>
          </Button>
          <p className="text-sm font-medium text-primary">Conteúdo estrutural</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Modelos de apresentação</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Gerencie os modelos que ajudam o usuário a começar com uma estrutura pronta.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo modelo
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={LayoutTemplate} label="Modelos" value={templates.length} description="Total cadastrado" />
        <SummaryCard icon={CheckCircle2} label="Ativos" value={activeCount} description="Disponíveis para uso" />
        <SummaryCard icon={ShieldCheck} label="Oficiais" value={officialCount} description="Mantidos pela equipe" />
        <SummaryCard icon={Sparkles} label="Premium" value={premiumCount} description="Recursos pagos" />
      </section>

      <Card className="border-border/70">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_180px_180px_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar modelos..."
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="official">Oficiais</SelectItem>
              <SelectItem value="public">Públicos</SelectItem>
              <SelectItem value="free">Gratuitos</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {types.map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filteredTemplates.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            icon={LayoutTemplate}
            title={templates.length === 0 ? 'Nenhum modelo cadastrado' : 'Nenhum modelo encontrado'}
            description={templates.length === 0 ? 'Crie o primeiro modelo oficial do aplicativo.' : 'Ajuste os filtros ou a busca.'}
            actionLabel={templates.length === 0 ? 'Criar modelo' : undefined}
            onAction={templates.length === 0 ? openCreate : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              typeName={typeMap[template.presentation_type_id]}
              objectiveName={objectiveMap[template.objective_id]}
              styleName={styleMap[template.communication_style_id]}
              blockCount={blockCountMap[template.id] || 0}
              busy={busyId === template.id}
              onEdit={openEdit}
              onDuplicate={handleDuplicate}
              onToggleActive={handleToggleActive}
              onDelete={setDeleteTarget}
              onPreview={setPreviewTemplate}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Editar modelo' : 'Novo modelo'}</DialogTitle>
            <DialogDescription>
              Configure os dados principais. A estrutura de blocos pode ser ajustada na página administrativa específica do modelo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid gap-2">
              <Label htmlFor="template-name">Nome *</Label>
              <Input
                id="template-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex.: Pregação temática"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="template-description">Descrição</Label>
              <Textarea
                id="template-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Explique para qual situação este modelo é indicado."
                rows={4}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="template-thumbnail">Imagem de capa</Label>
              <Input
                id="template-thumbnail"
                value={form.thumbnail_url}
                onChange={(event) => setForm((current) => ({ ...current, thumbnail_url: event.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={form.presentation_type_id || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, presentation_type_id: value === 'none' ? '' : value }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem tipo</SelectItem>
                    {types.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Objetivo</Label>
                <Select value={form.objective_id || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, objective_id: value === 'none' ? '' : value }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem objetivo</SelectItem>
                    {objectives.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Estilo</Label>
                <Select value={form.communication_style_id || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, communication_style_id: value === 'none' ? '' : value }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem estilo</SelectItem>
                    {styles.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
              {[
                ['is_official', 'Modelo oficial', 'Identifica modelos mantidos pela equipe.'],
                ['is_public', 'Modelo público', 'Permite que usuários encontrem este modelo.'],
                ['is_premium', 'Recurso premium', 'Restringe o uso a planos compatíveis.'],
                ['active', 'Modelo ativo', 'Disponibiliza o modelo no aplicativo.'],
              ].map(([key, title, description]) => (
                <div key={key} className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 p-3">
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Switch checked={Boolean(form[key])} onCheckedChange={(checked) => setForm((current) => ({ ...current, [key]: checked }))} />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewTemplate)} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name || 'Estrutura do modelo'}</DialogTitle>
            <DialogDescription>
              Visualização dos blocos cadastrados neste modelo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {previewBlocks.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Este modelo ainda não possui blocos.
              </div>
            ) : (
              previewBlocks.map((node) => <StructureItem key={node.id} node={node} />)
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Fechar</Button>
            {previewTemplate?.id && (
              <Button onClick={() => {
                setStructureEditorTemplate(previewTemplate);
                setPreviewTemplate(null);
              }}>
                <Layers3 className="mr-2 h-4 w-4" />
                Editar estrutura
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir modelo?"
        description={`O modelo “${deleteTarget?.name || ''}” e todos os seus blocos serão excluídos definitivamente.`}
        confirmLabel="Excluir definitivamente"
        variant="destructive"
        onConfirm={confirmDelete}
        loading={Boolean(deleteTarget && busyId === deleteTarget.id)}
      />

      <TemplateBlockEditorDialog
        open={Boolean(structureEditorTemplate)}
        onOpenChange={(open) => !open && setStructureEditorTemplate(null)}
        template={structureEditorTemplate}
        blocks={templateBlocks}
        blockTypes={blockTypes}
        onBlocksChanged={handleRefresh}
      />
    </div>
  );
}