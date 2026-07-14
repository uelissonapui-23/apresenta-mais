import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Crown,
  Edit3,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserRound,
  UserX,
  Users,
  XCircle,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const ROLE_OPTIONS = [
  { value: 'all', label: 'Todas as funções' },
  { value: 'user', label: 'Usuários' },
  { value: 'admin', label: 'Administradores' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' },
  { value: 'pending', label: 'Onboarding pendente' },
];

function normalizeRows(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getInitials(name) {
  const parts = String(name || 'Usuário')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || 'U';
}

function formatDate(value) {
  if (!value) return 'Não informado';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Não informado';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatPlanName(plan) {
  return plan?.name || 'Sem plano definido';
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <span className="text-sm">Carregando usuários...</span>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-10">
      <Card className="w-full border-destructive/20">
        <CardContent className="p-7 text-center sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <ShieldCheck className="h-8 w-8 text-destructive" />
          </div>

          <h1 className="mt-5 text-2xl font-bold">Acesso restrito</h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Somente administradores podem visualizar ou alterar contas de usuários.
          </p>

          <Button asChild className="mt-6 w-full sm:w-auto">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, description, accent }) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>

          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UserStatusBadge({ profile }) {
  if (profile.active === false) {
    return (
      <Badge variant="outline" className="border-destructive/30 bg-destructive/5 text-destructive">
        <UserX className="mr-1 h-3 w-3" />
        Inativo
      </Badge>
    );
  }

  if (!profile.onboarding_completed) {
    return (
      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertTriangle className="mr-1 h-3 w-3" />
        Pendente
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
      <UserCheck className="mr-1 h-3 w-3" />
      Ativo
    </Badge>
  );
}

function UserCard({ profile, plan, isCurrentUser, onEdit, busy }) {
  return (
    <Card className="border-border/70 transition-shadow hover:shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-12 w-12 shrink-0 border">
              <AvatarImage src={profile.avatar_url || ''} alt={profile.name || 'Usuário'} />
              <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-semibold">{profile.name || 'Usuário sem nome'}</h3>

                {isCurrentUser && (
                  <Badge variant="secondary">Você</Badge>
                )}

                {profile.role === 'admin' && (
                  <Badge className="bg-violet-600 text-white hover:bg-violet-600">
                    <Crown className="mr-1 h-3 w-3" />
                    Administrador
                  </Badge>
                )}
              </div>

              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{profile.phone || 'Sem telefone'}</span>
                <span>Plano: {formatPlanName(plan)}</span>
                <span>Cadastro: {formatDate(profile.created_date || profile.created_at)}</span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <UserStatusBadge profile={profile} />

                <Badge variant="outline">
                  {profile.onboarding_completed ? 'Onboarding concluído' : 'Onboarding incompleto'}
                </Badge>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => onEdit(profile)}
            disabled={busy}
            className="w-full shrink-0 sm:w-auto"
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Gerenciar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminUsers() {
  const { toast } = useToast();
  const { user, profile: currentProfile, loading: userLoading, isAdmin } = useCurrentUser();

  const [profiles, setProfiles] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  const [editingProfile, setEditingProfile] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    avatar_url: '',
    role: 'user',
    plan_id: '',
    onboarding_completed: false,
    active: true,
  });

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!isAdmin) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!silent) setLoading(true);
    setLoadError('');

    try {
      const [profileRows, planRows] = await Promise.all([
        base44.entities.UserProfile.filter({}, '-created_date', 1000),
        base44.entities.Plan.filter({}, 'name', 200),
      ]);

      setProfiles(normalizeRows(profileRows));
      setPlans(normalizeRows(planRows));
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setLoadError('Não foi possível carregar os usuários agora.');
      toast({
        title: 'Falha ao carregar usuários',
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

  const planMap = useMemo(
    () => Object.fromEntries(plans.map((item) => [item.id, item])),
    [plans],
  );

  const metrics = useMemo(() => {
    const total = profiles.length;
    const active = profiles.filter((item) => item.active !== false).length;
    const admins = profiles.filter((item) => item.role === 'admin').length;
    const pending = profiles.filter((item) => !item.onboarding_completed).length;

    return { total, active, admins, pending };
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const search = normalizeText(query);

    return profiles
      .filter((item) => {
        if (roleFilter !== 'all' && item.role !== roleFilter) return false;

        if (statusFilter === 'active' && item.active === false) return false;
        if (statusFilter === 'inactive' && item.active !== false) return false;
        if (statusFilter === 'pending' && item.onboarding_completed) return false;

        if (planFilter !== 'all') {
          if (planFilter === 'none' && item.plan_id) return false;
          if (planFilter !== 'none' && item.plan_id !== planFilter) return false;
        }

        if (!search) return true;

        const planName = planMap[item.plan_id]?.name || '';
        const haystack = normalizeText([
          item.name,
          item.phone,
          item.role,
          item.user_id,
          planName,
        ].join(' '));

        return haystack.includes(search);
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
  }, [planFilter, planMap, profiles, query, roleFilter, statusFilter]);

  const openEdit = (profile) => {
    setEditingProfile(profile);
    setForm({
      name: profile.name || '',
      phone: profile.phone || '',
      avatar_url: profile.avatar_url || '',
      role: profile.role || 'user',
      plan_id: profile.plan_id || '',
      onboarding_completed: Boolean(profile.onboarding_completed),
      active: profile.active !== false,
    });
  };

  const closeEdit = () => {
    if (saving) return;
    setEditingProfile(null);
  };

  const handleSave = async () => {
    if (!editingProfile?.id || saving) return;

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      toast({
        title: 'Informe o nome do usuário',
        description: 'O nome é obrigatório para salvar o perfil.',
        variant: 'destructive',
      });
      return;
    }

    const isSelf = editingProfile.user_id === user?.id || editingProfile.id === currentProfile?.id;

    if (isSelf && form.active === false) {
      toast({
        title: 'Você não pode desativar sua própria conta',
        description: 'Peça para outro administrador realizar essa alteração.',
        variant: 'destructive',
      });
      return;
    }

    if (isSelf && form.role !== 'admin') {
      toast({
        title: 'Você não pode remover sua própria função administrativa',
        description: 'Outro administrador deve realizar essa alteração.',
        variant: 'destructive',
      });
      return;
    }

    const activeAdmins = profiles.filter(
      (item) => item.role === 'admin' && item.active !== false,
    );

    const removesLastActiveAdmin = (
      editingProfile.role === 'admin'
      && editingProfile.active !== false
      && activeAdmins.length === 1
      && (form.role !== 'admin' || form.active === false)
    );

    if (removesLastActiveAdmin) {
      toast({
        title: 'O sistema precisa manter um administrador ativo',
        description: 'Promova outro usuário antes de remover ou desativar este administrador.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    const payload = {
      name: trimmedName,
      phone: form.phone.trim(),
      avatar_url: form.avatar_url.trim(),
      role: form.role,
      plan_id: form.plan_id || '',
      onboarding_completed: Boolean(form.onboarding_completed),
      active: Boolean(form.active),
    };

    try {
      const updated = await base44.entities.UserProfile.update(editingProfile.id, payload);

      setProfiles((current) => current.map((item) => (
        item.id === editingProfile.id
          ? { ...item, ...payload, ...(updated || {}) }
          : item
      )));

      toast({
        title: 'Usuário atualizado',
        description: 'As permissões e preferências da conta foram salvas.',
      });

      setEditingProfile(null);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast({
        title: 'Não foi possível atualizar o usuário',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData({ silent: true });
  };

  const clearFilters = () => {
    setQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setPlanFilter('all');
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

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <Users className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-bold sm:text-3xl">Usuários</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Gerencie funções, planos, acesso e situação das contas.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </header>

      {loadError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo dos usuários">
        <MetricCard
          icon={Users}
          label="Total"
          value={metrics.total}
          description="Perfis cadastrados"
          accent="bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
        />
        <MetricCard
          icon={UserCheck}
          label="Ativos"
          value={metrics.active}
          description="Contas com acesso"
          accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
        />
        <MetricCard
          icon={Crown}
          label="Administradores"
          value={metrics.admins}
          description="Acesso administrativo"
          accent="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Pendentes"
          value={metrics.pending}
          description="Onboarding incompleto"
          accent="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
        />
      </section>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Localizar usuários</CardTitle>
          <CardDescription>
            Pesquise e combine filtros para encontrar rapidamente uma conta.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_190px_200px_auto]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome, telefone, função ou plano..."
              className="pl-9"
            />
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Função" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planos</SelectItem>
              <SelectItem value="none">Sem plano</SelectItem>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </CardContent>
      </Card>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Contas encontradas</h2>
            <p className="text-xs text-muted-foreground">
              {filteredProfiles.length} de {profiles.length} usuário(s)
            </p>
          </div>

          <Alert className="max-w-xl border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20">
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Por segurança, um administrador não pode desativar ou remover a própria função.
            </AlertDescription>
          </Alert>
        </div>

        {filteredProfiles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center sm:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <UserRound className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="mt-4 font-semibold">Nenhum usuário encontrado</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Ajuste a busca ou limpe os filtros para visualizar outras contas.
              </p>
              <Button variant="outline" onClick={clearFilters} className="mt-5">
                Limpar filtros
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredProfiles.map((item) => (
              <UserCard
                key={item.id}
                profile={item}
                plan={planMap[item.plan_id]}
                isCurrentUser={item.user_id === user?.id || item.id === currentProfile?.id}
                onEdit={openEdit}
                busy={saving}
              />
            ))}
          </div>
        )}
      </section>

      <Dialog open={Boolean(editingProfile)} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Gerenciar usuário
            </DialogTitle>
            <DialogDescription>
              Atualize os dados administrativos e as permissões desta conta.
            </DialogDescription>
          </DialogHeader>

          {editingProfile && (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                <Avatar className="h-12 w-12 border">
                  <AvatarImage src={form.avatar_url || ''} alt={form.name || 'Usuário'} />
                  <AvatarFallback>{getInitials(form.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{editingProfile.name || 'Usuário'}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    ID de acesso: {editingProfile.user_id || 'não informado'}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="admin-user-name">Nome completo</Label>
                  <Input
                    id="admin-user-name"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Nome do usuário"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-user-phone">Telefone</Label>
                  <Input
                    id="admin-user-phone"
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select
                    value={form.role}
                    onValueChange={(value) => setForm((current) => ({ ...current, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Plano</Label>
                  <Select
                    value={form.plan_id || 'none'}
                    onValueChange={(value) => setForm((current) => ({
                      ...current,
                      plan_id: value === 'none' ? '' : value,
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem plano definido</SelectItem>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}{plan.active === false ? ' — inativo' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="admin-user-avatar">Link da foto</Label>
                  <Input
                    id="admin-user-avatar"
                    value={form.avatar_url}
                    onChange={(event) => setForm((current) => ({ ...current, avatar_url: event.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-xl border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Conta ativa</p>
                    <p className="text-xs text-muted-foreground">
                      Usuários inativos permanecem cadastrados, mas perdem o acesso ao aplicativo.
                    </p>
                  </div>
                  <Switch
                    checked={form.active}
                    onCheckedChange={(checked) => setForm((current) => ({ ...current, active: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 border-t pt-3">
                  <div>
                    <p className="font-medium">Onboarding concluído</p>
                    <p className="text-xs text-muted-foreground">
                      Desative para fazer o usuário passar novamente pela configuração inicial.
                    </p>
                  </div>
                  <Switch
                    checked={form.onboarding_completed}
                    onCheckedChange={(checked) => setForm((current) => ({
                      ...current,
                      onboarding_completed: checked,
                    }))}
                  />
                </div>
              </div>

              {editingProfile.user_id === user?.id && (
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Esta é sua conta</AlertTitle>
                  <AlertDescription>
                    Para evitar perda de acesso, você não pode desativar esta conta nem remover sua própria função administrativa.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeEdit} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Salvar alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}