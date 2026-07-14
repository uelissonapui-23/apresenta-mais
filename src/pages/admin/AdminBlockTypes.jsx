import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlignLeft,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  FileText,
  Image,
  Layers3,
  ListTree,
  Loader2,
  NotebookPen,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Type,
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

const DEFAULT_FORM = {
  name: '',
  code: '',
  description: '',
  icon: 'FileText',
  supports_title: true,
  supports_summary: true,
  supports_content: true,
  supports_notes: true,
  supports_attachment: false,
  order_index: 0,
  active: true,
};

const ICON_OPTIONS = [
  { value: 'FileText', label: 'Texto', icon: FileText },
  { value: 'Type', label: 'Título', icon: Type },
  { value: 'AlignLeft', label: 'Parágrafo', icon: AlignLeft },
  { value: 'ListTree', label: 'Estrutura', icon: ListTree },
  { value: 'NotebookPen', label: 'Anotação', icon: NotebookPen },
  { value: 'Image', label: 'Imagem', icon: Image },
  { value: 'Paperclip', label: 'Anexo', icon: Paperclip },
  { value: 'Sparkles', label: 'Destaque', icon: Sparkles },
];

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getIconComponent(name) {
  return ICON_OPTIONS.find((item) => item.value === name)?.icon || FileText;
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
            Apenas administradores podem gerenciar os tipos de bloco.
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
        <p className="text-sm">Carregando tipos de bloco...</p>
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

function CapabilityBadge({ enabled, icon: Icon, label }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
        enabled
          ? 'border-primary/20 bg-primary/5 text-foreground'
          : 'border-border bg-muted/30 text-muted-foreground opacity-60'
      }`}
    >
      {enabled ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
  );
}

function BlockTypeCard({
  blockType,
  presentationBlockCount,
  templateBlockCount,
  guidedQuestionCount,
  busy,
  onEdit,
  onToggleActive,
  onMove,
  onDelete,
  canMoveUp,
  canMoveDown,
}) {
  const Icon = getIconComponent(blockType.icon);
  const totalUsage = presentationBlockCount + templateBlockCount + guidedQuestionCount;

  return (
    <Card className={`overflow-hidden border-border/70 ${!blockType.active ? 'opacity-70' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="truncate text-lg">
                  {blockType.name || 'Tipo sem nome'}
                </CardTitle>
                <Badge variant={blockType.active ? 'default' : 'secondary'}>
                  {blockType.active ? 'Ativo' : 'Inativo'}
                </Badge>
                <Badge variant="outline">Ordem {normalizeNumber(blockType.order_index)}</Badge>
              </div>
              <p className="mt-1 break-all font-mono text-xs text-primary">
                {blockType.code || 'sem_codigo'}
              </p>
              <p className="mt-2 line-clamp-3 min-h-10 text-sm text-muted-foreground">
                {blockType.description || 'Sem descrição cadastrada.'}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="flex flex-wrap gap-2">
          <CapabilityBadge enabled={blockType.supports_title !== false} icon={Type} label="Título" />
          <CapabilityBadge enabled={blockType.supports_summary !== false} icon={AlignLeft} label="Resumo" />
          <CapabilityBadge enabled={blockType.supports_content !== false} icon={FileText} label="Conteúdo" />
          <CapabilityBadge enabled={blockType.supports_notes !== false} icon={NotebookPen} label="Notas" />
          <CapabilityBadge enabled={blockType.supports_attachment === true} icon={Paperclip} label="Anexos" />
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl border bg-muted/20 p-3 text-center">
          <div>
            <p className="text-lg font-bold">{presentationBlockCount}</p>
            <p className="text-[11px] text-muted-foreground">Blocos usados</p>
          </div>
          <div>
            <p className="text-lg font-bold">{templateBlockCount}</p>
            <p className="text-[11px] text-muted-foreground">Em modelos</p>
          </div>
          <div>
            <p className="text-lg font-bold">{guidedQuestionCount}</p>
            <p className="text-[11px] text-muted-foreground">Perguntas</p>
          </div>
        </div>

        {totalUsage > 0 && (
          <p className="text-xs text-muted-foreground">
            Este tipo está em uso. O código fica protegido para não quebrar conteúdos existentes.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onEdit(blockType)} disabled={busy}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>

          <Button type="button" variant="outline" size="sm" onClick={() => onToggleActive(blockType)} disabled={busy}>
            {blockType.active ? 'Desativar' : 'Ativar'}
          </Button>

          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onMove(blockType, -1)}
              disabled={busy || !canMoveUp}
              aria-label={`Mover ${blockType.name} para cima`}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onMove(blockType, 1)}
              disabled={busy || !canMoveDown}
              aria-label={`Mover ${blockType.name} para baixo`}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(blockType)}
              disabled={busy}
              aria-label={`Excluir ${blockType.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminBlockTypes() {
  const { toast } = useToast();
  const { user, profile, loading: userLoading, isAdmin } = useCurrentUser();

  const [blockTypes, setBlockTypes] = useState([]);
  const [presentationBlocks, setPresentationBlocks] = useState([]);
  const [templateBlocks, setTemplateBlocks] = useState([]);
  const [guidedQuestions, setGuidedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [capabilityFilter, setCapabilityFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlockType, setEditingBlockType] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const hasAdminAccess = isAdmin || profile?.role === 'admin';

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id || !hasAdminAccess) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!silent) setLoading(true);

    try {
      const [typeRows, presentationBlockRows, templateBlockRows, questionRows] = await Promise.all([
        base44.entities.BlockType.list('order_index'),
        base44.entities.PresentationBlock.list('-created_date'),
        base44.entities.TemplateBlock.list('-created_date'),
        base44.entities.GuidedQuestion.list('order_index'),
      ]);

      setBlockTypes(Array.isArray(typeRows) ? typeRows : []);
      setPresentationBlocks(Array.isArray(presentationBlockRows) ? presentationBlockRows : []);
      setTemplateBlocks(Array.isArray(templateBlockRows) ? templateBlockRows : []);
      setGuidedQuestions(Array.isArray(questionRows) ? questionRows : []);
    } catch (error) {
      console.error('Erro ao carregar tipos de bloco:', error);
      toast({
        title: 'Não foi possível carregar os tipos de bloco',
        description: 'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasAdminAccess, toast, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const usageByType = useMemo(() => {
    const map = {};

    blockTypes.forEach((type) => {
      map[type.id] = {
        presentationBlocks: presentationBlocks.filter((item) => item.block_type_id === type.id).length,
        templateBlocks: templateBlocks.filter((item) => item.block_type_id === type.id).length,
        guidedQuestions: guidedQuestions.filter((item) => (
          item.block_type_to_generate === type.id || item.block_type_to_generate === type.code
        )).length,
      };
    });

    return map;
  }, [blockTypes, guidedQuestions, presentationBlocks, templateBlocks]);

  const sortedBlockTypes = useMemo(() => (
    [...blockTypes].sort((a, b) => (
      normalizeNumber(a.order_index) - normalizeNumber(b.order_index)
      || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')
    ))
  ), [blockTypes]);

  const filteredBlockTypes = useMemo(() => {
    const term = search.trim().toLowerCase();

    return sortedBlockTypes.filter((item) => {
      if (statusFilter === 'active' && !item.active) return false;
      if (statusFilter === 'inactive' && item.active) return false;

      if (capabilityFilter !== 'all') {
        const capabilityMap = {
          title: item.supports_title !== false,
          summary: item.supports_summary !== false,
          content: item.supports_content !== false,
          notes: item.supports_notes !== false,
          attachment: item.supports_attachment === true,
        };
        if (!capabilityMap[capabilityFilter]) return false;
      }

      if (!term) return true;
      return [item.name, item.code, item.description, item.icon]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [capabilityFilter, search, sortedBlockTypes, statusFilter]);

  const activeCount = blockTypes.filter((item) => item.active).length;
  const attachmentCount = blockTypes.filter((item) => item.supports_attachment).length;
  const totalUsed = blockTypes.filter((item) => {
    const usage = usageByType[item.id];
    return usage && (usage.presentationBlocks + usage.templateBlocks + usage.guidedQuestions > 0);
  }).length;

  const openCreate = () => {
    const nextOrder = sortedBlockTypes.length
      ? Math.max(...sortedBlockTypes.map((item) => normalizeNumber(item.order_index))) + 1
      : 0;

    setEditingBlockType(null);
    setForm({ ...DEFAULT_FORM, order_index: nextOrder });
    setDialogOpen(true);
  };

  const openEdit = (blockType) => {
    setEditingBlockType(blockType);
    setForm({
      name: blockType.name || '',
      code: blockType.code || '',
      description: blockType.description || '',
      icon: blockType.icon || 'FileText',
      supports_title: blockType.supports_title !== false,
      supports_summary: blockType.supports_summary !== false,
      supports_content: blockType.supports_content !== false,
      supports_notes: blockType.supports_notes !== false,
      supports_attachment: blockType.supports_attachment === true,
      order_index: normalizeNumber(blockType.order_index),
      active: blockType.active !== false,
    });
    setDialogOpen(true);
  };

  const editingUsage = editingBlockType ? usageByType[editingBlockType.id] : null;
  const editingIsUsed = Boolean(editingUsage && (
    editingUsage.presentationBlocks + editingUsage.templateBlocks + editingUsage.guidedQuestions > 0
  ));

  const handleNameChange = (value) => {
    setForm((current) => ({
      ...current,
      name: value,
      code: editingBlockType || current.code
        ? current.code
        : normalizeCode(value),
    }));
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const code = normalizeCode(form.code || form.name);

    if (!name || !code) {
      toast({
        title: 'Preencha os campos obrigatórios',
        description: 'Informe o nome e o código do tipo de bloco.',
        variant: 'destructive',
      });
      return;
    }

    const duplicateName = blockTypes.some((item) => (
      item.id !== editingBlockType?.id
      && String(item.name || '').trim().toLowerCase() === name.toLowerCase()
    ));
    const duplicateCode = blockTypes.some((item) => (
      item.id !== editingBlockType?.id
      && normalizeCode(item.code) === code
    ));

    if (duplicateName || duplicateCode) {
      toast({
        title: 'Tipo de bloco já cadastrado',
        description: duplicateCode
          ? 'Já existe um tipo usando esse código.'
          : 'Já existe um tipo usando esse nome.',
        variant: 'destructive',
      });
      return;
    }

    if (!form.supports_title && !form.supports_summary && !form.supports_content && !form.supports_notes && !form.supports_attachment) {
      toast({
        title: 'Nenhum recurso habilitado',
        description: 'Habilite pelo menos um campo ou recurso para esse tipo de bloco.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    const payload = {
      name,
      code: editingIsUsed ? editingBlockType.code : code,
      description: form.description.trim(),
      icon: form.icon || 'FileText',
      supports_title: Boolean(form.supports_title),
      supports_summary: Boolean(form.supports_summary),
      supports_content: Boolean(form.supports_content),
      supports_notes: Boolean(form.supports_notes),
      supports_attachment: Boolean(form.supports_attachment),
      order_index: normalizeNumber(form.order_index),
      active: Boolean(form.active),
    };

    try {
      if (editingBlockType) {
        const updated = await base44.entities.BlockType.update(editingBlockType.id, payload);
        setBlockTypes((current) => current.map((item) => (
          item.id === editingBlockType.id ? { ...item, ...payload, ...updated } : item
        )));
        toast({ title: 'Tipo de bloco atualizado' });
      } else {
        const created = await base44.entities.BlockType.create(payload);
        setBlockTypes((current) => [...current, created]);
        toast({ title: 'Tipo de bloco criado' });
      }

      setDialogOpen(false);
      setEditingBlockType(null);
      setForm(DEFAULT_FORM);
    } catch (error) {
      console.error('Erro ao salvar tipo de bloco:', error);
      toast({
        title: 'Não foi possível salvar',
        description: 'Revise os dados e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (blockType) => {
    setBusyId(blockType.id);
    const nextValue = !blockType.active;

    try {
      await base44.entities.BlockType.update(blockType.id, { active: nextValue });
      setBlockTypes((current) => current.map((item) => (
        item.id === blockType.id ? { ...item, active: nextValue } : item
      )));
      toast({ title: nextValue ? 'Tipo ativado' : 'Tipo desativado' });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({ title: 'Não foi possível alterar o status', variant: 'destructive' });
    } finally {
      setBusyId('');
    }
  };

  const handleMove = async (blockType, direction) => {
    const currentIndex = sortedBlockTypes.findIndex((item) => item.id === blockType.id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sortedBlockTypes.length) return;

    const target = sortedBlockTypes[targetIndex];
    const currentOrder = normalizeNumber(blockType.order_index, currentIndex);
    const targetOrder = normalizeNumber(target.order_index, targetIndex);

    setBusyId(blockType.id);
    try {
      await Promise.all([
        base44.entities.BlockType.update(blockType.id, { order_index: targetOrder }),
        base44.entities.BlockType.update(target.id, { order_index: currentOrder }),
      ]);
      setBlockTypes((current) => current.map((item) => {
        if (item.id === blockType.id) return { ...item, order_index: targetOrder };
        if (item.id === target.id) return { ...item, order_index: currentOrder };
        return item;
      }));
    } catch (error) {
      console.error('Erro ao reordenar:', error);
      toast({ title: 'Não foi possível alterar a ordem', variant: 'destructive' });
    } finally {
      setBusyId('');
    }
  };

  const requestDelete = (blockType) => {
    const usage = usageByType[blockType.id] || {
      presentationBlocks: 0,
      templateBlocks: 0,
      guidedQuestions: 0,
    };

    if (usage.presentationBlocks + usage.templateBlocks + usage.guidedQuestions > 0) {
      toast({
        title: 'Este tipo está em uso',
        description: 'Desative o tipo em vez de excluí-lo para preservar apresentações, modelos e fluxos guiados.',
        variant: 'destructive',
      });
      return;
    }

    setDeleteTarget(blockType);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);

    try {
      await base44.entities.BlockType.delete(deleteTarget.id);
      setBlockTypes((current) => current.filter((item) => item.id !== deleteTarget.id));
      toast({ title: 'Tipo de bloco excluído' });
      setDeleteTarget(null);
    } catch (error) {
      console.error('Erro ao excluir tipo de bloco:', error);
      toast({
        title: 'Não foi possível excluir',
        description: 'Verifique se o tipo ainda possui algum vínculo.',
        variant: 'destructive',
      });
    } finally {
      setBusyId('');
    }
  };

  if (userLoading || loading) return <LoadingState />;
  if (!hasAdminAccess) return <AccessDenied />;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
            <Link to="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Administração
            </Link>
          </Button>
          <p className="text-sm font-medium text-primary">Estrutura do conteúdo</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Tipos de bloco</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Defina quais campos cada bloco aceita. Esses tipos alimentam o editor, os modelos e a criação guiada.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setRefreshing(true);
              loadData({ silent: true });
            }}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo tipo
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={Layers3} label="Tipos" value={blockTypes.length} description="Total cadastrado" />
        <SummaryCard icon={CheckCircle2} label="Ativos" value={activeCount} description="Disponíveis no editor" />
        <SummaryCard icon={Paperclip} label="Com anexos" value={attachmentCount} description="Aceitam mídia ou arquivo" />
        <SummaryCard icon={ListTree} label="Em uso" value={totalUsed} description="Protegidos contra exclusão" />
      </section>

      <Card className="border-border/70">
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_190px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, código ou descrição..."
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
            <Select value={capabilityFilter} onValueChange={setCapabilityFilter}>
              <SelectTrigger><SelectValue placeholder="Recurso" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os recursos</SelectItem>
                <SelectItem value="title">Com título</SelectItem>
                <SelectItem value="summary">Com resumo</SelectItem>
                <SelectItem value="content">Com conteúdo</SelectItem>
                <SelectItem value="notes">Com notas</SelectItem>
                <SelectItem value="attachment">Com anexos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredBlockTypes.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            icon={Layers3}
            title={blockTypes.length ? 'Nenhum tipo encontrado' : 'Nenhum tipo de bloco cadastrado'}
            description={blockTypes.length
              ? 'Altere a busca ou os filtros para encontrar outros tipos.'
              : 'Cadastre os tipos que poderão ser usados para estruturar as apresentações.'}
            actionLabel={blockTypes.length ? undefined : 'Criar primeiro tipo'}
            onAction={blockTypes.length ? undefined : openCreate}
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredBlockTypes.map((blockType) => {
            const originalIndex = sortedBlockTypes.findIndex((item) => item.id === blockType.id);
            const usage = usageByType[blockType.id] || {
              presentationBlocks: 0,
              templateBlocks: 0,
              guidedQuestions: 0,
            };

            return (
              <BlockTypeCard
                key={blockType.id}
                blockType={blockType}
                presentationBlockCount={usage.presentationBlocks}
                templateBlockCount={usage.templateBlocks}
                guidedQuestionCount={usage.guidedQuestions}
                busy={busyId === blockType.id}
                onEdit={openEdit}
                onToggleActive={handleToggleActive}
                onMove={handleMove}
                onDelete={requestDelete}
                canMoveUp={originalIndex > 0}
                canMoveDown={originalIndex >= 0 && originalIndex < sortedBlockTypes.length - 1}
              />
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingBlockType ? 'Editar tipo de bloco' : 'Novo tipo de bloco'}</DialogTitle>
            <DialogDescription>
              Configure os campos disponíveis quando esse tipo for escolhido no editor.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="block-type-name">Nome *</Label>
                <Input
                  id="block-type-name"
                  value={form.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder="Ex.: Aplicação prática"
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="block-type-code">Código *</Label>
                <Input
                  id="block-type-code"
                  value={form.code}
                  onChange={(event) => setForm((current) => ({ ...current, code: normalizeCode(event.target.value) }))}
                  placeholder="aplicacao_pratica"
                  className="font-mono"
                  disabled={editingIsUsed}
                  maxLength={80}
                />
                <p className="text-xs text-muted-foreground">
                  {editingIsUsed
                    ? 'O código não pode ser alterado porque o tipo já está em uso.'
                    : 'Use letras, números e sublinhado. O código identifica o tipo internamente.'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-type-description">Descrição</Label>
              <Textarea
                id="block-type-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Explique quando este tipo deve ser utilizado."
                rows={3}
                maxLength={400}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select value={form.icon} onValueChange={(value) => setForm((current) => ({ ...current, icon: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="block-type-order">Ordem</Label>
                <Input
                  id="block-type-order"
                  type="number"
                  min="0"
                  value={form.order_index}
                  onChange={(event) => setForm((current) => ({ ...current, order_index: normalizeNumber(event.target.value) }))}
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="mb-4 flex items-center gap-3">
                {React.createElement(getIconComponent(form.icon), { className: 'h-6 w-6 text-primary' })}
                <div>
                  <p className="font-semibold">Campos disponíveis</p>
                  <p className="text-xs text-muted-foreground">Escolha o que o usuário poderá preencher neste bloco.</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['supports_title', 'Título', 'Nome principal do bloco', Type],
                  ['supports_summary', 'Resumo', 'Versão curta para modos compactos', AlignLeft],
                  ['supports_content', 'Conteúdo', 'Texto completo do assunto', FileText],
                  ['supports_notes', 'Notas do apresentador', 'Informações privadas para quem apresenta', NotebookPen],
                  ['supports_attachment', 'Anexos', 'Imagens, arquivos, vídeos ou links', Paperclip],
                ].map(([key, label, description, Icon]) => (
                  <div key={key} className="flex items-start justify-between gap-3 rounded-xl border bg-background p-3">
                    <div className="flex min-w-0 gap-2.5">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <Label htmlFor={key} className="cursor-pointer">{label}</Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                      </div>
                    </div>
                    <Switch
                      id={key}
                      checked={Boolean(form[key])}
                      onCheckedChange={(checked) => setForm((current) => ({ ...current, [key]: checked }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div>
                <Label htmlFor="block-type-active" className="cursor-pointer">Tipo ativo</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tipos inativos continuam preservados nos conteúdos antigos, mas não aparecem para novas escolhas.
                </p>
              </div>
              <Switch
                id="block-type-active"
                checked={Boolean(form.active)}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingBlockType ? 'Salvar alterações' : 'Criar tipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir tipo de bloco?"
        description={`O tipo “${deleteTarget?.name || ''}” será removido permanentemente. Essa ação não poderá ser desfeita.`}
        confirmLabel="Excluir tipo"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}