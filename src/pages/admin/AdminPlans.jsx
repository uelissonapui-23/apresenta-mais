import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  Cloud,
  Crown,
  FileDown,
  HardDrive,
  Infinity as InfinityIcon,
  Megaphone,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';

const BILLING_PERIODS = [
  { value: 'free', label: 'Gratuito' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
  { value: 'lifetime', label: 'Vitalício' },
];

const DEFAULT_FORM = {
  name: '',
  description: '',
  price: 0,
  billing_period: 'free',
  duration_days: 0,
  shows_ads: true,
  order_index: 0,
  max_presentations: -1,
  max_storage: -1,
  can_export_pdf: false,
  can_use_ai: false,
  can_use_premium_templates: false,
  can_sync_devices: false,
  active: true,
};

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function uniqueById(value) {
  const map = new Map();
  for (const item of Array.isArray(value) ? value : []) {
    if (item?.id) map.set(item.id, item);
  }
  return [...map.values()];
}

function getRecommendedDuration(period) {
  if (period === 'monthly') return 30;
  if (period === 'yearly') return 365;
  return 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(normalizeNumber(value, 0));
}

function getBillingLabel(value) {
  return BILLING_PERIODS.find((item) => item.value === value)?.label || value || 'Não definido';
}

function getBillingSuffix(value) {
  if (value === 'monthly') return '/mês';
  if (value === 'yearly') return '/ano';
  if (value === 'lifetime') return ' pagamento único';
  return '';
}

function formatLimit(value, singular, plural) {
  const number = normalizeNumber(value, -1);

  if (number < 0) {
    return 'Ilimitado';
  }

  if (number === 0) {
    return `Sem ${plural}`;
  }

  return `${number} ${number === 1 ? singular : plural}`;
}

function formatStorage(value) {
  const number = normalizeNumber(value, -1);

  if (number < 0) return 'Ilimitado';
  if (number === 0) return 'Sem armazenamento adicional';

  return `${number} MB`;
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
            Apenas administradores podem gerenciar os planos do aplicativo.
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
        <p className="text-sm">Carregando planos...</p>
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

function FeatureRow({ enabled, icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          enabled
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {enabled ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      </div>
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className={enabled ? '' : 'text-muted-foreground line-through'}>{children}</span>
    </div>
  );
}

function PlanCard({ plan, userCount, onEdit, onToggleActive, onDelete, busy }) {
  const isFree = plan.billing_period === 'free' || normalizeNumber(plan.price, 0) <= 0;

  return (
    <Card className={`relative overflow-hidden border-border/70 ${!plan.active ? 'opacity-70' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate text-lg">{plan.name || 'Plano sem nome'}</CardTitle>
              <Badge variant={plan.active ? 'default' : 'secondary'}>
                {plan.active ? 'Ativo' : 'Inativo'}
              </Badge>
              {isFree && <Badge variant="outline">Gratuito</Badge>}
            </div>
            <p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">
              {plan.description || 'Sem descrição cadastrada.'}
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <Crown className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-0">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Valor
          </p>
          <div className="mt-1 flex items-end gap-1">
            <span className="text-2xl font-bold">
              {isFree ? 'Grátis' : formatCurrency(plan.price)}
            </span>
            {!isFree && (
              <span className="pb-1 text-xs text-muted-foreground">
                {getBillingSuffix(plan.billing_period)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cobrança: {getBillingLabel(plan.billing_period)}
          </p>
          {plan.billing_period !== 'free' && plan.billing_period !== 'lifetime' && (
            <p className="mt-1 text-xs text-muted-foreground">
              Duração: {Math.max(0, normalizeNumber(plan.duration_days, 0))} dias
            </p>
          )}
        </div>

        <div className="grid gap-2 rounded-xl border bg-muted/20 p-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Apresentações</p>
            <p className="text-sm font-semibold">
              {formatLimit(plan.max_presentations, 'apresentação', 'apresentações')}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Armazenamento</p>
            <p className="text-sm font-semibold">{formatStorage(plan.max_storage)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <FeatureRow enabled={!!plan.can_export_pdf} icon={FileDown}>
            Exportação para PDF
          </FeatureRow>
          <FeatureRow enabled={!!plan.can_use_ai} icon={Bot}>
            Assistente de inteligência artificial
          </FeatureRow>
          <FeatureRow enabled={!!plan.can_use_premium_templates} icon={Sparkles}>
            Modelos premium
          </FeatureRow>
          <FeatureRow enabled={!!plan.can_sync_devices} icon={Cloud}>
            Sincronização entre dispositivos
          </FeatureRow>
          <FeatureRow enabled={plan.shows_ads === false} icon={Megaphone}>
            Uso sem anúncios
          </FeatureRow>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              <strong>{userCount}</strong> {userCount === 1 ? 'usuário' : 'usuários'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleActive(plan)}
            disabled={busy}
          >
            {plan.active ? 'Desativar' : 'Ativar'}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onEdit(plan)}
            disabled={busy}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(plan)}
            disabled={busy}
            aria-label={`Excluir plano ${plan.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FormField({ label, description, children, required = false }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

function ToggleField({ checked, onChange, icon: Icon, title, description }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border p-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-4 w-4 text-foreground/70" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function AdminPlans() {
  const { user, isAdmin, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();

  const [plans, setPlans] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const saveLockRef = useRef(false);
  const actionLockRef = useRef(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!isAdmin) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!silent) setLoading(true);

    try {
      const [planRows, profileRows] = await Promise.all([
        base44.entities.Plan.list('price', 200),
        base44.entities.UserProfile.list('-created_date', 1000),
      ]);

      setPlans(uniqueById(planRows));
      setProfiles(uniqueById(profileRows));
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast({
        title: 'Não foi possível carregar os planos',
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
  }, [userLoading, loadData]);

  const userCountByPlan = useMemo(() => {
    return profiles.reduce((map, profile) => {
      if (!profile.plan_id) return map;
      map[profile.plan_id] = (map[profile.plan_id] || 0) + 1;
      return map;
    }, {});
  }, [profiles]);

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();

    return plans
      .filter((plan) => {
        if (statusFilter === 'active' && !plan.active) return false;
        if (statusFilter === 'inactive' && plan.active) return false;

        if (!query) return true;

        const text = [
          plan.name,
          plan.description,
          getBillingLabel(plan.billing_period),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return text.includes(query);
      })
      .sort((a, b) => {
        if (!!a.active !== !!b.active) return a.active ? -1 : 1;
        return normalizeNumber(a.price, 0) - normalizeNumber(b.price, 0);
      });
  }, [plans, search, statusFilter]);

  const activeCount = plans.filter((plan) => plan.active).length;
  const paidCount = plans.filter(
    (plan) => plan.billing_period !== 'free' && normalizeNumber(plan.price, 0) > 0,
  ).length;
  const assignedUsers = profiles.filter((profile) => !!profile.plan_id).length;

  const openNew = () => {
    setEditingPlan(null);
    setForm({ ...DEFAULT_FORM });
    setFormOpen(true);
  };

  const openEdit = (plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name || '',
      description: plan.description || '',
      price: normalizeNumber(plan.price, 0),
      billing_period: plan.billing_period || 'free',
      duration_days: Math.max(0, Math.trunc(normalizeNumber(plan.duration_days, 0))),
      shows_ads: plan.shows_ads !== false,
      order_index: Math.trunc(normalizeNumber(plan.order_index, 0)),
      max_presentations: normalizeNumber(plan.max_presentations, -1),
      max_storage: normalizeNumber(plan.max_storage, -1),
      can_export_pdf: !!plan.can_export_pdf,
      can_use_ai: !!plan.can_use_ai,
      can_use_premium_templates: !!plan.can_use_premium_templates,
      can_sync_devices: !!plan.can_sync_devices,
      active: plan.active !== false,
    });
    setFormOpen(true);
  };

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      toast({
        title: 'Informe o nome do plano',
        variant: 'destructive',
      });
      return false;
    }

    if (normalizeNumber(form.price, 0) < 0) {
      toast({
        title: 'O preço não pode ser negativo',
        variant: 'destructive',
      });
      return false;
    }

    if (
      !['free', 'lifetime'].includes(form.billing_period)
      && Math.trunc(normalizeNumber(form.duration_days, 0)) <= 0
    ) {
      toast({
        title: 'Informe a duração do plano',
        description: 'Planos mensais e anuais precisam ter duração maior que zero.',
        variant: 'destructive',
      });
      return false;
    }

    if (Math.trunc(normalizeNumber(form.order_index, 0)) < 0) {
      toast({
        title: 'Ordem inválida',
        description: 'A ordem de exibição não pode ser negativa.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || saving || saveLockRef.current) return;

    saveLockRef.current = true;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: form.billing_period === 'free' ? 0 : Math.max(0, normalizeNumber(form.price, 0)),
      billing_period: form.billing_period,
      duration_days: ['free', 'lifetime'].includes(form.billing_period)
        ? 0
        : Math.max(1, Math.trunc(normalizeNumber(form.duration_days, 0))),
      shows_ads: !!form.shows_ads,
      order_index: Math.max(0, Math.trunc(normalizeNumber(form.order_index, 0))),
      max_presentations: Math.trunc(normalizeNumber(form.max_presentations, -1)),
      max_storage: Math.trunc(normalizeNumber(form.max_storage, -1)),
      can_export_pdf: !!form.can_export_pdf,
      can_use_ai: !!form.can_use_ai,
      can_use_premium_templates: !!form.can_use_premium_templates,
      can_sync_devices: !!form.can_sync_devices,
      active: !!form.active,
      updated_by_user_id: user?.id || '',
    };

    try {
      if (editingPlan?.id) {
        await base44.entities.Plan.update(editingPlan.id, payload);
        setPlans((current) =>
          current.map((plan) =>
            plan.id === editingPlan.id ? { ...plan, ...payload } : plan,
          ),
        );
        toast({ title: 'Plano atualizado com sucesso' });
      } else {
        const created = await base44.entities.Plan.create(payload);
        setPlans((current) => [created, ...current]);
        toast({ title: 'Plano criado com sucesso' });
      }

      setFormOpen(false);
      setEditingPlan(null);
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      toast({
        title: 'Não foi possível salvar o plano',
        description: 'Revise os dados e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  };

  const handleToggleActive = async (plan) => {
    if (!plan?.id || busyId || actionLockRef.current) return;

    actionLockRef.current = true;
    const nextActive = !plan.active;
    setBusyId(plan.id);

    try {
      await base44.entities.Plan.update(plan.id, { active: nextActive });
      setPlans((current) =>
        current.map((item) =>
          item.id === plan.id ? { ...item, active: nextActive } : item,
        ),
      );
      toast({
        title: nextActive ? 'Plano ativado' : 'Plano desativado',
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

  const requestDelete = (plan) => {
    const linkedUsers = userCountByPlan[plan.id] || 0;

    if (linkedUsers > 0) {
      toast({
        title: 'Este plano está em uso',
        description: `Existem ${linkedUsers} ${linkedUsers === 1 ? 'usuário vinculado' : 'usuários vinculados'}. Desative o plano ou mova os usuários para outro plano antes de excluir.`,
        variant: 'destructive',
      });
      return;
    }

    setDeleteTarget(plan);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id || busyId || actionLockRef.current) return;

    actionLockRef.current = true;
    setBusyId(deleteTarget.id);

    try {
      await base44.entities.Plan.delete(deleteTarget.id);
      setPlans((current) => current.filter((plan) => plan.id !== deleteTarget.id));
      toast({ title: 'Plano excluído' });
      setDeleteTarget(null);
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast({
        title: 'Não foi possível excluir o plano',
        description: 'Verifique se ele ainda está vinculado a algum usuário.',
        variant: 'destructive',
      });
    } finally {
      actionLockRef.current = false;
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
        <div className="flex min-w-0 items-start gap-2">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link to="/admin" aria-label="Voltar à administração">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">Administração</p>
            <h1 className="text-2xl font-bold sm:text-3xl">Planos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure preços, limites e recursos liberados para cada plano.
            </p>
          </div>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing || saving || !!busyId}
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={openNew} className="flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            Novo plano
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={Crown} label="Planos" value={plans.length} description="Total cadastrado" />
        <SummaryCard icon={CheckCircle2} label="Ativos" value={activeCount} description="Disponíveis para uso" />
        <SummaryCard icon={Sparkles} label="Pagos" value={paidCount} description="Com cobrança configurada" />
        <SummaryCard icon={Users} label="Usuários" value={assignedUsers} description="Com plano vinculado" />
      </section>

      <Card className="border-border/70">
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_190px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, descrição ou período..."
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">Todos os status</option>
              <option value="active">Somente ativos</option>
              <option value="inactive">Somente inativos</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {filteredPlans.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            icon={Crown}
            title={plans.length === 0 ? 'Nenhum plano cadastrado' : 'Nenhum plano encontrado'}
            description={
              plans.length === 0
                ? 'Crie o primeiro plano para definir os limites e recursos dos usuários.'
                : 'Ajuste a busca ou os filtros para encontrar outros planos.'
            }
            actionLabel={plans.length === 0 ? 'Criar plano' : undefined}
            onAction={plans.length === 0 ? openNew : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              userCount={userCountByPlan[plan.id] || 0}
              onEdit={openEdit}
              onToggleActive={handleToggleActive}
              onDelete={requestDelete}
              busy={busyId === plan.id}
            />
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={(open) => !saving && setFormOpen(open)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar plano' : 'Criar novo plano'}</DialogTitle>
            <DialogDescription>
              Defina os limites e os recursos liberados para os usuários deste plano.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nome do plano" required>
                <Input
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder="Ex.: Gratuito, Pro, Premium"
                  maxLength={80}
                />
              </FormField>

              <FormField label="Período de cobrança" required>
                <select
                  value={form.billing_period}
                  onChange={(event) => {
                    const value = event.target.value;
                    setForm((current) => ({
                      ...current,
                      billing_period: value,
                      price: value === 'free' ? 0 : current.price,
                      duration_days: getRecommendedDuration(value),
                      shows_ads: value === 'free' ? true : current.shows_ads,
                    }));
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {BILLING_PERIODS.map((period) => (
                    <option key={period.value} value={period.value}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Descrição">
              <Textarea
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                placeholder="Explique para quem este plano é indicado e quais são seus principais benefícios."
                rows={3}
                maxLength={500}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <FormField
                label="Preço"
                description={form.billing_period === 'free' ? 'Planos gratuitos sempre usam valor zero.' : 'Valor cobrado em reais.'}
              >
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  disabled={form.billing_period === 'free'}
                  onChange={(event) => updateForm('price', normalizeNumber(event.target.value, 0))}
                />
              </FormField>

              <FormField
                label="Duração em dias"
                description={
                  ['free', 'lifetime'].includes(form.billing_period)
                    ? 'Não se aplica a este período.'
                    : 'Usada para calcular o vencimento após a aprovação.'
                }
              >
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.duration_days}
                  disabled={['free', 'lifetime'].includes(form.billing_period)}
                  onChange={(event) => updateForm(
                    'duration_days',
                    Math.trunc(normalizeNumber(event.target.value, 0)),
                  )}
                />
              </FormField>

              <FormField
                label="Ordem de exibição"
                description="Menores valores aparecem primeiro."
              >
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.order_index}
                  onChange={(event) => updateForm(
                    'order_index',
                    Math.trunc(normalizeNumber(event.target.value, 0)),
                  )}
                />
              </FormField>

              <FormField
                label="Máximo de apresentações"
                description="Use -1 para ilimitado."
              >
                <Input
                  type="number"
                  min="-1"
                  step="1"
                  value={form.max_presentations}
                  onChange={(event) => updateForm('max_presentations', normalizeNumber(event.target.value, -1))}
                />
              </FormField>

              <FormField
                label="Armazenamento em MB"
                description="Use -1 para ilimitado."
              >
                <Input
                  type="number"
                  min="-1"
                  step="1"
                  value={form.max_storage}
                  onChange={(event) => updateForm('max_storage', normalizeNumber(event.target.value, -1))}
                />
              </FormField>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold">Recursos liberados</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <ToggleField
                  checked={form.can_export_pdf}
                  onChange={(value) => updateForm('can_export_pdf', value)}
                  icon={FileDown}
                  title="Exportação para PDF"
                  description="Permite gerar arquivos PDF das apresentações."
                />
                <ToggleField
                  checked={form.can_use_ai}
                  onChange={(value) => updateForm('can_use_ai', value)}
                  icon={Bot}
                  title="Assistente de IA"
                  description="Libera recursos futuros de ajuda inteligente."
                />
                <ToggleField
                  checked={form.can_use_premium_templates}
                  onChange={(value) => updateForm('can_use_premium_templates', value)}
                  icon={Sparkles}
                  title="Modelos premium"
                  description="Permite utilizar modelos marcados como premium."
                />
                <ToggleField
                  checked={form.can_sync_devices}
                  onChange={(value) => updateForm('can_sync_devices', value)}
                  icon={Cloud}
                  title="Sincronização"
                  description="Libera sincronização entre diferentes dispositivos."
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Megaphone className="h-4 w-4 text-foreground/70" />
                </div>
                <div>
                  <p className="text-sm font-medium">Exibir anúncios</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Quando desativado, usuários com este plano não verão anúncios.
                  </p>
                </div>
              </div>
              <Switch
                checked={form.shows_ads}
                onCheckedChange={(value) => updateForm('shows_ads', value)}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div>
                <p className="text-sm font-medium">Plano ativo</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Planos inativos continuam cadastrados, mas não devem ser oferecidos para novos usuários.
                </p>
              </div>
              <Switch checked={form.active} onCheckedChange={(value) => updateForm('active', value)} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPlan ? 'Salvar alterações' : 'Criar plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir plano"
        description={`Tem certeza que deseja excluir o plano “${deleteTarget?.name || ''}”? Essa ação não poderá ser desfeita.`}
        confirmLabel="Excluir plano"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}