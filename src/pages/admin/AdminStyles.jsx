import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Lightbulb,
  Loader2,
  MessageCircleQuestion,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
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
  description: '',
  order_index: 0,
  active: true,
};

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
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
            Apenas administradores podem gerenciar os estilos das apresentações.
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
        <p className="text-sm">Carregando estilos...</p>
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
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-5 w-5 text-foreground/70" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StyleCard({
  style,
  presentationCount,
  templateCount,
  flowCount,
  tipCount,
  busy,
  onEdit,
  onToggleActive,
  onMove,
  onDelete,
  canMoveUp,
  canMoveDown,
}) {

  return (
    <Card className={`overflow-hidden border-border/70 ${!style.active ? 'opacity-70' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageCircleQuestion className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="truncate text-lg">
                  {style.name || 'Estilo sem nome'}
                </CardTitle>
                <Badge variant={style.active ? 'default' : 'secondary'}>
                  {style.active ? 'Ativo' : 'Inativo'}
                </Badge>
                <Badge variant="outline">
                  Ordem {normalizeNumber(style.order_index, 0)}
                </Badge>
              </div>
              <p className="mt-2 line-clamp-3 min-h-10 text-sm text-muted-foreground">
                {style.description || 'Sem descrição cadastrada.'}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/20 p-3 text-center sm:grid-cols-4">
          <div>
            <p className="text-lg font-bold">{presentationCount}</p>
            <p className="text-[11px] text-muted-foreground">Apresentações</p>
          </div>
          <div>
            <p className="text-lg font-bold">{templateCount}</p>
            <p className="text-[11px] text-muted-foreground">Modelos</p>
          </div>
          <div>
            <p className="text-lg font-bold">{flowCount}</p>
            <p className="text-[11px] text-muted-foreground">Fluxos</p>
          </div>
          <div>
            <p className="text-lg font-bold">{tipCount}</p>
            <p className="text-[11px] text-muted-foreground">Dicas</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onEdit(style)} disabled={busy}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>

          <Button type="button" variant="outline" size="sm" onClick={() => onToggleActive(style)} disabled={busy}>
            {style.active ? 'Desativar' : 'Ativar'}
          </Button>

          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onMove(style, -1)}
              disabled={busy || !canMoveUp}
              aria-label={`Mover ${style.name} para cima`}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onMove(style, 1)}
              disabled={busy || !canMoveDown}
              aria-label={`Mover ${style.name} para baixo`}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(style)}
              disabled={busy}
              aria-label={`Excluir ${style.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminStyles() {
  const { toast } = useToast();
  const { user, profile, loading: userLoading } = useCurrentUser();

  const [styles, setStyles] = useState([]);
  const [presentations, setPresentations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [flows, setFlows] = useState([]);
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isAdmin = profile?.role === 'admin';

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id || !isAdmin) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!silent) setLoading(true);

    try {
      const [styleRows, presentationRows, templateRows, flowRows, tipRows] = await Promise.all([
        base44.entities.PresentationStyle.list('order_index'),
        base44.entities.Presentation.list('-updated_date'),
        base44.entities.PresentationTemplate.list('name'),
        base44.entities.GuidedFlow.list('name'),
        base44.entities.AppTip.list('-created_date'),
      ]);

      setStyles(Array.isArray(styleRows) ? styleRows : []);
      setPresentations(Array.isArray(presentationRows) ? presentationRows : []);
      setTemplates(Array.isArray(templateRows) ? templateRows : []);
      setFlows(Array.isArray(flowRows) ? flowRows : []);
      setTips(Array.isArray(tipRows) ? tipRows : []);
    } catch (error) {
      console.error('Erro ao carregar estilos:', error);
      toast({
        title: 'Não foi possível carregar os estilos',
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

  const sortedStyles = useMemo(
    () => [...styles].sort((a, b) => {
      const orderDifference = normalizeNumber(a.order_index, 0) - normalizeNumber(b.order_index, 0);
      if (orderDifference !== 0) return orderDifference;
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
    }),
    [styles],
  );

  const filteredStyles = useMemo(() => {
    const term = search.trim().toLowerCase();

    return sortedStyles.filter((style) => {
      if (statusFilter === 'active' && !style.active) return false;
      if (statusFilter === 'inactive' && style.active) return false;
      if (!term) return true;

      return [style.name, style.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [search, sortedStyles, statusFilter]);

  const createCountMap = useCallback((rows, field) => {
    const map = {};
    rows.forEach((item) => {
      const id = item?.[field];
      if (!id) return;
      map[id] = (map[id] || 0) + 1;
    });
    return map;
  }, []);

  const presentationCountMap = useMemo(
    () => createCountMap(presentations, 'style_id'),
    [createCountMap, presentations],
  );
  const templateCountMap = useMemo(
    () => createCountMap(templates, 'style_id'),
    [createCountMap, templates],
  );
  const flowCountMap = useMemo(
    () => createCountMap(flows, 'style_id'),
    [createCountMap, flows],
  );
  const tipCountMap = useMemo(
    () => createCountMap(tips, 'style_id'),
    [createCountMap, tips],
  );

  const activeCount = styles.filter((style) => style.active).length;
  const usedCount = styles.filter((style) => (
    (presentationCountMap[style.id] || 0)
    + (templateCountMap[style.id] || 0)
    + (flowCountMap[style.id] || 0)
    + (tipCountMap[style.id] || 0)
  ) > 0).length;

  const openCreateDialog = () => {
    const nextOrder = sortedStyles.length
      ? Math.max(...sortedStyles.map((item) => normalizeNumber(item.order_index, 0))) + 1
      : 1;

    setEditingStyle(null);
    setForm({ ...DEFAULT_FORM, order_index: nextOrder });
    setDialogOpen(true);
  };

  const openEditDialog = (style) => {
    setEditingStyle(style);
    setForm({
      name: style.name || '',
      description: style.description || '',
      order_index: normalizeNumber(style.order_index, 0),
      active: style.active !== false,
    });
    setDialogOpen(true);
  };

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) {
      toast({
        title: 'Informe o nome do estilo',
        description: 'O nome é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    const duplicate = styles.some(
      (item) => item.id !== editingStyle?.id
        && String(item.name || '').trim().toLowerCase() === name.toLowerCase(),
    );

    if (duplicate) {
      toast({
        title: 'Nome já utilizado',
        description: 'Já existe um estilo com esse nome.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      name,
      description,
      order_index: normalizeNumber(form.order_index, 0),
      active: !!form.active,
    };

    setSaving(true);

    try {
      if (editingStyle?.id) {
        const updated = await base44.entities.PresentationStyle.update(editingStyle.id, payload);
        setStyles((current) => current.map((item) => (
          item.id === editingStyle.id ? { ...item, ...payload, ...(updated || {}) } : item
        )));
        toast({ title: 'Estilo atualizado', description: 'As alterações foram salvas.' });
      } else {
        const created = await base44.entities.PresentationStyle.create(payload);
        setStyles((current) => [...current, created]);
        toast({ title: 'Estilo criado', description: 'Ele já pode ser usado no aplicativo.' });
      }

      setDialogOpen(false);
      setEditingStyle(null);
      setForm(DEFAULT_FORM);
    } catch (error) {
      console.error('Erro ao salvar estilo:', error);
      toast({
        title: 'Não foi possível salvar',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (style) => {
    const nextValue = !style.active;
    setBusyId(style.id);

    try {
      await base44.entities.PresentationStyle.update(style.id, { active: nextValue });
      setStyles((current) => current.map((item) => (
        item.id === style.id ? { ...item, active: nextValue } : item
      )));
      toast({
        title: nextValue ? 'Estilo ativado' : 'Estilo desativado',
        description: nextValue
          ? 'Ele voltou a aparecer nas opções de criação.'
          : 'Apresentações existentes continuam preservadas.',
      });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: 'Não foi possível alterar o status',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setBusyId('');
    }
  };

  const handleMove = async (style, direction) => {
    const currentIndex = sortedStyles.findIndex((item) => item.id === style.id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sortedStyles.length) return;

    const target = sortedStyles[targetIndex];
    const currentOrder = normalizeNumber(style.order_index, currentIndex + 1);
    const targetOrder = normalizeNumber(target.order_index, targetIndex + 1);

    setBusyId(style.id);

    try {
      await Promise.all([
        base44.entities.PresentationStyle.update(style.id, { order_index: targetOrder }),
        base44.entities.PresentationStyle.update(target.id, { order_index: currentOrder }),
      ]);

      setStyles((current) => current.map((item) => {
        if (item.id === style.id) return { ...item, order_index: targetOrder };
        if (item.id === target.id) return { ...item, order_index: currentOrder };
        return item;
      }));
    } catch (error) {
      console.error('Erro ao reordenar estilo:', error);
      toast({
        title: 'Não foi possível alterar a ordem',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setBusyId('');
    }
  };

  const requestDelete = (style) => {
    const presentationCount = presentationCountMap[style.id] || 0;
    const templateCount = templateCountMap[style.id] || 0;
    const flowCount = flowCountMap[style.id] || 0;
    const tipCount = tipCountMap[style.id] || 0;

    if (presentationCount + templateCount + flowCount + tipCount > 0) {
      toast({
        title: 'Estilo em uso',
        description: `Ele está vinculado a ${presentationCount} apresentação(ões), ${templateCount} modelo(s), ${flowCount} fluxo(s) e ${tipCount} dica(s). Desative-o em vez de excluir.`,
        variant: 'destructive',
      });
      return;
    }

    setDeleteTarget(style);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;

    const targetId = deleteTarget.id;
    setBusyId(targetId);

    try {
      await base44.entities.PresentationStyle.delete(targetId);
      setStyles((current) => current.filter((item) => item.id !== targetId));
      setDeleteTarget(null);
      toast({ title: 'Estilo excluído', description: 'O registro foi removido definitivamente.' });
    } catch (error) {
      console.error('Erro ao excluir estilo:', error);
      toast({
        title: 'Não foi possível excluir',
        description: 'Confirme se o estilo ainda possui algum vínculo.',
        variant: 'destructive',
      });
    } finally {
      setBusyId('');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData({ silent: true });
  };

  if (userLoading || loading) return <LoadingState />;
  if (!isAdmin) return <AccessDenied />;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Administração
            </Link>
          </Button>
          <p className="text-sm font-medium text-primary">Configuração da comunicação</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Estilos da apresentação</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Defina como a apresentação será comunicada. O estilo orienta o tom, os modelos, os fluxos guiados e as dicas sugeridas.
          </p>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="flex-1 sm:flex-none">
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={openCreateDialog} className="flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            Novo estilo
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={MessageCircleQuestion} label="Estilos" value={styles.length} description="Total cadastrado" />
        <SummaryCard icon={CheckCircle2} label="Ativos" value={activeCount} description="Disponíveis na criação" />
        <SummaryCard icon={Users} label="Em uso" value={usedCount} description="Com algum vínculo" />
        <SummaryCard icon={Sparkles} label="Fluxos vinculados" value={flows.length} description="Orientações guiadas" />
      </section>

      <Card className="border-border/70">
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome ou descrição..."
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Somente ativos</SelectItem>
                <SelectItem value="inactive">Somente inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredStyles.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            icon={MessageCircleQuestion}
            title={styles.length === 0 ? 'Nenhum estilo cadastrado' : 'Nenhum estilo encontrado'}
            description={
              styles.length === 0
                ? 'Cadastre estilos como Didático, Inspirador, Conversacional, Técnico e Curto e objetivo.'
                : 'Altere os filtros ou o texto pesquisado.'
            }
            actionLabel={styles.length === 0 ? 'Criar primeiro estilo' : undefined}
            onAction={styles.length === 0 ? openCreateDialog : undefined}
          />
        </Card>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {filteredStyles.map((style) => {
            const globalIndex = sortedStyles.findIndex((item) => item.id === style.id);
            return (
              <StyleCard
                key={style.id}
                style={style}
                presentationCount={presentationCountMap[style.id] || 0}
                templateCount={templateCountMap[style.id] || 0}
                flowCount={flowCountMap[style.id] || 0}
                tipCount={tipCountMap[style.id] || 0}
                busy={busyId === style.id}
                onEdit={openEditDialog}
                onToggleActive={handleToggleActive}
                onMove={handleMove}
                onDelete={requestDelete}
                canMoveUp={globalIndex > 0}
                canMoveDown={globalIndex >= 0 && globalIndex < sortedStyles.length - 1}
              />
            );
          })}
        </section>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Por que o estilo é importante?</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                O mesmo conteúdo pode ser apresentado de maneira didática, inspiradora, conversacional, técnica ou objetiva. O estilo ajuda o aplicativo a sugerir perguntas, modelos e orientações coerentes com a forma de comunicação escolhida.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingStyle ? 'Editar estilo' : 'Novo estilo'}</DialogTitle>
            <DialogDescription>
              Defina como este estilo deve orientar a construção e a apresentação do conteúdo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid gap-2">
              <Label htmlFor="style-name">Nome *</Label>
              <Input
                id="style-name"
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                placeholder="Ex.: Didático"
                maxLength={80}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="style-description">Descrição</Label>
              <Textarea
                id="style-description"
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                placeholder="Ex.: Comunicação clara, organizada e voltada ao aprendizado passo a passo."
                rows={4}
                maxLength={500}
              />
              <p className="text-right text-xs text-muted-foreground">{form.description.length}/500</p>
            </div>

            <div className="grid gap-2 sm:max-w-xs">
              <Label htmlFor="style-order">Ordem</Label>
              <Input
                id="style-order"
                type="number"
                min="0"
                step="1"
                value={form.order_index}
                onChange={(event) => updateForm('order_index', event.target.value)}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div>
                <Label htmlFor="style-active" className="font-semibold">Estilo ativo</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Quando desativado, deixa de aparecer para novas apresentações.
                </p>
              </div>
              <Switch
                id="style-active"
                checked={!!form.active}
                onCheckedChange={(checked) => updateForm('active', checked)}
              />
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Prévia</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MessageCircleQuestion className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">{form.name.trim() || 'Nome do estilo'}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {form.description.trim() || 'Descrição de como esse estilo orienta a comunicação.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingStyle ? 'Salvar alterações' : 'Criar estilo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir estilo?"
        description={
          deleteTarget
            ? `O estilo “${deleteTarget.name || 'sem nome'}” será removido definitivamente. A exclusão só será permitida se ele não estiver vinculado a apresentações, modelos, fluxos guiados ou dicas.`
            : ''
        }
        confirmLabel="Excluir definitivamente"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}