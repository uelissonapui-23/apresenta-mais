import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

      setRequests(Array.isArray(reqRows) ? reqRows : []);
      setPlans(Array.isArray(planRows) ? planRows : []);
      setProfiles(Array.isArray(profileRows) ? profileRows : []);
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
    setAnalyzing(req);
    const today = new Date().toISOString().split('T')[0];
    const plan = planMap[req.plan_id];
    const durationDays = plan?.duration_days || 30;
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + durationDays);

    setActionForm({
      action,
      activation_date: today,
      expiration_date: action === 'approve' ? expiration.toISOString().split('T')[0] : '',
      admin_note: '',
      rejection_reason: '',
    });
  };

  const handleAction = async () => {
    if (!analyzing?.id || saving) return;

    if (actionForm.action === 'reject' && !actionForm.rejection_reason.trim()) {
      toast({ title: 'Informe o motivo da rejeição', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const now = new Date().toISOString();

      if (actionForm.action === 'approve') {
        await base44.entities.PlanRequest.update(analyzing.id, {
          status: 'approved',
          analyzed_at: now,
          analyzed_by_user_id: user?.id || '',
          activation_date: actionForm.activation_date || now,
          expiration_date: actionForm.expiration_date || '',
          admin_note: actionForm.admin_note.trim(),
          rejection_reason: '',
        });

        const profile = profileMap[analyzing.user_id];
        const isPermanent = analyzing.request_type === 'permanent_unlock';

        if (profile?.id) {
          await base44.entities.UserProfile.update(profile.id, {
            plan_id: analyzing.plan_id,
            plan_start_date: actionForm.activation_date || now,
            plan_expires_at: actionForm.expiration_date || '',
            plan_status: isPermanent ? 'permanent' : 'active',
            permanent_ad_free: isPermanent,
            plan_last_changed_at: now,
            plan_changed_by_user_id: user?.id || '',
            plan_note: actionForm.admin_note.trim(),
            plan_activation_reason: 'Manual approval by admin',
            shows_ads: false,
            plan_request_status: 'approved',
          });
        }

        toast({ title: 'Solicitação aprovada', description: 'O plano do usuário foi atualizado.' });
      } else if (actionForm.action === 'reject') {
        await base44.entities.PlanRequest.update(analyzing.id, {
          status: 'rejected',
          analyzed_at: now,
          analyzed_by_user_id: user?.id || '',
          rejection_reason: actionForm.rejection_reason.trim(),
          admin_note: actionForm.admin_note.trim(),
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
        toast({ title: 'Marcada como em análise' });
      }

      setAnalyzing(null);
      loadData({ silent: true });
    } catch {
      toast({ title: 'Não foi possível processar', variant: 'destructive' });
    } finally {
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
                <Input type="date" value={actionForm.activation_date} onChange={(e) => setActionForm((f) => ({ ...f, activation_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Data de vencimento</Label>
                <Input type="date" value={actionForm.expiration_date} onChange={(e) => setActionForm((f) => ({ ...f, expiration_date: e.target.value }))} />
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