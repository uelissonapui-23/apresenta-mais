import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  FileQuestion,
  Filter,
  GitBranch,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
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

const DEFAULT_FORM = {
  name: '',
  description: '',
  presentation_type_id: '',
  objective_id: '',
  communication_style_id: '',
  version: 1,
  active: true,
};

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeText(value) {
  return String(value || '').trim();
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
            Apenas administradores podem gerenciar os fluxos guiados.
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
        <p className="text-sm">Carregando fluxos guiados...</p>
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

function FlowCard({
  flow,
  typeName,
  objectiveName,
  styleName,
  questionCount,
  busy,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
}) {
  return (
    <Card className={`border-border/70 ${!flow.active ? 'opacity-70' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate text-lg">
                {flow.name || 'Fluxo sem nome'}
              </CardTitle>
              <Badge variant={flow.active ? 'default' : 'secondary'}>
                {flow.active ? 'Ativo' : 'Inativo'}
              </Badge>
              <Badge variant="outline">Versão {normalizeNumber(flow.version, 1)}</Badge>
            </div>
            <p className="mt-2 line-clamp-3 min-h-10 text-sm text-muted-foreground">
              {flow.description || 'Sem descrição cadastrada.'}
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <GitBranch className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="flex flex-wrap gap-2 text-xs">
          {typeName ? <Badge variant="outline">{typeName}</Badge> : <Badge variant="secondary">Todos os tipos</Badge>}
          {objectiveName ? <Badge variant="outline">{objectiveName}</Badge> : <Badge variant="secondary">Todos os objetivos</Badge>}
          {styleName ? <Badge variant="outline">{styleName}</Badge> : <Badge variant="secondary">Todos os estilos</Badge>}
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Perguntas</p>
            <p className="font-semibold">{questionCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Abrangência</p>
            <p className="truncate font-semibold">
              {typeName || objectiveName || styleName ? 'Específico' : 'Geral'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/admin/guided-questions?flow=${flow.id}`}>
              <FileQuestion className="mr-2 h-4 w-4" />
              Perguntas
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(flow)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDuplicate(flow)} disabled={busy}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicar
          </Button>
          <Button variant="outline" size="sm" onClick={() => onToggleActive(flow)} disabled={busy}>
            {flow.active ? (
              <Lock className="mr-2 h-4 w-4" />
            ) : (
              <Unlock className="mr-2 h-4 w-4" />
            )}
            {flow.active ? 'Desativar' : 'Ativar'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(flow)}
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

export default function AdminGuidedFlows() {
  const { toast } = useToast();
  const { profile, loading: userLoading } = useCurrentUser();

  const [flows, setFlows] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [types, setTypes] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [styles, setStyles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [objectiveFilter, setObjectiveFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const isAdmin = profile?.role === 'admin';

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!isAdmin) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!silent) setLoading(true);
    setErrorMessage('');

    try {
      const [flowRows, questionRows, typeRows, objectiveRows, styleRows] = await Promise.all([
        base44.entities.GuidedFlow.list('-updated_date'),
        base44.entities.GuidedQuestion.list('order_index'),
        base44.entities.PresentationType.list('order_index'),
        base44.entities.PresentationObjective.list('order_index'),
        base44.entities.CommunicationStyle.list('order_index'),
      ]);

      setFlows(Array.isArray(flowRows) ? flowRows : []);
      setQuestions(Array.isArray(questionRows) ? questionRows : []);
      setTypes(Array.isArray(typeRows) ? typeRows : []);
      setObjectives(Array.isArray(objectiveRows) ? objectiveRows : []);
      setStyles(Array.isArray(styleRows) ? styleRows : []);
    } catch (error) {
      console.error('Erro ao carregar fluxos guiados:', error);
      setErrorMessage('Não foi possível carregar os fluxos guiados.');
      toast({
        title: 'Falha ao carregar',
        description: 'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    if (!userLoading) loadData();
  }, [loadData, userLoading]);

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

  const questionCountMap = useMemo(() => {
    const counts = {};
    questions.forEach((question) => {
      if (!question.guided_flow_id) return;
      counts[question.guided_flow_id] = (counts[question.guided_flow_id] || 0) + 1;
    });
    return counts;
  }, [questions]);

  const filteredFlows = useMemo(() => {
    const term = normalizeText(search).toLowerCase();

    return flows.filter((flow) => {
      const matchesSearch = !term || [
        flow.name,
        flow.description,
        typeMap[flow.presentation_type_id],
        objectiveMap[flow.objective_id],
        styleMap[flow.communication_style_id],
      ].some((value) => String(value || '').toLowerCase().includes(term));

      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && flow.active)
        || (statusFilter === 'inactive' && !flow.active);

      const matchesType = typeFilter === 'all'
        || (typeFilter === 'generic' && !flow.presentation_type_id)
        || flow.presentation_type_id === typeFilter;

      const matchesObjective = objectiveFilter === 'all'
        || (objectiveFilter === 'generic' && !flow.objective_id)
        || flow.objective_id === objectiveFilter;

      const matchesStyle = styleFilter === 'all'
        || (styleFilter === 'generic' && !flow.communication_style_id)
        || flow.communication_style_id === styleFilter;

      return matchesSearch && matchesStatus && matchesType && matchesObjective && matchesStyle;
    });
  }, [flows, objectiveFilter, objectiveMap, search, statusFilter, styleFilter, styleMap, typeFilter, typeMap]);

  const activeCount = flows.filter((flow) => flow.active).length;
  const configuredCount = flows.filter((flow) => flow.presentation_type_id || flow.objective_id || flow.communication_style_id).length;
  const totalQuestions = questions.length;

  const openCreate = () => {
    setEditingFlow(null);
    setForm(DEFAULT_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (flow) => {
    setEditingFlow(flow);
    setForm({
      name: flow.name || '',
      description: flow.description || '',
      presentation_type_id: flow.presentation_type_id || '',
      objective_id: flow.objective_id || '',
      communication_style_id: flow.communication_style_id || '',
      version: normalizeNumber(flow.version, 1),
      active: flow.active !== false,
    });
    setFormError('');
    setFormOpen(true);
  };

  const validateForm = () => {
    const name = normalizeText(form.name);
    if (!name) return 'Informe o nome do fluxo.';

    const version = normalizeNumber(form.version, 0);
    if (version < 1) return 'A versão precisa ser igual ou maior que 1.';

    const duplicate = flows.some((flow) => {
      if (editingFlow?.id === flow.id) return false;
      return normalizeText(flow.name).toLowerCase() === name.toLowerCase()
        && (flow.presentation_type_id || '') === (form.presentation_type_id || '')
        && (flow.objective_id || '') === (form.objective_id || '')
        && (flow.communication_style_id || '') === (form.communication_style_id || '')
        && normalizeNumber(flow.version, 1) === version;
    });

    if (duplicate) {
      return 'Já existe um fluxo com o mesmo nome, contexto e versão.';
    }

    return '';
  };

  const handleSave = async () => {
    if (saving) return;

    const validation = validateForm();
    if (validation) {
      setFormError(validation);
      return;
    }

    setSaving(true);
    setFormError('');

    const payload = {
      name: normalizeText(form.name),
      description: normalizeText(form.description),
      presentation_type_id: form.presentation_type_id || null,
      objective_id: form.objective_id || null,
      communication_style_id: form.communication_style_id || null,
      version: normalizeNumber(form.version, 1),
      active: Boolean(form.active),
    };

    try {
      if (editingFlow?.id) {
        const updated = await base44.entities.GuidedFlow.update(editingFlow.id, payload);
        setFlows((current) => current.map((item) => (
          item.id === editingFlow.id ? { ...item, ...payload, ...updated } : item
        )));
        toast({ title: 'Fluxo atualizado', description: 'As alterações foram salvas.' });
      } else {
        const created = await base44.entities.GuidedFlow.create(payload);
        setFlows((current) => [created, ...current]);
        toast({
          title: 'Fluxo criado',
          description: 'Agora adicione as perguntas que formarão a criação guiada.',
        });
      }

      setFormOpen(false);
      setEditingFlow(null);
      setForm(DEFAULT_FORM);
    } catch (error) {
      console.error('Erro ao salvar fluxo guiado:', error);
      setFormError('Não foi possível salvar o fluxo. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (flow) => {
    if (!flow?.id || busyId) return;
    setBusyId(flow.id);

    try {
      const nextValue = !flow.active;
      await base44.entities.GuidedFlow.update(flow.id, { active: nextValue });
      setFlows((current) => current.map((item) => (
        item.id === flow.id ? { ...item, active: nextValue } : item
      )));
      toast({
        title: nextValue ? 'Fluxo ativado' : 'Fluxo desativado',
        description: nextValue
          ? 'O fluxo poderá ser utilizado na criação guiada.'
          : 'O fluxo não será oferecido para novas apresentações.',
      });
    } catch (error) {
      console.error('Erro ao alterar status do fluxo:', error);
      toast({
        title: 'Não foi possível alterar o status',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setBusyId('');
    }
  };

  const handleDuplicate = async (flow) => {
    if (!flow?.id || busyId) return;
    setBusyId(flow.id);
    let createdFlow = null;

    try {
      createdFlow = await base44.entities.GuidedFlow.create({
        name: `${flow.name || 'Fluxo'} — cópia`,
        description: flow.description || '',
        presentation_type_id: flow.presentation_type_id || null,
        objective_id: flow.objective_id || null,
        communication_style_id: flow.communication_style_id || null,
        version: normalizeNumber(flow.version, 1) + 1,
        active: false,
      });

      const sourceQuestions = questions
        .filter((question) => question.guided_flow_id === flow.id)
        .sort((a, b) => normalizeNumber(a.order_index) - normalizeNumber(b.order_index));

      const createdQuestions = [];
      for (const question of sourceQuestions) {
        const createdQuestion = await base44.entities.GuidedQuestion.create({
          guided_flow_id: createdFlow.id,
          question_text: question.question_text || '',
          help_text: question.help_text || '',
          field_type: question.field_type || 'text',
          options_json: question.options_json || null,
          required: Boolean(question.required),
          order_index: normalizeNumber(question.order_index),
          destination_field: question.destination_field || '',
          block_type_to_generate: question.block_type_to_generate || null,
          conditional_rule_json: question.conditional_rule_json || null,
          active: question.active !== false,
        });
        createdQuestions.push(createdQuestion);
      }

      setFlows((current) => [createdFlow, ...current]);
      setQuestions((current) => [...current, ...createdQuestions]);
      toast({
        title: 'Fluxo duplicado',
        description: 'A cópia foi criada inativa para revisão antes da publicação.',
      });
    } catch (error) {
      console.error('Erro ao duplicar fluxo guiado:', error);
      if (createdFlow?.id) {
        try { await base44.entities.GuidedFlow.delete(createdFlow.id); } catch (_) { /* limpeza best effort */ }
      }
      toast({
        title: 'Não foi possível duplicar',
        description: 'Nenhuma alteração incompleta foi mantida.',
        variant: 'destructive',
      });
    } finally {
      setBusyId('');
    }
  };

  const confirmDelete = async () => {
    const flow = deleteTarget;
    if (!flow?.id || busyId) return;
    setBusyId(flow.id);

    try {
      const linkedQuestions = questions.filter((question) => question.guided_flow_id === flow.id);
      for (const question of linkedQuestions) {
        await base44.entities.GuidedQuestion.delete(question.id);
      }
      await base44.entities.GuidedFlow.delete(flow.id);

      setFlows((current) => current.filter((item) => item.id !== flow.id));
      setQuestions((current) => current.filter((item) => item.guided_flow_id !== flow.id));
      setDeleteTarget(null);
      toast({ title: 'Fluxo excluído', description: 'O fluxo e suas perguntas foram removidos.' });
    } catch (error) {
      console.error('Erro ao excluir fluxo guiado:', error);
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

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setObjectiveFilter('all');
    setStyleFilter('all');
  };

  if (userLoading || loading) return <LoadingState />;
  if (!isAdmin) return <AccessDenied />;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Administração
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <GitBranch className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold sm:text-3xl">Fluxos guiados</h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Defina quais perguntas ajudam o usuário a construir cada tipo de apresentação.
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo fluxo
          </Button>
        </div>
      </header>

      {errorMessage && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{errorMessage}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>Tentar novamente</Button>
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={GitBranch} label="Fluxos" value={flows.length} description="Cadastrados" />
        <SummaryCard icon={CheckCircle2} label="Ativos" value={activeCount} description="Disponíveis ao usuário" />
        <SummaryCard icon={FileQuestion} label="Perguntas" value={totalQuestions} description="Em todos os fluxos" />
        <SummaryCard icon={Settings2} label="Específicos" value={configuredCount} description="Com tipo, objetivo ou estilo" />
      </section>

      <Card className="border-border/70">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Busca e filtros</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar fluxo, tipo, objetivo ou estilo..."
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

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="generic">Sem tipo específico</SelectItem>
                {types.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={objectiveFilter} onValueChange={setObjectiveFilter}>
              <SelectTrigger><SelectValue placeholder="Objetivo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os objetivos</SelectItem>
                <SelectItem value="generic">Sem objetivo específico</SelectItem>
                {objectives.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Select value={styleFilter} onValueChange={setStyleFilter}>
              <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Estilo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estilos</SelectItem>
                <SelectItem value="generic">Sem estilo específico</SelectItem>
                {styles.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <p className="text-sm text-muted-foreground">
                {filteredFlows.length} de {flows.length} fluxo(s)
              </p>
              <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredFlows.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            icon={GitBranch}
            title={flows.length === 0 ? 'Nenhum fluxo cadastrado' : 'Nenhum fluxo encontrado'}
            description={flows.length === 0
              ? 'Crie o primeiro fluxo para começar a orientar os usuários passo a passo.'
              : 'Altere os filtros ou limpe a busca para visualizar outros fluxos.'}
            actionLabel={flows.length === 0 ? 'Criar fluxo' : 'Limpar filtros'}
            onAction={flows.length === 0 ? openCreate : clearFilters}
          />
        </Card>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {filteredFlows.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              typeName={typeMap[flow.presentation_type_id]}
              objectiveName={objectiveMap[flow.objective_id]}
              styleName={styleMap[flow.communication_style_id]}
              questionCount={questionCountMap[flow.id] || 0}
              busy={busyId === flow.id}
              onEdit={openEdit}
              onDuplicate={handleDuplicate}
              onToggleActive={handleToggleActive}
              onDelete={setDeleteTarget}
            />
          ))}
        </section>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Como o aplicativo escolhe um fluxo</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Fluxos mais específicos devem combinar tipo, objetivo e estilo. Um fluxo sem esses vínculos funciona como alternativa geral. Mantenha versões antigas inativas em vez de apagá-las quando quiser preservar o histórico de configuração.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={(open) => !saving && setFormOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingFlow ? 'Editar fluxo guiado' : 'Novo fluxo guiado'}</DialogTitle>
            <DialogDescription>
              Defina em qual contexto o fluxo será usado. Campos de contexto vazios tornam o fluxo mais geral.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {formError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="flow-name">Nome *</Label>
              <Input
                id="flow-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex.: Pregação temática guiada"
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flow-description">Descrição</Label>
              <Textarea
                id="flow-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Explique o objetivo e o público deste fluxo."
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Tipo de apresentação</Label>
                <Select
                  value={form.presentation_type_id || 'none'}
                  onValueChange={(value) => setForm((current) => ({ ...current, presentation_type_id: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Todos os tipos</SelectItem>
                    {types.filter((item) => item.active !== false).map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Objetivo</Label>
                <Select
                  value={form.objective_id || 'none'}
                  onValueChange={(value) => setForm((current) => ({ ...current, objective_id: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Todos os objetivos</SelectItem>
                    {objectives.filter((item) => item.active !== false).map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estilo de comunicação</Label>
                <Select
                  value={form.communication_style_id || 'none'}
                  onValueChange={(value) => setForm((current) => ({ ...current, communication_style_id: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Todos os estilos</SelectItem>
                    {styles.filter((item) => item.active !== false).map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="flow-version">Versão *</Label>
                <Input
                  id="flow-version"
                  type="number"
                  min="1"
                  step="1"
                  value={form.version}
                  onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Aumente a versão quando mudar significativamente a sequência de perguntas.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                <div>
                  <Label htmlFor="flow-active" className="font-medium">Fluxo ativo</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Fluxos inativos ficam salvos, mas não aparecem para novos usuários.
                  </p>
                </div>
                <Switch
                  id="flow-active"
                  checked={form.active}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, active: checked }))}
                />
              </div>
            </div>

            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">Contexto selecionado</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {typeMap[form.presentation_type_id] || 'Todos os tipos'} · {' '}
                    {objectiveMap[form.objective_id] || 'Todos os objetivos'} · {' '}
                    {styleMap[form.communication_style_id] || 'Todos os estilos'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingFlow ? 'Salvar alterações' : 'Criar fluxo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir fluxo guiado?"
        description={`O fluxo “${deleteTarget?.name || ''}” e todas as suas ${questionCountMap[deleteTarget?.id] || 0} pergunta(s) serão apagados definitivamente. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir definitivamente"
        onConfirm={confirmDelete}
        destructive
        loading={Boolean(deleteTarget && busyId === deleteTarget.id)}
      />
    </div>
  );
}