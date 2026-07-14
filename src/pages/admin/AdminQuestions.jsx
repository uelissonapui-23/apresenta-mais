import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Copy,
  FileQuestion,
  Filter,
  GitBranch,
  HelpCircle,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
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

const FIELD_TYPES = [
  { value: 'text', label: 'Texto curto' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'select', label: 'Seleção única' },
  { value: 'multiselect', label: 'Seleção múltipla' },
  { value: 'number', label: 'Número' },
  { value: 'boolean', label: 'Sim ou não' },
];

const DESTINATION_FIELDS = [
  { value: '', label: 'Não atualizar campo da apresentação' },
  { value: 'title', label: 'Título' },
  { value: 'subtitle', label: 'Subtítulo' },
  { value: 'description', label: 'Descrição' },
  { value: 'audience', label: 'Público' },
  { value: 'audience_knowledge_level', label: 'Nível do público' },
  { value: 'main_theme', label: 'Tema principal' },
  { value: 'main_message', label: 'Mensagem principal' },
  { value: 'estimated_duration_minutes', label: 'Duração estimada' },
];

const DEFAULT_FORM = {
  guided_flow_id: '',
  question_text: '',
  help_text: '',
  field_type: 'textarea',
  options_text: '',
  required: false,
  order_index: 0,
  destination_field: '',
  block_type_to_generate: '',
  conditional_rule_text: '',
  active: true,
};

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function parseOptions(value) {
  const text = normalizeText(value);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item));
  } catch {
    return text.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function optionsToText(value) {
  return parseOptions(value).join('\n');
}

function parseConditionalRule(value) {
  const text = normalizeText(value);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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
            Apenas administradores podem gerenciar as perguntas guiadas.
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
        <p className="text-sm">Carregando perguntas guiadas...</p>
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
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
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

function QuestionCard({
  question,
  flowName,
  blockTypeName,
  busy,
  canMoveUp,
  canMoveDown,
  onEdit,
  onDuplicate,
  onToggleActive,
  onMove,
  onDelete,
}) {
  const typeLabel = FIELD_TYPES.find((item) => item.value === question.field_type)?.label || question.field_type;
  const options = parseOptions(question.options_json);
  const destination = DESTINATION_FIELDS.find((item) => item.value === question.destination_field)?.label;
  const conditionalRule = parseConditionalRule(question.conditional_rule_json);

  return (
    <Card className={`border-border/70 ${!question.active ? 'opacity-65' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">#{normalizeNumber(question.order_index) + 1}</Badge>
              <Badge variant={question.active ? 'default' : 'secondary'}>
                {question.active ? 'Ativa' : 'Inativa'}
              </Badge>
              {question.required && <Badge variant="destructive">Obrigatória</Badge>}
            </div>
            <CardTitle className="mt-3 text-base leading-relaxed sm:text-lg">
              {question.question_text || 'Pergunta sem texto'}
            </CardTitle>
            {question.help_text && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{question.help_text}</p>
            )}
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FileQuestion className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-3 rounded-xl bg-muted/50 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Fluxo</p>
            <p className="truncate font-semibold">{flowName || 'Fluxo não encontrado'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tipo de resposta</p>
            <p className="font-semibold">{typeLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Campo destino</p>
            <p className="truncate font-semibold">{destination || 'Nenhum'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bloco gerado</p>
            <p className="truncate font-semibold">{blockTypeName || 'Nenhum'}</p>
          </div>
        </div>

        {options.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Opções</p>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => <Badge key={option} variant="outline">{option}</Badge>)}
            </div>
          </div>
        )}

        {conditionalRule && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="font-medium text-amber-800 dark:text-amber-300">Regra condicional configurada</p>
            <code className="mt-1 block break-all text-xs text-amber-700 dark:text-amber-400">
              {JSON.stringify(conditionalRule)}
            </code>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onMove(question, -1)} disabled={busy || !canMoveUp}>
            <ArrowUp className="mr-2 h-4 w-4" />Subir
          </Button>
          <Button variant="outline" size="sm" onClick={() => onMove(question, 1)} disabled={busy || !canMoveDown}>
            <ArrowDown className="mr-2 h-4 w-4" />Descer
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(question)}>
            <Pencil className="mr-2 h-4 w-4" />Editar
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDuplicate(question)} disabled={busy}>
            <Copy className="mr-2 h-4 w-4" />Duplicar
          </Button>
          <Button variant="outline" size="sm" onClick={() => onToggleActive(question)} disabled={busy}>
            {question.active ? 'Desativar' : 'Ativar'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(question)}
            disabled={busy}
          >
            <Trash2 className="mr-2 h-4 w-4" />Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminQuestions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedFlowFromUrl = searchParams.get('flow') || 'all';
  const { profile, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();

  const [questions, setQuestions] = useState([]);
  const [flows, setFlows] = useState([]);
  const [blockTypes, setBlockTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fieldTypeFilter, setFieldTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!isAdmin) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const [questionRows, flowRows, blockTypeRows] = await Promise.all([
        base44.entities.GuidedQuestion.list('order_index'),
        base44.entities.GuidedFlow.list('name'),
        base44.entities.BlockType.list('order_index'),
      ]);
      setQuestions(Array.isArray(questionRows) ? questionRows : []);
      setFlows(Array.isArray(flowRows) ? flowRows : []);
      setBlockTypes(Array.isArray(blockTypeRows) ? blockTypeRows : []);
    } catch (error) {
      console.error('Erro ao carregar perguntas guiadas:', error);
      toast({ title: 'Erro ao carregar perguntas', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    if (!userLoading) loadData();
  }, [userLoading, loadData]);

  const flowMap = useMemo(() => Object.fromEntries(flows.map((flow) => [flow.id, flow])), [flows]);
  const blockTypeMap = useMemo(() => Object.fromEntries(blockTypes.map((type) => [type.id, type])), [blockTypes]);

  const filteredQuestions = useMemo(() => {
    const term = normalizeText(search).toLowerCase();
    return questions
      .filter((question) => selectedFlowFromUrl === 'all' || question.guided_flow_id === selectedFlowFromUrl)
      .filter((question) => statusFilter === 'all' || (statusFilter === 'active' ? question.active : !question.active))
      .filter((question) => fieldTypeFilter === 'all' || question.field_type === fieldTypeFilter)
      .filter((question) => {
        if (!term) return true;
        const flowName = flowMap[question.guided_flow_id]?.name || '';
        return [question.question_text, question.help_text, question.destination_field, question.block_type_to_generate, flowName]
          .some((value) => normalizeText(value).toLowerCase().includes(term));
      })
      .sort((a, b) => {
        if (a.guided_flow_id !== b.guided_flow_id) {
          return (flowMap[a.guided_flow_id]?.name || '').localeCompare(flowMap[b.guided_flow_id]?.name || '');
        }
        return normalizeNumber(a.order_index) - normalizeNumber(b.order_index);
      });
  }, [questions, selectedFlowFromUrl, statusFilter, fieldTypeFilter, search, flowMap]);

  const selectedFlowQuestions = useMemo(
    () => selectedFlowFromUrl === 'all'
      ? []
      : questions.filter((question) => question.guided_flow_id === selectedFlowFromUrl).sort((a, b) => normalizeNumber(a.order_index) - normalizeNumber(b.order_index)),
    [questions, selectedFlowFromUrl],
  );

  const nextOrderForFlow = useCallback((flowId) => {
    const sameFlow = questions.filter((question) => question.guided_flow_id === flowId);
    if (!sameFlow.length) return 0;
    return Math.max(...sameFlow.map((question) => normalizeNumber(question.order_index))) + 1;
  }, [questions]);

  const openCreate = () => {
    const flowId = selectedFlowFromUrl !== 'all' ? selectedFlowFromUrl : flows[0]?.id || '';
    setEditing(null);
    setForm({ ...DEFAULT_FORM, guided_flow_id: flowId, order_index: nextOrderForFlow(flowId) });
    setDialogOpen(true);
  };

  const openEdit = (question) => {
    setEditing(question);
    setForm({
      guided_flow_id: question.guided_flow_id || '',
      question_text: question.question_text || '',
      help_text: question.help_text || '',
      field_type: question.field_type || 'textarea',
      options_text: optionsToText(question.options_json),
      required: Boolean(question.required),
      order_index: normalizeNumber(question.order_index),
      destination_field: question.destination_field || '',
      block_type_to_generate: question.block_type_to_generate || '',
      conditional_rule_text: question.conditional_rule_json || '',
      active: question.active !== false,
    });
    setDialogOpen(true);
  };

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const validateForm = () => {
    if (!form.guided_flow_id) return 'Escolha um fluxo guiado.';
    if (!normalizeText(form.question_text)) return 'Digite o texto da pergunta.';
    if (['select', 'multiselect'].includes(form.field_type) && parseOptions(form.options_text).length < 2) {
      return 'Cadastre pelo menos duas opções para esse tipo de resposta.';
    }
    if (normalizeText(form.conditional_rule_text) && !parseConditionalRule(form.conditional_rule_text)) {
      return 'A regra condicional precisa ser um JSON válido.';
    }
    return '';
  };

  const buildPayload = () => ({
    guided_flow_id: form.guided_flow_id,
    question_text: normalizeText(form.question_text),
    help_text: normalizeText(form.help_text),
    field_type: form.field_type,
    options_json: ['select', 'multiselect'].includes(form.field_type)
      ? JSON.stringify(parseOptions(form.options_text))
      : '',
    required: Boolean(form.required),
    order_index: Math.max(0, normalizeNumber(form.order_index)),
    destination_field: form.destination_field || '',
    block_type_to_generate: form.block_type_to_generate || '',
    conditional_rule_json: normalizeText(form.conditional_rule_text),
    active: Boolean(form.active),
  });

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast({ title: 'Revise a pergunta', description: validationError, variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editing) {
        const updated = await base44.entities.GuidedQuestion.update(editing.id, payload);
        setQuestions((current) => current.map((item) => item.id === editing.id ? { ...item, ...updated, ...payload } : item));
        toast({ title: 'Pergunta atualizada' });
      } else {
        const created = await base44.entities.GuidedQuestion.create(payload);
        setQuestions((current) => [...current, created]);
        toast({ title: 'Pergunta criada' });
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (error) {
      console.error('Erro ao salvar pergunta:', error);
      toast({ title: 'Não foi possível salvar', description: 'Verifique os dados e tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (question) => {
    setBusyId(question.id);
    try {
      const payload = {
        guided_flow_id: question.guided_flow_id,
        question_text: `${question.question_text} (cópia)`,
        help_text: question.help_text || '',
        field_type: question.field_type || 'textarea',
        options_json: question.options_json || '',
        required: Boolean(question.required),
        order_index: nextOrderForFlow(question.guided_flow_id),
        destination_field: question.destination_field || '',
        block_type_to_generate: question.block_type_to_generate || '',
        conditional_rule_json: question.conditional_rule_json || '',
        active: false,
      };
      const created = await base44.entities.GuidedQuestion.create(payload);
      setQuestions((current) => [...current, created]);
      toast({ title: 'Pergunta duplicada', description: 'A cópia foi criada inativa para revisão.' });
    } catch (error) {
      console.error('Erro ao duplicar pergunta:', error);
      toast({ title: 'Não foi possível duplicar', variant: 'destructive' });
    } finally {
      setBusyId('');
    }
  };

  const handleToggleActive = async (question) => {
    setBusyId(question.id);
    try {
      const active = !question.active;
      await base44.entities.GuidedQuestion.update(question.id, { active });
      setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, active } : item));
      toast({ title: active ? 'Pergunta ativada' : 'Pergunta desativada' });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({ title: 'Não foi possível alterar o status', variant: 'destructive' });
    } finally {
      setBusyId('');
    }
  };

  const handleMove = async (question, direction) => {
    const sameFlow = questions
      .filter((item) => item.guided_flow_id === question.guided_flow_id)
      .sort((a, b) => normalizeNumber(a.order_index) - normalizeNumber(b.order_index));
    const currentIndex = sameFlow.findIndex((item) => item.id === question.id);
    const target = sameFlow[currentIndex + direction];
    if (!target) return;
    setBusyId(question.id);
    try {
      const currentOrder = normalizeNumber(question.order_index);
      const targetOrder = normalizeNumber(target.order_index);
      await Promise.all([
        base44.entities.GuidedQuestion.update(question.id, { order_index: targetOrder }),
        base44.entities.GuidedQuestion.update(target.id, { order_index: currentOrder }),
      ]);
      setQuestions((current) => current.map((item) => {
        if (item.id === question.id) return { ...item, order_index: targetOrder };
        if (item.id === target.id) return { ...item, order_index: currentOrder };
        return item;
      }));
    } catch (error) {
      console.error('Erro ao reordenar perguntas:', error);
      toast({ title: 'Não foi possível alterar a ordem', variant: 'destructive' });
    } finally {
      setBusyId('');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await base44.entities.GuidedQuestion.delete(deleteTarget.id);
      setQuestions((current) => current.filter((item) => item.id !== deleteTarget.id));
      toast({ title: 'Pergunta excluída' });
      setDeleteTarget(null);
    } catch (error) {
      console.error('Erro ao excluir pergunta:', error);
      toast({ title: 'Não foi possível excluir', variant: 'destructive' });
    } finally {
      setBusyId('');
    }
  };

  const handleFlowFilter = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('flow');
    else next.set('flow', value);
    setSearchParams(next);
  };

  if (userLoading || loading) return <LoadingState />;
  if (!isAdmin) return <AccessDenied />;

  const activeCount = questions.filter((question) => question.active).length;
  const requiredCount = questions.filter((question) => question.required).length;
  const configuredFlows = new Set(questions.map((question) => question.guided_flow_id)).size;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-3">
            <Link to="/admin/guided-flows"><ArrowLeft className="mr-2 h-4 w-4" />Fluxos guiados</Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <FileQuestion className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold sm:text-3xl">Perguntas guiadas</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Configure as perguntas que ajudam o usuário a construir uma apresentação forte.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => { setRefreshing(true); loadData({ silent: true }); }} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Atualizar
          </Button>
          <Button onClick={openCreate} disabled={!flows.length}>
            <Plus className="mr-2 h-4 w-4" />Nova pergunta
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={FileQuestion} label="Perguntas" value={questions.length} description="Total cadastrado" />
        <SummaryCard icon={CheckCircle2} label="Ativas" value={activeCount} description="Disponíveis no assistente" />
        <SummaryCard icon={ListChecks} label="Obrigatórias" value={requiredCount} description="Não podem ser puladas" />
        <SummaryCard icon={GitBranch} label="Fluxos configurados" value={configuredFlows} description={`De ${flows.length} fluxos`} />
      </section>

      <Card className="border-border/70">
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pergunta, ajuda ou fluxo..." className="pl-9" />
            </div>
            <Select value={selectedFlowFromUrl} onValueChange={handleFlowFilter}>
              <SelectTrigger><SelectValue placeholder="Todos os fluxos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os fluxos</SelectItem>
                {flows.map((flow) => <SelectItem key={flow.id} value={flow.id}>{flow.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="inactive">Inativas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fieldTypeFilter} onValueChange={setFieldTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os campos</SelectItem>
                  {FIELD_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!flows.length ? (
        <Card className="border-dashed">
          <EmptyState
            icon={GitBranch}
            title="Crie um fluxo primeiro"
            description="As perguntas precisam estar vinculadas a um fluxo guiado."
            actionLabel="Criar fluxo"
            onAction={() => window.location.assign('/admin/guided-flows')}
          />
        </Card>
      ) : filteredQuestions.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            icon={HelpCircle}
            title="Nenhuma pergunta encontrada"
            description="Ajuste os filtros ou crie a primeira pergunta deste fluxo."
            actionLabel="Nova pergunta"
            onAction={openCreate}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((question) => {
            const orderList = questions
              .filter((item) => item.guided_flow_id === question.guided_flow_id)
              .sort((a, b) => normalizeNumber(a.order_index) - normalizeNumber(b.order_index));
            const index = orderList.findIndex((item) => item.id === question.id);
            const blockType = blockTypeMap[question.block_type_to_generate]
              || blockTypes.find((type) => type.code === question.block_type_to_generate);
            return (
              <QuestionCard
                key={question.id}
                question={question}
                flowName={flowMap[question.guided_flow_id]?.name}
                blockTypeName={blockType?.name}
                busy={busyId === question.id}
                canMoveUp={index > 0}
                canMoveDown={index >= 0 && index < orderList.length - 1}
                onEdit={openEdit}
                onDuplicate={handleDuplicate}
                onToggleActive={handleToggleActive}
                onMove={handleMove}
                onDelete={setDeleteTarget}
              />
            );
          })}
        </div>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex gap-3 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">Como construir um bom fluxo</p>
            <p className="mt-1 text-muted-foreground">
              Comece com contexto, objetivo e público. Depois peça os pontos principais, exemplos, aplicação e conclusão. Evite perguntas repetidas e deixe obrigatórias apenas as respostas realmente essenciais.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar pergunta' : 'Nova pergunta guiada'}</DialogTitle>
            <DialogDescription>
              Defina como a pergunta será exibida e o que a resposta deve gerar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid gap-2">
              <Label>Fluxo guiado *</Label>
              <Select value={form.guided_flow_id} onValueChange={(value) => {
                updateForm('guided_flow_id', value);
                if (!editing) updateForm('order_index', nextOrderForFlow(value));
              }}>
                <SelectTrigger><SelectValue placeholder="Escolha o fluxo" /></SelectTrigger>
                <SelectContent>{flows.map((flow) => <SelectItem key={flow.id} value={flow.id}>{flow.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="question_text">Pergunta *</Label>
              <Textarea id="question_text" value={form.question_text} onChange={(event) => updateForm('question_text', event.target.value)} rows={3} placeholder="Ex.: Qual é a mensagem principal que você deseja comunicar?" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="help_text">Texto de ajuda</Label>
              <Textarea id="help_text" value={form.help_text} onChange={(event) => updateForm('help_text', event.target.value)} rows={2} placeholder="Explique de forma simples como o usuário pode responder." />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Tipo de resposta</Label>
                <Select value={form.field_type} onValueChange={(value) => updateForm('field_type', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FIELD_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="order_index">Ordem</Label>
                <Input id="order_index" type="number" min="0" value={form.order_index} onChange={(event) => updateForm('order_index', event.target.value)} />
              </div>
            </div>

            {['select', 'multiselect'].includes(form.field_type) && (
              <div className="grid gap-2">
                <Label htmlFor="options_text">Opções *</Label>
                <Textarea id="options_text" value={form.options_text} onChange={(event) => updateForm('options_text', event.target.value)} rows={5} placeholder={'Uma opção por linha\nExemplo 1\nExemplo 2'} />
                <p className="text-xs text-muted-foreground">Digite uma opção por linha.</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Campo da apresentação</Label>
                <Select value={form.destination_field || 'none'} onValueChange={(value) => updateForm('destination_field', value === 'none' ? '' : value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não atualizar campo</SelectItem>
                    {DESTINATION_FIELDS.filter((item) => item.value).map((field) => <SelectItem key={field.value} value={field.value}>{field.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Tipo de bloco a gerar</Label>
                <Select value={form.block_type_to_generate || 'none'} onValueChange={(value) => updateForm('block_type_to_generate', value === 'none' ? '' : value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não gerar bloco</SelectItem>
                    {blockTypes.filter((type) => type.active).map((type) => <SelectItem key={type.id} value={type.code || type.id}>{type.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="conditional_rule">Regra condicional em JSON</Label>
              <Textarea id="conditional_rule" value={form.conditional_rule_text} onChange={(event) => updateForm('conditional_rule_text', event.target.value)} rows={3} placeholder='Ex.: {"question_id":"abc","equals":"Sim"}' />
              <p className="text-xs text-muted-foreground">Deixe vazio quando a pergunta sempre deve aparecer.</p>
            </div>

            <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3">
                <div><p className="font-medium">Resposta obrigatória</p><p className="text-xs text-muted-foreground">Impede avançar sem responder.</p></div>
                <Switch checked={form.required} onCheckedChange={(value) => updateForm('required', value)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div><p className="font-medium">Pergunta ativa</p><p className="text-xs text-muted-foreground">Aparece no fluxo guiado.</p></div>
                <Switch checked={form.active} onCheckedChange={(value) => updateForm('active', value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Salvar alterações' : 'Criar pergunta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir pergunta guiada?"
        description="A pergunta será removida do fluxo. Respostas antigas já salvas não serão apagadas automaticamente."
        confirmLabel="Excluir pergunta"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}