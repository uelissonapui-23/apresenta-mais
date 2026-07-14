import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  Copy,
  Filter,
  HelpCircle,
  Info,
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
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

const TRIGGER_TYPES = [
  { value: 'editor_open', label: 'Ao abrir o editor' },
  { value: 'overview_open', label: 'Ao abrir a visão geral' },
  { value: 'before_rehearsal', label: 'Antes do ensaio' },
  { value: 'during_rehearsal', label: 'Durante o ensaio' },
  { value: 'before_presentation', label: 'Antes da apresentação' },
  { value: 'during_presentation', label: 'Durante a apresentação' },
  { value: 'after_presentation', label: 'Depois da apresentação' },
  { value: 'guided_creation', label: 'Durante a criação guiada' },
  { value: 'validation', label: 'Ao validar a apresentação' },
  { value: 'manual', label: 'Somente consulta manual' },
];

const DEFAULT_FORM = {
  presentation_type_id: '',
  objective_id: '',
  communication_style_id: '',
  title: '',
  message: '',
  trigger_type: 'editor_open',
  rule_text: '',
  active: true,
};

function normalizeText(value) {
  return String(value || '').trim();
}

function safeJsonParse(value) {
  const text = normalizeText(value);
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function jsonToText(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    const parsed = safeJsonParse(value);
    if (parsed === undefined) return value;
    if (parsed === null) return '';
    return JSON.stringify(parsed, null, 2);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
}

function getTriggerLabel(value) {
  return TRIGGER_TYPES.find((item) => item.value === value)?.label || value || 'Sem gatilho';
}

function LoadingState() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <span className="text-sm">Carregando dicas...</span>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-xl items-center px-4 py-10">
      <Card className="w-full border-destructive/25">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <ShieldCheck className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Acesso administrativo necessário</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Somente administradores podem configurar as dicas inteligentes do aplicativo.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, description }) {
  return (
    <Card className="border-border/70">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-5 w-5 text-foreground/70" />
        </div>
      </CardContent>
    </Card>
  );
}

function ContextBadge({ label, value }) {
  if (!value) return null;
  return (
    <Badge variant="outline" className="max-w-full truncate">
      {label}: {value}
    </Badge>
  );
}

