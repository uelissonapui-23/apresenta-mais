import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  FileDown,
  Heart,
  Loader2,
  Megaphone,
  RefreshCw,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import usePlanAccess from '@/hooks/usePlanAccess';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import PlanRequestDialog from '@/components/plan/PlanRequestDialog';
import SupportDialog from '@/components/plan/SupportDialog';

const REQUEST_STATUS_META = {
  pending: { label: 'Pendente', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  under_review: { label: 'Em análise', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  approved: { label: 'Aprovada', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  rejected: { label: 'Rejeitada', className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
  cancelled: { label: 'Cancelada', className: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300' },
  expired: { label: 'Expirada', className: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300' },
};

const CONTRIBUTION_STATUS_META = {
  pending: { label: 'Pendente', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  under_review: { label: 'Em análise', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  confirmed: { label: 'Confirmado', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  rejected: { label: 'Rejeitado', className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
  cancelled: { label: 'Cancelado', className: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300' },
};

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value) || 0);
}

function uniqueById(rows) {
  const map = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.id) map.set(row.id, row);
  }

  return [...map.values()];
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm">Carregando seu plano...</span>
      </div>
    </div>
  );
}

function PlanBenefit({ enabled, icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          enabled
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      </div>
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className={enabled ? '' : 'text-muted-foreground line-through'}>
        {children}
      </span>
    </div>
  );
}

export default function MyPlan() {
  const { toast } = useToast();
  const { user, profile, loading: userLoading } = useCurrentUser();
  const planAccess = usePlanAccess();

  const [plans, setPlans] = useState([]);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [requests, setRequests] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [presentationsCount, setPresentationsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [requestOpen, setRequestOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [requestedPlanId, setRequestedPlanId] = useState('');
  const [cancellingRequestId, setCancellingRequestId] = useState('');
  const cancelLockRef = useRef(false);

  const currentPlan = useMemo(
    () => plans.find((p) => p.id === profile?.plan_id),
    [plans, profile?.plan_id],
  );

  const plansForRequest = useMemo(() => {
    if (!requestedPlanId) return plans;

    const selected = plans.find((plan) => plan.id === requestedPlanId);
    if (!selected) return plans;

    return [
      selected,
      ...plans.filter((plan) => plan.id !== requestedPlanId),
    ];
  }, [plans, requestedPlanId]);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);

    try {
      const [planRows, configRows, requestRows, contributionRows, presRows] = await Promise.all([
        base44.entities.Plan.filter({ active: true }, 'order_index', 200),
        base44.entities.PaymentConfiguration.filter({ active: true }, '-updated_date', 5),
        base44.entities.PlanRequest.filter({ user_id: user.id }, '-created_date', 50),
        base44.entities.SupportContribution.filter({ user_id: user.id }, '-created_date', 50),
        base44.entities.Presentation.filter({ user_id: user.id }, '-created_date', 500),
      ]);

      const loadedPlans = uniqueById(planRows);
      const loadedConfigs = uniqueById(configRows);
      const loadedRequests = uniqueById(requestRows);
      const loadedContributions = uniqueById(contributionRows);
      const loadedPresentations = uniqueById(presRows);

      setPlans(loadedPlans);
      setPaymentConfig(loadedConfigs[0] || null);
      setRequests(loadedRequests);
      setContributions(loadedContributions);
      setPresentationsCount(loadedPresentations.length);
    } catch {
      toast({
        title: 'Não foi possível carregar',
        description: 'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast, user?.id]);

  useEffect(() => {
    if (!userLoading) loadData();
  }, [userLoading, loadData]);

  const handleCancelRequest = async (requestId) => {
    if (!requestId || cancelLockRef.current || cancellingRequestId) return;

    const request = requests.find((item) => item.id === requestId);

    if (
      !request
      || request.user_id !== user?.id
      || !['pending', 'under_review'].includes(request.status)
    ) {
      toast({
        title: 'Solicitação não pode ser cancelada',
        description: 'Atualize a página para conferir o status mais recente.',
        variant: 'destructive',
      });
      await loadData({ silent: true });
      return;
    }

    cancelLockRef.current = true;
    setCancellingRequestId(requestId);

    try {
      await base44.entities.PlanRequest.update(requestId, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by_user_id: user.id,
      });

      setRequests((current) =>
        current.map((item) => (
          item.id === requestId
            ? {
                ...item,
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancelled_by_user_id: user.id,
              }
            : item
        )),
      );

      toast({ title: 'Solicitação cancelada' });
    } catch (error) {
      console.error('Erro ao cancelar solicitação:', error);
      toast({
        title: 'Não foi possível cancelar',
        description: 'A solicitação pode ter sido analisada enquanto você estava nesta página.',
        variant: 'destructive',
      });
      await loadData({ silent: true });
    } finally {
      cancelLockRef.current = false;
      setCancellingRequestId('');
    }
  };

  const maxPresentations = currentPlan?.max_presentations ?? -1;
  const usagePercent = maxPresentations > 0
    ? Math.min(100, Math.round((presentationsCount / maxPresentations) * 100))
    : 0;

  if (userLoading || loading) return <LoadingState />;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link to="/" aria-label="Voltar ao início">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">Sua conta</p>
            <h1 className="text-2xl font-bold sm:text-3xl">Meu Plano</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe seu plano, limites e contribuições para o Apresenta+.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setRefreshing(true);
            loadData({ silent: true });
          }}
          disabled={refreshing || Boolean(cancellingRequestId)}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </header>

      {/* Current Plan Card */}
      <Card className="overflow-hidden border-border/70">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={
                planAccess.permanentAdFree || planAccess.isPlanActive
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }
            >
              <Shield className="mr-1 h-3 w-3" />
              {planAccess.permanentAdFree
                ? 'Liberação permanente'
                : planAccess.isPlanActive
                  ? 'Plano ativo'
                  : 'Plano gratuito'}
            </Badge>

            {planAccess.shouldShowAds && !planAccess.permanentAdFree && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <Megaphone className="mr-1 h-3 w-3" />
                Exibe anúncios
              </Badge>
            )}
          </div>

          <CardTitle className="mt-2 text-xl">
            {currentPlan?.name || 'Plano Gratuito'}
          </CardTitle>

          {currentPlan?.description && (
            <p className="text-sm text-muted-foreground">
              {currentPlan.description}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Início
              </p>
              <p className="mt-1 text-sm font-medium">
                {formatDate(profile?.plan_start_date)}
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Vencimento
              </p>
              <p className="mt-1 text-sm font-medium">
                {planAccess.permanentAdFree ? 'Permanente' : formatDate(profile?.plan_expires_at)}
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Dias restantes</p>
              <p className="mt-1 text-sm font-medium">
                {planAccess.permanentAdFree
                  ? '∞'
                  : planAccess.daysRemaining !== null
                    ? `${planAccess.daysRemaining} dia(s)`
                    : '—'}
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Megaphone className="h-3.5 w-3.5" />
                Anúncios
              </p>
              <p className="mt-1 text-sm font-medium">
                {planAccess.shouldShowAds ? 'Visíveis' : 'Sem anúncios'}
              </p>
            </div>
          </div>

          {planAccess.isPlanExpiringSoon && (
            <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              Seu plano vence em {planAccess.daysRemaining} dia(s). Renove para
              continuar sem anúncios.
            </div>
          )}

          {currentPlan && (
            <div className="space-y-2">
              <PlanBenefit enabled={!!currentPlan.can_export_pdf} icon={FileDown}>
                Exportação para PDF
              </PlanBenefit>
              <PlanBenefit enabled={!!currentPlan.can_use_ai} icon={Sparkles}>
                Assistente de IA (futuro)
              </PlanBenefit>
              <PlanBenefit enabled={!!currentPlan.can_use_premium_templates} icon={Crown}>
                Modelos premium
              </PlanBenefit>
              <PlanBenefit enabled={!!currentPlan.can_sync_devices} icon={CheckCircle2}>
                Sincronização entre dispositivos
              </PlanBenefit>
            </div>
          )}

          {maxPresentations > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Apresentações criadas</span>
                <span>{presentationsCount} / {maxPresentations}</span>
              </div>
              <Progress value={usagePercent} className="h-2" />
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => {
                setRequestedPlanId(
                  planAccess.isPlanActive && !planAccess.permanentAdFree
                    ? profile?.plan_id || ''
                    : '',
                );
                setRequestOpen(true);
              }}
              className="flex-1"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {planAccess.isPlanActive && !planAccess.permanentAdFree ? 'Renovar plano' : 'Solicitar plano'}
            </Button>

            <Button
              variant="outline"
              onClick={() => setSupportOpen(true)}
              className="flex-1"
            >
              <Heart className="mr-2 h-4 w-4 text-rose-500" />
              Apoiar projeto
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Planos disponíveis</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans
            .filter((p) => p.active)
            .map((plan) => {
              const isCurrent = plan.id === profile?.plan_id;
              const isFree = plan.billing_period === 'free' || Number(plan.price) <= 0;

              return (
                <Card
                  key={plan.id}
                  className={`relative overflow-hidden ${
                    plan.highlight ? 'border-primary shadow-md' : 'border-border/70'
                  } ${isCurrent ? 'ring-2 ring-primary' : ''}`}
                >
                  {plan.recommended && (
                    <div className="absolute right-0 top-0 rounded-bl-lg bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                      Recomendado
                    </div>
                  )}

                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${plan.color || '#3B82F6'}20`, color: plan.color || '#3B82F6' }}
                      >
                        <Crown className="h-4 w-4" />
                      </div>
                      <h3 className="font-semibold">{plan.name}</h3>
                    </div>

                    <div className="mt-3">
                      <span className="text-2xl font-bold">
                        {isFree ? 'Grátis' : formatCurrency(plan.price)}
                      </span>
                      {!isFree && (
                        <span className="text-xs text-muted-foreground">
                          {plan.billing_period === 'monthly' ? '/mês' : plan.billing_period === 'yearly' ? '/ano' : ''}
                        </span>
                      )}
                    </div>

                    {plan.explanatory_text && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {plan.explanatory_text}
                      </p>
                    )}

                    {plan.shows_ads === false && (
                      <Badge variant="secondary" className="mt-3">
                        <Check className="mr-1 h-3 w-3" />
                        Sem anúncios
                      </Badge>
                    )}

                    {isCurrent && (
                      <Badge className="mt-3 w-full justify-center">
                        Plano atual
                      </Badge>
                    )}

                    {!isCurrent && !isFree && (
                      <Button
                        variant={plan.highlight ? 'default' : 'outline'}
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => {
                          setRequestedPlanId(plan.id);
                          setRequestOpen(true);
                        }}
                      >
                        Solicitar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </section>

      {/* Request History */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Histórico de solicitações</h2>

        {requests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Você ainda não enviou solicitações de plano.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => {
              const plan = plans.find((p) => p.id === req.plan_id);
              const statusMeta = REQUEST_STATUS_META[req.status] || REQUEST_STATUS_META.pending;

              return (
                <Card key={req.id} className="border-border/70">
                  <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{plan?.name || 'Plano'}</span>
                        <Badge variant="outline" className={statusMeta.className}>
                          {statusMeta.label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{formatCurrency(req.amount_informed)}</span>
                        <span>Solicitado: {formatDate(req.created_date)}</span>
                        {req.payment_date && <span>Pago: {formatDate(req.payment_date)}</span>}
                      </div>
                      {req.rejection_reason && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                          Motivo: {req.rejection_reason}
                        </p>
                      )}
                      {req.user_note && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Obs: {req.user_note}
                        </p>
                      )}
                    </div>

                    {(req.status === 'pending' || req.status === 'under_review') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleCancelRequest(req.id)}
                        disabled={Boolean(cancellingRequestId)}
                      >
                        {cancellingRequestId === req.id && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Cancelar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Support Contributions */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Histórico de apoios</h2>

        {contributions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Você ainda não enviou apoios. Considere contribuir com o projeto!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {contributions.map((contrib) => {
              const statusMeta = CONTRIBUTION_STATUS_META[contrib.status] || CONTRIBUTION_STATUS_META.pending;
              return (
                <Card key={contrib.id} className="border-border/70">
                  <CardContent className="flex items-center justify-between gap-2 p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{formatCurrency(contrib.amount)}</span>
                        <Badge variant="outline" className={statusMeta.className}>
                          {statusMeta.label}
                        </Badge>
                      </div>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {formatDate(contrib.created_date)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <p className="pb-2 text-center text-xs text-muted-foreground">
        A aprovação de planos e apoios é realizada manualmente pelo administrador.
      </p>

      <PlanRequestDialog
        open={requestOpen}
        onOpenChange={(open) => {
          setRequestOpen(open);
          if (!open) setRequestedPlanId('');
        }}
        plans={plansForRequest}
        paymentConfig={paymentConfig}
        userId={user?.id || ''}
        currentPlanId={profile?.plan_id || ''}
        onSubmitted={() => loadData({ silent: true })}
      />

      <SupportDialog
        open={supportOpen}
        onOpenChange={setSupportOpen}
        paymentConfig={paymentConfig}
        user={user}
        onSubmitted={() => loadData({ silent: true })}
      />
    </div>
  );
}