import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Camera,
  Check,
  Clock3,
  Crown,
  FileText,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

const EMPTY_FORM = {
  name: '',
  phone: '',
  avatar_url: '',
};

function getInitials(name, email) {
  const source = String(name || email || 'U').trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function formatCurrency(value) {
  const number = Number(value) || 0;

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(number);
}

function formatBillingPeriod(period) {
  const labels = {
    monthly: 'mensal',
    yearly: 'anual',
    lifetime: 'vitalício',
    free: 'gratuito',
  };

  return labels[period] || period || 'gratuito';
}

function formatLimit(value, suffix = '') {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 'Ilimitado';
  }

  return `${number}${suffix}`;
}

function StatCard({ icon: Icon, label, value, description }) {
  return (
    <Card className="border-border/70">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 break-words text-2xl font-bold">{value}</p>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-5 w-5 text-foreground/75" />
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <span className="text-sm">Carregando seu perfil...</span>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, profile, loading: userLoading, isAdmin } = useCurrentUser();
  const { toast } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [originalForm, setOriginalForm] = useState(EMPTY_FORM);
  const [plan, setPlan] = useState(null);
  const [stats, setStats] = useState({
    presentations: 0,
    sessions: 0,
    completedSessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loadError, setLoadError] = useState('');

  const displayEmail = user?.email || '';
  const initials = useMemo(
    () => getInitials(form.name, displayEmail),
    [form.name, displayEmail],
  );

  const hasChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(originalForm),
    [form, originalForm],
  );

  const loadProfileData = async ({ silent = false } = {}) => {
    if (!user?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    setLoadError('');

    try {
      const currentForm = {
        name: profile?.name || user?.full_name || user?.name || '',
        phone: profile?.phone || '',
        avatar_url: profile?.avatar_url || '',
      };

      setForm(currentForm);
      setOriginalForm(currentForm);

      const requests = [
        base44.entities.Presentation.filter({ user_id: user.id }),
        base44.entities.PresentationSession.filter({ user_id: user.id }),
      ];

      if (profile?.plan_id) {
        requests.push(base44.entities.Plan.filter({ id: profile.plan_id }));
      }

      const results = await Promise.all(requests);
      const presentationRows = Array.isArray(results[0]) ? results[0] : [];
      const sessionRows = Array.isArray(results[1]) ? results[1] : [];
      const planRows = profile?.plan_id && Array.isArray(results[2]) ? results[2] : [];

      setStats({
        presentations: presentationRows.filter((item) => !item.is_archived).length,
        sessions: sessionRows.length,
        completedSessions: sessionRows.filter((item) => item.status === 'completed').length,
      });

      setPlan(planRows[0] || null);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      setLoadError('Não foi possível carregar todas as informações do perfil.');

      toast({
        title: 'Falha ao carregar perfil',
        description: 'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.id]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const name = form.name.trim();
    const phone = form.phone.trim();
    const avatarUrl = form.avatar_url.trim();

    if (!name) {
      toast({
        title: 'Informe seu nome',
        description: 'O nome é obrigatório para salvar o perfil.',
        variant: 'destructive',
      });
      return null;
    }

    if (name.length < 2) {
      toast({
        title: 'Nome muito curto',
        description: 'Digite pelo menos dois caracteres.',
        variant: 'destructive',
      });
      return null;
    }

    if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
      toast({
        title: 'Link da foto inválido',
        description: 'Use um endereço iniciado por http:// ou https://.',
        variant: 'destructive',
      });
      return null;
    }

    return {
      name,
      phone,
      avatar_url: avatarUrl,
    };
  };

  const handleSave = async () => {
    if (!user?.id || saving) return;

    const payload = validateForm();
    if (!payload) return;

    setSaving(true);

    try {
      if (profile?.id) {
        await base44.entities.UserProfile.update(profile.id, payload);
      } else {
        await base44.entities.UserProfile.create({
          user_id: user.id,
          ...payload,
          role: 'user',
          onboarding_completed: true,
          active: true,
        });
      }

      setForm(payload);
      setOriginalForm(payload);

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);

      toast({
        title: 'Não foi possível salvar',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(originalForm);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfileData({ silent: true });
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await base44.auth.logout('/');
    } catch (error) {
      console.error('Erro ao sair da conta:', error);
      setLoggingOut(false);

      toast({
        title: 'Não foi possível sair',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  if (userLoading || loading) {
    return <ProfileLoading />;
  }

  const roleLabel = isAdmin ? 'Administrador' : 'Usuário';
  const planName = plan?.name || 'Plano gratuito';

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">Sua conta</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Perfil</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Atualize seus dados e acompanhe as informações da sua conta.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </header>

      {loadError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumo da conta">
        <StatCard
          icon={FileText}
          label="Apresentações"
          value={stats.presentations}
          description="Ativas e não arquivadas"
        />
        <StatCard
          icon={Clock3}
          label="Sessões"
          value={stats.sessions}
          description={`${stats.completedSessions} concluídas`}
        />
        <StatCard
          icon={Crown}
          label="Plano"
          value={planName}
          description={formatBillingPeriod(plan?.billing_period)}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserRound className="h-5 w-5 text-primary" />
              Informações pessoais
            </CardTitle>
            <CardDescription>
              Esses dados identificam você dentro do aplicativo.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border bg-muted/30 p-4 sm:flex-row sm:items-center">
              <Avatar className="h-20 w-20 border-4 border-background shadow-sm">
                <AvatarImage src={form.avatar_url} alt={form.name || 'Foto do perfil'} />
                <AvatarFallback className="text-xl font-semibold">{initials}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold">
                  {form.name || 'Seu nome'}
                </p>
                <p className="truncate text-sm text-muted-foreground">{displayEmail}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                    {roleLabel}
                  </Badge>
                  <Badge variant="outline">
                    <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                    Conta ativa
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="profile-email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="profile-email" value={displayEmail} disabled className="pl-9" />
                </div>
                <p className="text-xs text-muted-foreground">
                  O e-mail é controlado pela autenticação da conta.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-name">Nome completo *</Label>
                <Input
                  id="profile-name"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Digite seu nome"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-phone">Telefone</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="profile-phone"
                    value={form.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                    placeholder="(00) 00000-0000"
                    className="pl-9"
                    maxLength={30}
                    inputMode="tel"
                  />
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="profile-avatar">Link da foto de perfil</Label>
                <div className="relative">
                  <Camera className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="profile-avatar"
                    value={form.avatar_url}
                    onChange={(event) => updateField('avatar_url', event.target.value)}
                    placeholder="https://exemplo.com/minha-foto.jpg"
                    className="min-h-20 resize-none pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use um link público iniciado por https://. Futuramente o upload poderá ser feito diretamente pelo aplicativo.
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={!hasChanges || saving}
                className="w-full sm:w-auto"
              >
                Descartar alterações
              </Button>

              <Button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="w-full sm:w-auto"
              >
                {saving ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {saving ? 'Salvando...' : 'Salvar perfil'}
              </Button>
            </div>

            {hasChanges && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Você possui alterações que ainda não foram salvas.</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="h-5 w-5 text-primary" />
                Plano atual
              </CardTitle>
              <CardDescription>
                Recursos disponíveis para sua conta.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">{planName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plan?.description || 'Plano inicial para criar e organizar suas apresentações.'}
                    </p>
                  </div>
                  <Badge>{formatBillingPeriod(plan?.billing_period)}</Badge>
                </div>

                {plan && (
                  <p className="mt-4 text-2xl font-bold">
                    {formatCurrency(plan.price)}
                  </p>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Apresentações</span>
                  <span className="font-medium">{formatLimit(plan?.max_presentations)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Armazenamento</span>
                  <span className="font-medium">{formatLimit(plan?.max_storage, ' MB')}</span>
                </div>
                <Separator />
                {[
                  ['Exportação em PDF', plan?.can_export_pdf],
                  ['Assistente de IA', plan?.can_use_ai],
                  ['Modelos premium', plan?.can_use_premium_templates],
                  ['Sincronização entre dispositivos', plan?.can_sync_devices],
                ].map(([label, enabled]) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full ${enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                      {enabled ? <Check className="h-3.5 w-3.5" /> : <span className="text-xs">–</span>}
                    </div>
                    <span className={enabled ? '' : 'text-muted-foreground'}>{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LogOut className="h-5 w-5 text-destructive" />
                Acesso à conta
              </CardTitle>
              <CardDescription>
                Encerre sua sessão neste dispositivo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                {loggingOut ? 'Saindo...' : 'Sair da conta'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}