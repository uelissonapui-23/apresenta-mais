import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Heart,
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
  confirmed: { label: 'Confirmado', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  rejected: { label: 'Rejeitado', className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
  cancelled: { label: 'Cancelado', className: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300' },
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

export default function AdminSupportContributions() {
  const { toast } = useToast();
  const { user, isAdmin, loading: userLoading } = useCurrentUser();

  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [analyzing, setAnalyzing] = useState(null);
  const [actionForm, setActionForm] = useState({ action: 'confirm', admin_notes: '', rejection_reason: '' });
  const [saving, setSaving] = useState(false);
  const actionLockRef = useRef(false);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);

    try {
      const rows = await base44.entities.SupportContribution.filter({}, '-created_date', 500);
      setContributions(uniqueById(rows));
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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contributions.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!query) return true;
      return [c.name, c.email, c.user_message].filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }, [contributions, search, statusFilter]);

  const totals = useMemo(() => {
    const confirmed = contributions.filter((c) => c.status === 'confirmed');
    const pending = contributions.filter((c) => c.status === 'pending' || c.status === 'under_review');
    return {
      confirmedAmount: confirmed.reduce((s, c) => s + (Number(c.amount) || 0), 0),
      pendingAmount: pending.reduce((s, c) => s + (Number(c.amount) || 0), 0),
      confirmedCount: confirmed.length,
      pendingCount: pending.length,
    };
  }, [contributions]);

  const openAnalyze = (contrib, action) => {
    if (!contrib?.id || saving || actionLockRef.current) return;

    if (!['pending', 'under_review'].includes(contrib.status)) {
      toast({
        title: 'Apoio já processado',
        description: 'Atualize a página para conferir o status mais recente.',
        variant: 'destructive',
      });
      return;
    }

    setAnalyzing(contrib);
    setActionForm({
      action,
      admin_notes: action === 'confirm' ? (contrib.admin_notes || '') : '',
      rejection_reason: action === 'reject' ? (contrib.rejection_reason || contrib.admin_notes || '') : '',
    });
  };

  const handleAction = async () => {
    if (!analyzing?.id || saving || actionLockRef.current) return;

    const currentContribution = contributions.find((item) => item.id === analyzing.id);
    if (!currentContribution || !['pending', 'under_review'].includes(currentContribution.status)) {
      toast({
        title: 'Apoio já processado',
        description: 'Atualize a página antes de tentar novamente.',
        variant: 'destructive',
      });
      setAnalyzing(null);
      return;
    }

    if (actionForm.action === 'reject' && !actionForm.rejection_reason.trim()) {
      toast({ title: 'Informe o motivo da rejeição', variant: 'destructive' });
      return;
    }

    actionLockRef.current = true;
    setSaving(true);

    try {
      const now = new Date().toISOString();

      if (actionForm.action === 'confirm') {
        await base44.entities.SupportContribution.update(analyzing.id, {
          status: 'confirmed',
          analyzed_at: now,
          analyzed_by_user_id: user?.id || '',
          admin_notes: actionForm.admin_notes.trim(),
          rejection_reason: '',
        });

        toast({ title: 'Apoio confirmado' });
      } else if (actionForm.action === 'reject') {
        await base44.entities.SupportContribution.update(analyzing.id, {
          status: 'rejected',
          analyzed_at: now,
          analyzed_by_user_id: user?.id || '',
          admin_notes: actionForm.admin_notes.trim(),
          rejection_reason: actionForm.rejection_reason.trim(),
        });

        toast({ title: 'Apoio rejeitado' });
      }

      setAnalyzing(null);
      await loadData({ silent: true });
    } catch (error) {
      console.error('Erro ao processar apoio:', error);
      toast({
        title: 'Não foi possível processar',
        description: 'Atualize a lista antes de tentar novamente.',
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
          <h1 className="text-2xl font-bold sm:text-3xl">Apoios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirme ou rejeite contribuições de apoio via PIX.
          </p>
        </div>

        <Button variant="outline" onClick={() => { setRefreshing(true); loadData({ silent: true }); }} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total confirmado</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{formatCurrency(totals.confirmedAmount)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Apoiadores</p>
          <p className="mt-1 text-xl font-bold">{totals.confirmedCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pendente</p>
          <p className="mt-1 text-xl font-bold text-amber-600">{formatCurrency(totals.pendingAmount)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Aguardando</p>
          <p className="mt-1 text-xl font-bold">{totals.pendingCount}</p>
        </CardContent></Card>
      </section>

      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail..." className="pl-9" />
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
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Nenhum apoio encontrado.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((contrib) => {
            const statusMeta = STATUS_META[contrib.status] || STATUS_META.pending;
            return (
              <Card key={contrib.id} className="border-border/70">
                <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Heart className="h-4 w-4 text-rose-500" />
                      <span className="font-semibold">{contrib.name}</span>
                      <Badge variant="outline" className={statusMeta.className}>{statusMeta.label}</Badge>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{formatCurrency(contrib.amount)}</span>
                      <span>Data: {formatDate(contrib.payment_date)}</span>
                      <span>Enviado: {formatDate(contrib.created_date)}</span>
                    </div>

                    {contrib.email && <p className="mt-1 text-xs text-muted-foreground">{contrib.email}</p>}
                    {contrib.user_message && <p className="mt-1 text-xs text-muted-foreground">Mensagem: {contrib.user_message}</p>}
                    {contrib.admin_notes && <p className="mt-1 text-xs text-muted-foreground">Admin: {contrib.admin_notes}</p>}

                    {contrib.proof_url && (
                      <a href={contrib.proof_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" />
                        Ver comprovante
                      </a>
                    )}
                  </div>

                  {(contrib.status === 'pending' || contrib.status === 'under_review') && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => openAnalyze(contrib, 'confirm')}>
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Confirmar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => openAnalyze(contrib, 'reject')}>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionForm.action === 'confirm' ? 'Confirmar apoio' : 'Rejeitar apoio'}
            </DialogTitle>
            <DialogDescription>
              {actionForm.action === 'confirm'
                ? 'O apoio será confirmado. O plano do usuário não será alterado automaticamente.'
                : 'O apoio será rejeitado. Nenhum dado será apagado.'}
            </DialogDescription>
          </DialogHeader>

          {actionForm.action === 'confirm' ? (
            <div className="space-y-2">
              <Label>Observação administrativa</Label>
              <Textarea
                value={actionForm.admin_notes}
                onChange={(e) => setActionForm((current) => ({
                  ...current,
                  admin_notes: e.target.value,
                }))}
                rows={3}
                placeholder="Observação interna opcional..."
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Motivo da rejeição</Label>
                <Textarea
                  value={actionForm.rejection_reason}
                  onChange={(e) => setActionForm((current) => ({
                    ...current,
                    rejection_reason: e.target.value,
                  }))}
                  rows={3}
                  placeholder="Explique o motivo da rejeição..."
                />
              </div>

              <div className="space-y-2">
                <Label>Observação administrativa (opcional)</Label>
                <Textarea
                  value={actionForm.admin_notes}
                  onChange={(e) => setActionForm((current) => ({
                    ...current,
                    admin_notes: e.target.value,
                  }))}
                  rows={2}
                  placeholder="Anotação interna..."
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAnalyzing(null)} disabled={saving}>Cancelar</Button>
            <Button
              variant={actionForm.action === 'reject' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionForm.action === 'confirm' ? 'Confirmar' : 'Rejeitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}