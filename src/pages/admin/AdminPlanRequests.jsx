import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  X,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_META = {
  pending: { label: 'Pendente', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  under_review: { label: 'Em análise', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  approved: { label: 'Aprovada', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  rejected: { label: 'Rejeitada', className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
  cancelled: { label: 'Cancelada', className: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300' },
  expired: { label: 'Expirada', className: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300' },
};

const REQUEST_TYPE_LABELS = {
  subscription: 'Assinatura',
  renewal: 'Renovação',
  plan_change: 'Alteração',
  permanent_unlock: 'Liberação permanente',
  other: 'Outro',
};

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

function uniqueById(rows) {
  const map = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.id) map.set(row.id, row);
  }
  return [...map.values()];
}

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

function buildExpirationDate(plan, activationDate) {
  if (!plan || plan.billing_period === 'lifetime') return '';

  const durationDays = Number(plan.duration_days) || 0;
  if (durationDays <= 0) return '';

  const base = activationDate ? new Date(`${activationDate}T12:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return '';

  base.setDate(base.getDate() + durationDays);
  return base.toISOString().split('T')[0];
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-10">
      <Card className="w-full border-destructive/20">
        <CardContent className="p-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Acesso restrito</h1>
          <Button asChild className="mt-6">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPlanRequests() {
  const { toast } = useToast();
  const { user, isAdmin, loading: userLoading } = useCurrentUser();

  const [requests, setRequests] = useState([]);
  const [plans, setPlans] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [analyzing, setAnalyzing] = useState(null);
  const [actionForm, setActionForm] = useState({
    action: 'approve',
    activation_date: '',
    expiration_date: '',
    admin_note: '',
    rejection_reason: '',
  });
  const [saving, setSaving] = useState(false);
  const actionLockRef = useRef(false);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);

    try {
      const [reqRows, planRows, profileRows] = await Promise.all([
        base44.entities.PlanRequest.filter({}, '-created_date', 500),
        base44.entities.Plan.filter({}, 'order_index', 200),
        base44.entities.UserProfile.filter({}, '-created_date', 1000),
      ]);

      setRequests(uniqueById(reqRows));
      setPlans(uniqueById(planRows));
      setProfiles(uniqueById(profileRows));
    } catch {
      toast({ title: 'Falha ao carregar', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    if (!userLoading) loadData();
  }, [userLoading, loadData]);

  const planMap = useMemo(() => Object.fromEntries(plans.map((p) => [p.id, p])), [plans]);
  const profileMap = useMemo(() => Object.fromEntries(profiles.map((p) => [p.user_id, p])), [profiles]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (planFilter !== 'all' && req.plan_id !== planFilter) return false;

      if (!query) return true;

      const profile = profileMap[req.user_id];
      const plan = planMap[req.plan_id];
      const text = [profile?.name, req.payer_name, plan?.name, req.user_note]
        .filter(Boolean).join(' ').toLowerCase();

      return text.includes(query);
    });
  }, [requests, search, statusFilter, planFilter, profileMap, planMap]);

  const openAnalyze = (req, action) => {
    if (!req?.id || saving || actionLockRef.current) return;
    if (!['pending', 'under_review'].includes(req.status)) {
      toast({
        title: 'Solicitação já processada',
        description: 'Atualize a página para conferir o status mais recente.',
        variant: 'destructive',
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const plan = planMap[req.plan_id];

    setAnalyzing(req);
    setActionForm({
      action,
      activation_date: today,
      expiration_date: action === 'approve' ? buildExpirationDate(plan, today) : '',
      admin_note: req.admin_note || '',
      rejection_reason: '',
    });
  };

  const handleAction = async () => {
    if (!analyzing?.id || saving || actionLockRef.current) return;

    const currentRequest = requests.find((request) => request.id === analyzing.id);
    if (!currentRequest || !['pending', 'under_review'].includes(currentRequest.status)) {
      toast({
        title: 'Solicitação já processada',
        description: 'Atualize a página antes de tentar novamente.',
        variant: 'destructive',
      });
      setAnalyzing(null);
      return;
    }

    const plan = planMap[analyzing.plan_id];

    if (actionForm.action === 'approve') {
      if (!plan?.id || plan.active === false) {
        toast({
          title: 'Plano inválido ou inativo',
          description: 'Escolha ou reative o plano antes de aprovar.',
          variant: 'destructive',
        });
        return;
      }

      if (!actionForm.activation_date) {
        toast({ title: 'Informe a data de ativação', variant: 'destructive' });
        return;
      }

      const permanent =
        analyzing.request_type === 'permanent_unlock'
        || plan.billing_period === 'lifetime';

      if (!permanent && Number(plan.duration_days) > 0 && !actionForm.expiration_date) {
        toast({ title: 'Informe a data de vencimento', variant: 'destructive' });
        return;
      }

      if (
        actionForm.expiration_date
        && actionForm.expiration_date < actionForm.activation_date
      ) {
        toast({
          title: 'Data de vencimento inválida',
          description: 'O vencimento não pode ser anterior à ativação.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (actionForm.action === 'reject' && !actionForm.rejection_reason.trim()) {
      toast({ title: 'Informe o motivo da rejeição', variant: 'destructive' });
      return;
    }

    actionLockRef.current = true;
    setSaving(true);

    try {
      const now = new Date().toISOString();

      if (actionForm.action === 'approve') {
        const isPermanent =
          analyzing.request_type === 'permanent_unlock'
          || plan.billing_period === 'lifetime';

        const activationDate = actionForm.activation_date;
        const expirationDate = isPermanent ? '' : actionForm.expiration_date;
        const existingProfile = profileMap[analyzing.user_id];

        const profilePayload = {
          plan_id: analyzing.plan_id,
          plan_start_date: activationDate,
          plan_expires_at: expirationDate,
          plan_status: isPermanent ? 'permanent' : 'active',
          permanent_ad_free: isPermanent || plan.shows_ads === false,
          plan_last_changed_at: now,
          plan_changed_by_user_id: user?.id || '',
          plan_note: actionForm.admin_note.trim(),
          plan_activation_reason: 'manual_admin_approval',
          shows_ads: isPermanent ? false : plan.shows_ads !== false,
          plan_request_status: 'approved',
          active: true,
        };

        let savedProfile;

        if (existingProfile?.id) {
          savedProfile = await base44.entities.UserProfile.update(
            existingProfile.id,
            profilePayload,
          );
        } else {
          savedProfile = await base44.entities.UserProfile.create({
            user_id: analyzing.user_id,
            name: analyzing.payer_name?.trim() || 'Usuário',
            role: 'user',
            onboarding_completed: false,
            ...profilePayload,
          });
        }

        try {
          await base44.entities.PlanRequest.update(analyzing.id, {
            status: 'approved',
            analyzed_at: now,
            analyzed_by_user_id: user?.id || '',
            activation_date: activationDate,
            expiration_date: expirationDate,
            admin_note: actionForm.admin_note.trim(),
            rejection_reason: '',
          });
        } catch (requestError) {
          if (savedProfile?.id) {
            const rollbackPayload = existingProfile?.id
              ? {
                  plan_id: existingProfile.plan_id || '',
                  plan_start_date: existingProfile.plan_start_date || '',
                  plan_expires_at: existingProfile.plan_expires_at || '',
                  plan_status: existingProfile.plan_status || 'none',
                  permanent_ad_free: !!existingProfile.permanent_ad_free,
                  plan_last_changed_at: existingProfile.plan_last_changed_at || '',
                  plan_changed_by_user_id: existingProfile.plan_changed_by_user_id || '',
                  plan_note: existingProfile.plan_note || '',
                  plan_activation_reason: existingProfile.plan_activation_reason || '',
                  shows_ads: existingProfile.shows_ads !== false,
                  plan_request_status: existingProfile.plan_request_status || '',
                  active: existingProfile.active !== false,
                }
              : {
                  plan_id: '',
                  plan_start_date: '',
                  plan_expires_at: '',
                  plan_status: 'none',
                  permanent_ad_free: false,
                  plan_last_changed_at: now,
                  plan_changed_by_user_id: user?.id || '',
                  plan_note: 'Ativação revertida após falha ao concluir a solicitação.',
                  plan_activation_reason: 'approval_rollback',
                  shows_ads: true,
                  plan_request_status: 'pending',
                };

            try {
              await base44.entities.UserProfile.update(savedProfile.id, rollbackPayload);
            } catch {
              // A tela será recarregada e o administrador receberá o erro principal.
            }
          }
          throw requestError;
        }

        toast({
          title: 'Solicitação aprovada',
          description: 'O plano do usuário foi ativado com sucesso.',
        });
      } else if (actionForm.action === 'reject') {
        await base44.entities.PlanRequest.update(analyzing.id, {
          status: 'rejected',
          analyzed_at: now,
          analyzed_by_user_id: user?.id || '',
          rejection_reason: actionForm.rejection_reason.trim(),
          admin_note: actionForm.admin_note.trim(),
          activation_date: '',
          expiration_date: '',
        });

        const profile = profileMap[analyzing.user_id];
        if (profile?.id) {
          await base44.entities.UserProfile.update(profile.id, {
            plan_request_status: 'rejected',
          });
        }

        toast({ title: 'Solicitação rejeitada' });
      } else if (actionForm.action === 'under_review') {
        await base44.entities.PlanRequest.update(analyzing.id, {
          status: 'under_review',
          analyzed_at: now,
          analyzed_by_user_id: user?.id || '',
          admin_note: actionForm.admin_note.trim(),
        });

        const profile = profileMap[analyzing.user_id];
        if (profile?.id) {
          await base44.entities.UserProfile.update(profile.id, {
            plan_request_status: 'under_review',
          });
        }

        toast({ title: 'Solicitação marcada como em análise' });
      }

      setAnalyzing(null);
      await loadData({ silent: true });
    } catch (error) {
      console.error('Erro ao processar solicitação de plano:', error);
      toast({
        title: 'Não foi possível processar',
        description: 'Nenhuma aprovação deve ser considerada concluída até a lista ser atualizada.',
        variant: 'destructive',
      });
      await loadData({ silent: true });
    } finally {
      actionLockRef.current = false;
      setSaving(false);
    }
  };

  if (userLoading || loading) return <LoadingState />;
  if (!isAdmin) return <AccessDenied />;

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const underReviewCount = requests.filter((r) => r.status === 'under_review').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;

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
          <h1 className="text-2xl font-bold sm:text-3xl">Solicitações de plano</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Analise, aprove ou rejeite solicitações de plano manualmente.
          </p>
        </div>

        <Button variant="outline" onClick={() => { setRefreshing(true); loadData({ silent: true }); }} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="mt-1 text-2xl font-bold">{requests.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{pendingCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Em análise</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{underReviewCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Aprovadas</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{approvedCount}</p>
        </CardContent></Card>
      </section>

      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_180px_200px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome..." className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(STATUS_META).map(([value, meta]) => (
                <SelectItem key={value} value={value}>{meta.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger><SelectValue placeholder="Plano" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planos</SelectItem>
              {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filteredRequests.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Nenhuma solicitação encontrada.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const profile = profileMap[req.user_id];
            const plan = planMap[req.plan_id];
            const statusMeta = STATUS_META[req.status] || STATUS_META.pending;

            return (
              <Card key={req.id} className="border-border/70">
                <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{profile?.name || 'Usuário'}</span>
                      <Badge variant="outline" className={statusMeta.className}>{statusMeta.label}</Badge>
                      <Badge variant="secondary">{REQUEST_TYPE_LABELS[req.request_type] || req.request_type}</Badge>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      <span>Plano: {plan?.name || '—'}</span>
                      <span>Valor: {formatCurrency(req.amount_informed)}</span>
                      <span>Pago: {formatDate(req.payment_date)}</span>
                      <span>Solicitado: {formatDate(req.created_date)}</span>
                    </div>

                    {req.payer_name && <p className="mt-1 text-xs text-muted-foreground">Pagador: {req.payer_name}</p>}
                    {req.user_note && <p className="mt-1 text-xs text-muted-foreground">Obs: {req.user_note}</p>}
                    {req.rejection_reason && <p className="mt-1 text-xs text-red-600">Rejeição: {req.rejection_reason}</p>}
                    {req.admin_note && <p className="mt-1 text-xs text-muted-foreground">Admin: {req.admin_note}</p>}

                    {req.proof_url && (
                      <a href={req.proof_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" />
                        Ver comprovante
                      </a>
                    )}
                  </div>

                  {(req.status === 'pending' || req.status === 'under_review') && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openAnalyze(req, 'under_review')}>
                        <Clock className="mr-1 h-3.5 w-3.5" />
                        Em análise
                      </Button>
                      <Button size="sm" onClick={() => openAnalyze(req, 'approve')}>
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Aprovar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => openAnalyze(req, 'reject')}>
                        <X className="mr-1 h-3.5 w-3.5" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(analyzing)} onOpenChange={(v) => !saving && !v && setAnalyzing(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionForm.action === 'approve' ? 'Aprovar solicitação' : actionForm.action === 'reject' ? 'Rejeitar solicitação' : 'Marcar em análise'}
            </DialogTitle>
            <DialogDescription>
              {actionForm.action === 'approve'
                ? 'O plano do usuário será atualizado ao aprovar.'
                : actionForm.action === 'reject'
                  ? 'O plano atual do usuário não será alterado.'
                  : 'A solicitação será marcada como em análise.'}
            </DialogDescription>
          </DialogHeader>

          {actionForm.action === 'approve' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data de ativação</Label>
                <Input
                  type="date"
                  value={actionForm.activation_date}
                  onChange={(e) => {
                    const activationDate = e.target.value;
                    const selectedPlan = planMap[analyzing?.plan_id];
                    setActionForm((current) => ({
                      ...current,
                      activation_date: activationDate,
                      expiration_date:
                        selectedPlan?.billing_period === 'lifetime'
                          ? ''
                          : buildExpirationDate(selectedPlan, activationDate),
                    }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de vencimento</Label>
                <Input
                  type="date"
                  value={actionForm.expiration_date}
                  min={actionForm.activation_date || undefined}
                  disabled={
                    analyzing?.request_type === 'permanent_unlock'
                    || planMap[analyzing?.plan_id]?.billing_period === 'lifetime'
                  }
                  onChange={(e) => setActionForm((current) => ({
                    ...current,
                    expiration_date: e.target.value,
                  }))}
                />
                {(analyzing?.request_type === 'permanent_unlock'
                  || planMap[analyzing?.plan_id]?.billing_period === 'lifetime') && (
                  <p className="text-xs text-muted-foreground">
                    Este plano não possui vencimento.
                  </p>
                )}
              </div>
            </div>
          )}

          {actionForm.action === 'reject' && (
            <div className="space-y-2">
              <Label>Motivo da rejeição *</Label>
              <Textarea value={actionForm.rejection_reason} onChange={(e) => setActionForm((f) => ({ ...f, rejection_reason: e.target.value }))} rows={2} placeholder="Explique o motivo..." />
            </div>
          )}

          <div className="space-y-2">
            <Label>Observação interna</Label>
            <Textarea value={actionForm.admin_note} onChange={(e) => setActionForm((f) => ({ ...f, admin_note: e.target.value }))} rows={2} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAnalyzing(null)} disabled={saving}>Cancelar</Button>
            <Button
              variant={actionForm.action === 'reject' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionForm.action === 'approve' ? 'Aprovar' : actionForm.action === 'reject' ? 'Rejeitar' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}