export default function AdminTips() {
  const { toast } = useToast();
  const { user, profile, loading: userLoading } = useCurrentUser();

  const [tips, setTips] = useState([]);
  const [types, setTypes] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [styles, setStyles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [triggerFilter, setTriggerFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [objectiveFilter, setObjectiveFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTip, setEditingTip] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isAdmin = profile?.role === 'admin';

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id || !isAdmin) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!silent) setLoading(true);
    setLoadError('');

    try {
      const [tipRows, typeRows, objectiveRows, styleRows] = await Promise.all([
        base44.entities.AppTip.list('-created_date'),
        base44.entities.PresentationType.filter({ active: true }, 'order_index'),
        base44.entities.PresentationObjective.filter({ active: true }, 'order_index'),
        base44.entities.CommunicationStyle.filter({ active: true }, 'order_index'),
      ]);

      setTips(Array.isArray(tipRows) ? tipRows : []);
      setTypes(Array.isArray(typeRows) ? typeRows : []);
      setObjectives(Array.isArray(objectiveRows) ? objectiveRows : []);
      setStyles(Array.isArray(styleRows) ? styleRows : []);
    } catch (error) {
      console.error('Erro ao carregar dicas:', error);
      setLoadError('Não foi possível carregar as dicas administrativas.');
      toast({
        title: 'Falha ao carregar',
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

  const typeMap = useMemo(
    () => Object.fromEntries(types.map((item) => [item.id, item.name])),
    [types],
  );

  const objectiveMap = useMemo(
    () => Object.fromEntries(objectives.map((item) => [item.id, item.name])),
    [objectives],
  );

  const styleMap = useMemo(
    () => Object.fromEntries(styles.map((item) => [item.id, item.name])),
    [styles],
  );

  const filteredTips = useMemo(() => {
    const term = normalizeText(search).toLowerCase();

    return tips.filter((tip) => {
      const typeName = typeMap[tip.presentation_type_id] || '';
      const objectiveName = objectiveMap[tip.objective_id] || '';
      const styleName = styleMap[tip.communication_style_id] || '';
      const triggerLabel = getTriggerLabel(tip.trigger_type);

      const matchesSearch = !term || [
        tip.title,
        tip.message,
        typeName,
        objectiveName,
        styleName,
        triggerLabel,
      ].some((value) => String(value || '').toLowerCase().includes(term));

      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && tip.active)
        || (statusFilter === 'inactive' && !tip.active);

      const matchesTrigger = triggerFilter === 'all' || tip.trigger_type === triggerFilter;
      const matchesType = typeFilter === 'all' || tip.presentation_type_id === typeFilter;
      const matchesObjective = objectiveFilter === 'all' || tip.objective_id === objectiveFilter;
      const matchesStyle = styleFilter === 'all' || tip.communication_style_id === styleFilter;

      return matchesSearch
        && matchesStatus
        && matchesTrigger
        && matchesType
        && matchesObjective
        && matchesStyle;
    });
  }, [
    objectiveFilter,
    objectiveMap,
    search,
    statusFilter,
    styleFilter,
    styleMap,
    tips,
    triggerFilter,
    typeFilter,
    typeMap,
  ]);

  const summary = useMemo(() => {
    const active = tips.filter((item) => item.active).length;
    const contextual = tips.filter((item) => (
      item.presentation_type_id
      || item.objective_id
      || item.communication_style_id
    )).length;
    const general = tips.length - contextual;
    const triggers = new Set(tips.map((item) => item.trigger_type).filter(Boolean)).size;

    return { active, contextual, general, triggers };
  }, [tips]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTriggerFilter('all');
    setTypeFilter('all');
    setObjectiveFilter('all');
    setStyleFilter('all');
  };

  const openCreate = () => {
    setEditingTip(null);
    setForm(DEFAULT_FORM);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEdit = (tip) => {
    setEditingTip(tip);
    setForm({
      presentation_type_id: tip.presentation_type_id || '',
      objective_id: tip.objective_id || '',
      communication_style_id: tip.communication_style_id || '',
      title: tip.title || '',
      message: tip.message || '',
      trigger_type: tip.trigger_type || 'editor_open',
      rule_text: jsonToText(tip.rule_json),
      active: tip.active !== false,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    const title = normalizeText(form.title);
    const message = normalizeText(form.message);

    if (!title) errors.title = 'Informe um título.';
    if (!message) errors.message = 'Informe a mensagem da dica.';
    if (!form.trigger_type) errors.trigger_type = 'Escolha quando a dica será exibida.';

    const duplicate = tips.some((tip) => (
      tip.id !== editingTip?.id
      && normalizeText(tip.title).toLowerCase() === title.toLowerCase()
      && (tip.presentation_type_id || '') === form.presentation_type_id
      && (tip.objective_id || '') === form.objective_id
      && (tip.communication_style_id || '') === form.communication_style_id
      && (tip.trigger_type || '') === form.trigger_type
    ));

    if (duplicate) {
      errors.title = 'Já existe uma dica com esse título, contexto e gatilho.';
    }

    const parsedRule = safeJsonParse(form.rule_text);
    if (parsedRule === undefined) {
      errors.rule_text = 'A regra precisa ser um JSON válido.';
    } else if (parsedRule !== null && (Array.isArray(parsedRule) || typeof parsedRule !== 'object')) {
      errors.rule_text = 'A regra deve ser um objeto JSON.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildPayload = () => {
    const parsedRule = safeJsonParse(form.rule_text);

    return {
      presentation_type_id: form.presentation_type_id || null,
      objective_id: form.objective_id || null,
      communication_style_id: form.communication_style_id || null,
      title: normalizeText(form.title),
      message: normalizeText(form.message),
      trigger_type: form.trigger_type,
      rule_json: parsedRule === null ? null : parsedRule,
      active: Boolean(form.active),
    };
  };

  const handleSave = async () => {
    if (saving || !validateForm()) return;

    setSaving(true);

    try {
      const payload = buildPayload();

      if (editingTip?.id) {
        const updated = await base44.entities.AppTip.update(editingTip.id, payload);
        setTips((current) => current.map((item) => (
          item.id === editingTip.id ? { ...item, ...payload, ...updated } : item
        )));
        toast({ title: 'Dica atualizada', description: 'As alterações foram salvas.' });
      } else {
        const created = await base44.entities.AppTip.create(payload);
        setTips((current) => [created, ...current]);
        toast({ title: 'Dica criada', description: 'Ela já pode ser usada pelo aplicativo.' });
      }

      setDialogOpen(false);
      setEditingTip(null);
      setForm(DEFAULT_FORM);
    } catch (error) {
      console.error('Erro ao salvar dica:', error);
      toast({
        title: 'Não foi possível salvar',
        description: 'Revise os dados e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (tip) => {
    if (!tip?.id || busyId) return;

    const nextValue = !tip.active;
    setBusyId(tip.id);
    setTips((current) => current.map((item) => (
      item.id === tip.id ? { ...item, active: nextValue } : item
    )));

    try {
      await base44.entities.AppTip.update(tip.id, { active: nextValue });
      toast({
        title: nextValue ? 'Dica ativada' : 'Dica desativada',
        description: nextValue
          ? 'Ela poderá aparecer nos contextos configurados.'
          : 'Ela foi preservada, mas não será exibida.',
      });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      setTips((current) => current.map((item) => (
        item.id === tip.id ? { ...item, active: !nextValue } : item
      )));
      toast({ title: 'Falha ao alterar status', variant: 'destructive' });
    } finally {
      setBusyId('');
    }
  };

  const duplicateTip = async (tip) => {
    if (!tip?.id || busyId) return;

    setBusyId(tip.id);

    try {
      const baseTitle = `${normalizeText(tip.title)} (cópia)`;
      let title = baseTitle;
      let suffix = 2;

      while (tips.some((item) => normalizeText(item.title).toLowerCase() === title.toLowerCase())) {
        title = `${baseTitle} ${suffix}`;
        suffix += 1;
      }

      const created = await base44.entities.AppTip.create({
        presentation_type_id: tip.presentation_type_id || null,
        objective_id: tip.objective_id || null,
        communication_style_id: tip.communication_style_id || null,
        title,
        message: tip.message || '',
        trigger_type: tip.trigger_type || 'editor_open',
        rule_json: tip.rule_json || null,
        active: false,
      });

      setTips((current) => [created, ...current]);
      toast({
        title: 'Dica duplicada',
        description: 'A cópia foi criada inativa para revisão.',
      });
    } catch (error) {
      console.error('Erro ao duplicar dica:', error);
      toast({ title: 'Não foi possível duplicar', variant: 'destructive' });
    } finally {
      setBusyId('');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id || busyId) return;

    setBusyId(deleteTarget.id);

    try {
      await base44.entities.AppTip.delete(deleteTarget.id);
      setTips((current) => current.filter((item) => item.id !== deleteTarget.id));
      toast({ title: 'Dica excluída', description: 'O registro foi removido definitivamente.' });
      setDeleteTarget(null);
    } catch (error) {
      console.error('Erro ao excluir dica:', error);
      toast({
        title: 'Não foi possível excluir',
        description: 'Tente novamente em alguns instantes.',
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
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
            <Link to="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Administração
            </Link>
          </Button>

          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/50">
              <Lightbulb className="h-6 w-6 text-amber-700 dark:text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">Orientação inteligente</p>
              <h1 className="text-2xl font-bold sm:text-3xl">Dicas do aplicativo</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground sm:text-base">
                Configure orientações que ajudam o usuário a estruturar, revisar, ensaiar e apresentar melhor.
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nova dica
          </Button>
        </div>
      </header>

      {loadError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>Tentar novamente</Button>
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo das dicas">
        <SummaryCard icon={Lightbulb} label="Total" value={tips.length} description="Dicas cadastradas" />
        <SummaryCard icon={CheckCircle2} label="Ativas" value={summary.active} description="Disponíveis no aplicativo" />
        <SummaryCard icon={Target} label="Contextuais" value={summary.contextual} description="Ligadas a tipo, objetivo ou estilo" />
        <SummaryCard icon={BellRing} label="Gatilhos" value={summary.triggers} description={`${summary.general} dicas gerais`} />
      </section>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Buscar e filtrar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título, mensagem, tipo, objetivo ou estilo..."
              className="pl-9"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={triggerFilter} onValueChange={setTriggerFilter}>
              <SelectTrigger><SelectValue placeholder="Gatilho" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os gatilhos</SelectItem>
                {TRIGGER_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {types.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={objectiveFilter} onValueChange={setObjectiveFilter}>
              <SelectTrigger><SelectValue placeholder="Objetivo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os objetivos</SelectItem>
                {objectives.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={styleFilter} onValueChange={setStyleFilter}>
              <SelectTrigger><SelectValue placeholder="Estilo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estilos</SelectItem>
                {styles.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {filteredTips.length} de {tips.length} dicas exibidas
            </p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
          </div>
        </CardContent>
      </Card>

      {filteredTips.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            icon={Lightbulb}
            title={tips.length === 0 ? 'Nenhuma dica cadastrada' : 'Nenhuma dica encontrada'}
            description={tips.length === 0
              ? 'Cadastre orientações para ajudar o usuário nos diferentes momentos da apresentação.'
              : 'Altere os filtros ou a busca para encontrar outros resultados.'}
            actionLabel={tips.length === 0 ? 'Criar primeira dica' : 'Limpar filtros'}
            onAction={tips.length === 0 ? openCreate : clearFilters}
          />
        </Card>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2" aria-label="Lista de dicas">
          {filteredTips.map((tip) => {
            const typeName = typeMap[tip.presentation_type_id];
            const objectiveName = objectiveMap[tip.objective_id];
            const styleName = styleMap[tip.communication_style_id];
            const hasContext = typeName || objectiveName || styleName;
            const hasRule = tip.rule_json && Object.keys(tip.rule_json || {}).length > 0;

            return (
              <Card key={tip.id} className="border-border/70 transition-shadow hover:shadow-sm">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/50">
                        <Lightbulb className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="break-words font-semibold">{tip.title}</h2>
                          <Badge variant={tip.active ? 'default' : 'secondary'}>
                            {tip.active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs font-medium text-primary">
                          {getTriggerLabel(tip.trigger_type)}
                        </p>
                      </div>
                    </div>

                    <Switch
                      checked={tip.active !== false}
                      onCheckedChange={() => toggleActive(tip)}
                      disabled={busyId === tip.id}
                      aria-label={tip.active ? 'Desativar dica' : 'Ativar dica'}
                    />
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {tip.message}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {hasContext ? (
                      <>
                        <ContextBadge label="Tipo" value={typeName} />
                        <ContextBadge label="Objetivo" value={objectiveName} />
                        <ContextBadge label="Estilo" value={styleName} />
                      </>
                    ) : (
                      <Badge variant="outline">
                        <Sparkles className="mr-1 h-3 w-3" />
                        Dica geral
                      </Badge>
                    )}

                    {hasRule && (
                      <Badge variant="secondary">
                        <Info className="mr-1 h-3 w-3" />
                        Possui regra
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button variant="outline" size="sm" onClick={() => openEdit(tip)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateTip(tip)}
                      disabled={busyId === tip.id}
                    >
                      {busyId === tip.id
                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        : <Copy className="mr-2 h-4 w-4" />}
                      Duplicar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteTarget(tip)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-5">
          <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <h2 className="font-semibold">Como as dicas serão escolhidas</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              O aplicativo poderá combinar o gatilho com o tipo, objetivo e estilo da apresentação.
              Quanto mais específico for o contexto, mais direcionada será a orientação. Dicas sem contexto funcionam como apoio geral.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!saving) {
          setDialogOpen(open);
          if (!open) {
            setEditingTip(null);
            setForm(DEFAULT_FORM);
            setFormErrors({});
          }
        }
      }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTip ? 'Editar dica' : 'Nova dica'}</DialogTitle>
            <DialogDescription>
              Defina a mensagem, o momento de exibição e o contexto em que ela será útil.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="tip-title">Título *</Label>
              <Input
                id="tip-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ex.: Sua introdução está muito longa"
                maxLength={120}
              />
              {formErrors.title && <p className="text-xs text-destructive">{formErrors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tip-message">Mensagem *</Label>
              <Textarea
                id="tip-message"
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                placeholder="Explique de forma breve e prática o que o usuário pode melhorar."
                rows={5}
                maxLength={800}
              />
              <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                <span>{formErrors.message || 'Use uma orientação clara e acionável.'}</span>
                <span>{form.message.length}/800</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Momento de exibição *</Label>
              <Select
                value={form.trigger_type}
                onValueChange={(value) => setForm((current) => ({ ...current, trigger_type: value }))}
              >
                <SelectTrigger><SelectValue placeholder="Escolha um gatilho" /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.trigger_type && <p className="text-xs text-destructive">{formErrors.trigger_type}</p>}
            </div>

            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <div>
                <h3 className="font-medium">Contexto da dica</h3>
                <p className="text-xs text-muted-foreground">
                  Deixe os campos vazios para criar uma dica geral.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={form.presentation_type_id || 'none'}
                    onValueChange={(value) => setForm((current) => ({
                      ...current,
                      presentation_type_id: value === 'none' ? '' : value,
                    }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Todos os tipos</SelectItem>
                      {types.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Objetivo</Label>
                  <Select
                    value={form.objective_id || 'none'}
                    onValueChange={(value) => setForm((current) => ({
                      ...current,
                      objective_id: value === 'none' ? '' : value,
                    }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Todos os objetivos</SelectItem>
                      {objectives.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estilo</Label>
                  <Select
                    value={form.communication_style_id || 'none'}
                    onValueChange={(value) => setForm((current) => ({
                      ...current,
                      communication_style_id: value === 'none' ? '' : value,
                    }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Todos os estilos</SelectItem>
                      {styles.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule-json">Regra opcional em JSON</Label>
              <Textarea
                id="rule-json"
                value={form.rule_text}
                onChange={(event) => setForm((current) => ({ ...current, rule_text: event.target.value }))}
                placeholder={'{\n  "field": "estimated_duration_minutes",\n  "operator": "greater_than",\n  "value": 60\n}'}
                rows={7}
                className="font-mono text-xs"
              />
              <p className={`text-xs ${formErrors.rule_text ? 'text-destructive' : 'text-muted-foreground'}`}>
                {formErrors.rule_text || 'Use este campo apenas para regras automáticas futuras. Pode ficar vazio.'}
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div>
                <Label htmlFor="tip-active" className="font-medium">Dica ativa</Label>
                <p className="text-xs text-muted-foreground">
                  Dicas inativas permanecem cadastradas, mas não aparecem para os usuários.
                </p>
              </div>
              <Switch
                id="tip-active"
                checked={form.active}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, active: checked }))}
              />
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium">Prévia</p>
                  <p className="mt-1 text-sm font-semibold">{form.title || 'Título da dica'}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {form.message || 'A mensagem de orientação aparecerá aqui.'}
                  </p>
                  <p className="mt-2 text-xs font-medium text-primary">
                    {getTriggerLabel(form.trigger_type)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTip ? 'Salvar alterações' : 'Criar dica'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !busyId) setDeleteTarget(null);
        }}
        title="Excluir dica?"
        description={deleteTarget
          ? `A dica “${deleteTarget.title}” será removida definitivamente. Essa ação não pode ser desfeita.`
          : ''}
        confirmLabel="Excluir definitivamente"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        destructive
        loading={Boolean(deleteTarget && busyId === deleteTarget.id)}
      />
    </div>
  );
}