import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  Heart,
  HelpCircle,
  LayoutDashboard,
  LayoutTemplate,
  Layers3,
  Lightbulb,
  Megaphone,
  MessageSquareText,
  Palette,
  Presentation,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  WandSparkles,
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
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const ADMIN_SECTIONS = [
  {
    path: '/admin/users',
    icon: Users,
    label: 'Usuários',
    description: 'Perfis, funções, acesso e situação das contas.',
    entityKey: 'users',
    accent: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  },
  {
    path: '/admin/plans',
    icon: CreditCard,
    label: 'Planos',
    description: 'Limites, preços e recursos disponíveis por plano.',
    entityKey: 'plans',
    accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  {
    path: '/admin/plan-requests',
    icon: CircleDollarSign,
    label: 'Solicitações de plano',
    description: 'Analise e aprove solicitações de plano manualmente.',
    entityKey: 'planRequests',
    accent: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
  },
  {
    path: '/admin/support-contributions',
    icon: Heart,
    label: 'Apoios',
    description: 'Confirme ou rejeite contribuições via PIX.',
    entityKey: 'contributions',
    accent: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  },
  {
    path: '/admin/ads',
    icon: Megaphone,
    label: 'Anúncios',
    description: 'Configure espaços publicitários e regras de exibição.',
    entityKey: 'ads',
    accent: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  },
  {
    path: '/admin/payment-config',
    icon: CreditCard,
    label: 'Pagamentos (PIX)',
    description: 'Configure a chave PIX para planos e apoios.',
    entityKey: 'paymentConfig',
    accent: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
  },
  {
    path: '/admin/types',
    icon: FileText,
    label: 'Tipos de apresentação',
    description: 'Pregação, aula, palestra, reunião e outros formatos.',
    entityKey: 'types',
    accent: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  },
  {
    path: '/admin/objectives',
    icon: Target,
    label: 'Objetivos',
    description: 'Ensinar, inspirar, convencer, vender e outros resultados.',
    entityKey: 'objectives',
    accent: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  },
  {
    path: '/admin/styles',
    icon: MessageSquareText,
    label: 'Estilos',
    description: 'Estilos de comunicação usados na criação guiada.',
    entityKey: 'styles',
    accent: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  },
  {
    path: '/admin/block-types',
    icon: Layers3,
    label: 'Tipos de bloco',
    description: 'Tópicos, citações, aplicações, histórias e outros blocos.',
    entityKey: 'blockTypes',
    accent: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  },
  {
    path: '/admin/templates',
    icon: LayoutTemplate,
    label: 'Modelos',
    description: 'Estruturas prontas usadas para iniciar apresentações.',
    entityKey: 'templates',
    accent: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300',
  },
  {
    path: '/admin/guided-flows',
    icon: Route,
    label: 'Fluxos guiados',
    description: 'Sequências de orientação por tipo, objetivo e estilo.',
    entityKey: 'flows',
    accent: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
  },
  {
    path: '/admin/guided-questions',
    icon: HelpCircle,
    label: 'Perguntas guiadas',
    description: 'Perguntas que ajudam o usuário a construir o conteúdo.',
    entityKey: 'questions',
    accent: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
  },
  {
    path: '/admin/themes',
    icon: Palette,
    label: 'Temas visuais',
    description: 'Cores, fontes, tamanhos e aparência da apresentação.',
    entityKey: 'themes',
    accent: 'bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300',
  },
  {
    path: '/admin/tips',
    icon: Lightbulb,
    label: 'Dicas inteligentes',
    description: 'Regras e orientações exibidas durante a construção.',
    entityKey: 'tips',
    accent: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300',
  },
];

const EMPTY_DATA = {
  users: [],
  plans: [],
  planRequests: [],
  contributions: [],
  ads: [],
  paymentConfig: [],
  types: [],
  objectives: [],
  styles: [],
  blockTypes: [],
  templates: [],
  flows: [],
  questions: [],
  themes: [],
  tips: [],
  presentations: [],
  sessions: [],
};

function normalizeRows(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueById(value) {
  const map = new Map();

  for (const item of normalizeRows(value)) {
    if (item?.id) {
      map.set(item.id, item);
    }
  }

  return [...map.values()];
}

function getRecordTimestamp(record) {
  const value = (
    record?.updated_date
    || record?.updated_at
    || record?.created_date
    || record?.created_at
    || record?.started_at
    || ''
  );

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortNewestFirst(value) {
  return uniqueById(value).sort((left, right) => {
    const timeDifference = (
      getRecordTimestamp(right)
      - getRecordTimestamp(left)
    );

    if (timeDifference !== 0) {
      return timeDifference;
    }

    return String(right.id).localeCompare(String(left.id));
  });
}

function isActive(record) {
  return record?.active !== false;
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
}

function formatMinutes(seconds) {
  const totalMinutes = Math.round((Number(seconds) || 0) / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <span className="text-sm">Carregando administração...</span>
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
            Esta área é exclusiva para administradores. Sua conta não possui permissão para alterar configurações globais do aplicativo.
          </p>

          <Button asChild className="mt-6 w-full sm:w-auto">
            <Link to="/">
              Voltar ao início
            </Link>
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
            <p className="mt-1 text-2xl font-bold sm:text-3xl">{value}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminSectionCard({ section, count, activeCount }) {
  const Icon = section.icon;

  return (
    <Link to={section.path} className="block h-full min-w-0">
      <Card className="group h-full border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
        <CardContent className="flex h-full flex-col p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${section.accent}`}>
              <Icon className="h-5 w-5" />
            </div>

            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>

          <div className="mt-4 min-w-0 flex-1">
            <h3 className="font-semibold leading-tight">{section.label}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {section.description}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{formatNumber(count)} registros</Badge>
            {typeof activeCount === 'number' && (
              <Badge variant="outline">{formatNumber(activeCount)} ativos</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function HealthRow({ label, valid, detail, path }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/60 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${valid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'}`}>
          {valid ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        </div>

        <div className="min-w-0">
          <p className="font-medium">{label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
        </div>
      </div>

      <Button asChild variant="ghost" size="sm" className="w-full shrink-0 sm:w-auto">
        <Link to={path}>Revisar</Link>
      </Button>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, profile, loading: userLoading, isAdmin } = useCurrentUser();
  const { toast } = useToast();

  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const loadingLockRef = useRef(false);

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (loadingLockRef.current) {
      return;
    }

    if (!user?.id || !isAdmin) {
      setData(EMPTY_DATA);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    loadingLockRef.current = true;

    if (!silent) {
      setLoading(true);
    }

    setError('');

    try {
      const results = await Promise.all([
        base44.entities.UserProfile.filter({}, '-created_date', 500),
        base44.entities.Plan.filter({}, 'name', 200),
        base44.entities.PlanRequest.filter({}, '-created_date', 500),
        base44.entities.SupportContribution.filter({}, '-created_date', 500),
        base44.entities.AdConfiguration.filter({}, '-updated_date', 50),
        base44.entities.PaymentConfiguration.filter({}, '-updated_date', 50),
        base44.entities.PresentationType.filter({}, 'order_index', 200),
        base44.entities.PresentationObjective.filter({}, 'order_index', 200),
        base44.entities.CommunicationStyle.filter({}, 'order_index', 200),
        base44.entities.BlockType.filter({}, 'order_index', 300),
        base44.entities.PresentationTemplate.filter({}, '-updated_date', 300),
        base44.entities.GuidedFlow.filter({}, '-updated_date', 300),
        base44.entities.GuidedQuestion.filter({}, 'order_index', 500),
        base44.entities.PresentationTheme.filter({}, 'name', 200),
        base44.entities.AppTip.filter({}, '-created_date', 300),
        base44.entities.Presentation.filter({}, '-created_date', 500),
        base44.entities.PresentationSession.filter({}, '-created_date', 500),
      ]);

      setData({
        users: sortNewestFirst(results[0]),
        plans: uniqueById(results[1]),
        planRequests: sortNewestFirst(results[2]),
        contributions: sortNewestFirst(results[3]),
        ads: sortNewestFirst(results[4]),
        paymentConfig: sortNewestFirst(results[5]),
        types: uniqueById(results[6]),
        objectives: uniqueById(results[7]),
        styles: uniqueById(results[8]),
        blockTypes: uniqueById(results[9]),
        templates: sortNewestFirst(results[10]),
        flows: sortNewestFirst(results[11]),
        questions: uniqueById(results[12]),
        themes: uniqueById(results[13]),
        tips: sortNewestFirst(results[14]),
        presentations: sortNewestFirst(results[15]),
        sessions: sortNewestFirst(results[16]),
      });

      setLastUpdated(new Date());
    } catch (loadError) {
      console.error('Erro ao carregar painel administrativo:', loadError);
      setError('Não foi possível carregar todos os dados administrativos.');

      toast({
        title: 'Falha ao carregar administração',
        description: 'Confira sua conexão e tente atualizar novamente.',
        variant: 'destructive',
      });
    } finally {
      loadingLockRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, toast, user?.id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const summary = useMemo(() => {
    const activeUsers = data.users.filter(isActive).length;

    const admins = data.users.filter(
      (item) => (
        item.role === 'admin'
        && isActive(item)
      ),
    ).length;

    const validPresentationIds = new Set(
      data.presentations.map(
        (presentation) => presentation.id,
      ),
    );

    const completedSessions = data.sessions.filter(
      (item) => (
        item.status === 'completed'
        && validPresentationIds.has(item.presentation_id)
      ),
    );

    const totalSessionSeconds = completedSessions.reduce(
      (total, item) => total + (Number(item.elapsed_seconds) || 0),
      0,
    );

    return {
      activeUsers,
      admins,
      presentations: data.presentations.length,
      completedSessions: completedSessions.length,
      totalSessionSeconds,
      officialTemplates: data.templates.filter(
        (item) => (
          item.is_official
          && isActive(item)
        ),
      ).length,
      activeFlows: data.flows.filter(isActive).length,
    };
  }, [data]);

  const sectionCounts = useMemo(() => {
    return Object.fromEntries(
      ADMIN_SECTIONS.map((section) => {
        const rows = data[section.entityKey] || [];
        return [
          section.entityKey,
          {
            total: rows.length,
            active: rows.filter(isActive).length,
          },
        ];
      }),
    );
  }, [data]);

  const healthChecks = useMemo(() => {
    const officialTemplates = data.templates.filter((item) => item.is_official && isActive(item));
    const activeTypes = data.types.filter(isActive);
    const activeObjectives = data.objectives.filter(isActive);
    const activeStyles = data.styles.filter(isActive);
    const activeBlockTypes = data.blockTypes.filter(isActive);
    const activeFlows = data.flows.filter(isActive);
    const activeQuestions = data.questions.filter(isActive);
    const activeThemes = data.themes.filter(isActive);

    return [
      {
        label: 'Estruturas fundamentais',
        valid: activeTypes.length > 0 && activeObjectives.length > 0 && activeStyles.length > 0,
        detail: `${activeTypes.length} tipos, ${activeObjectives.length} objetivos e ${activeStyles.length} estilos ativos.`,
        path: '/admin/types',
      },
      {
        label: 'Tipos de bloco',
        valid: activeBlockTypes.length >= 5,
        detail: `${activeBlockTypes.length} tipos de bloco ativos para montar o conteúdo.`,
        path: '/admin/block-types',
      },
      {
        label: 'Criação guiada',
        valid: activeFlows.length > 0 && activeQuestions.length > 0,
        detail: `${activeFlows.length} fluxos e ${activeQuestions.length} perguntas ativas.`,
        path: '/admin/guided-flows',
      },
      {
        label: 'Modelos oficiais',
        valid: officialTemplates.length > 0,
        detail: `${officialTemplates.length} modelos oficiais ativos disponíveis aos usuários.`,
        path: '/admin/templates',
      },
      {
        label: 'Temas visuais',
        valid: activeThemes.length >= 2,
        detail: `${activeThemes.length} temas ativos para edição e apresentação.`,
        path: '/admin/themes',
      },
      {
        label: 'Pagamentos e monetização',
        valid: (
          data.paymentConfig.some(isActive)
          && data.plans.some(isActive)
        ),
        detail: `${data.plans.filter(isActive).length} planos ativos e ${data.paymentConfig.filter(isActive).length} configuração PIX ativa.`,
        path: '/admin/payment-config',
      },
    ];
  }, [data]);

  const systemReadiness = useMemo(() => {
    const validCount = healthChecks.filter((item) => item.valid).length;
    return Math.round((validCount / healthChecks.length) * 100);
  }, [healthChecks]);

  const handleRefresh = async () => {
    if (
      refreshing
      || loadingLockRef.current
    ) {
      return;
    }

    setRefreshing(true);
    await loadDashboard({ silent: true });
  };

  if (userLoading || loading) {
    return <LoadingState />;
  }

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Administrador
            </Badge>

            {profile?.name && (
              <Badge variant="outline">{profile.name}</Badge>
            )}
          </div>

          <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <LayoutDashboard className="h-7 w-7 text-primary" />
            Administração
          </h1>

          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Gerencie a base global do aplicativo, acompanhe o uso e mantenha modelos, fluxos e configurações disponíveis para todos os usuários.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/">
              Abrir aplicativo
            </Link>
          </Button>

          <Button
            onClick={handleRefresh}
            disabled={
              refreshing
              || loadingLockRef.current
            }
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar dados
          </Button>
        </div>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Dados incompletos</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={
                refreshing
                || loadingLockRef.current
              }
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <section aria-label="Indicadores gerais" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Usuários ativos"
          value={formatNumber(summary.activeUsers)}
          description={`${summary.admins} administradores cadastrados`}
          accent="bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
        />

        <MetricCard
          icon={Presentation}
          label="Apresentações"
          value={formatNumber(summary.presentations)}
          description="Criadas em toda a plataforma"
          accent="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
        />

        <MetricCard
          icon={BookOpenCheck}
          label="Sessões concluídas"
          value={formatNumber(summary.completedSessions)}
          description={`${formatMinutes(summary.totalSessionSeconds)} de uso registrado`}
          accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
        />

        <MetricCard
          icon={LayoutTemplate}
          label="Modelos oficiais"
          value={formatNumber(summary.officialTemplates)}
          description={`${summary.activeFlows} fluxos guiados ativos`}
          accent="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="management-title" className="min-w-0">
          <div className="mb-4">
            <h2 id="management-title" className="text-xl font-semibold">
              Módulos administrativos
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecione um módulo para visualizar, cadastrar e editar seus registros.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {ADMIN_SECTIONS.map((section) => {
              const counts = sectionCounts[section.entityKey] || { total: 0, active: 0 };

              return (
                <AdminSectionCard
                  key={section.path}
                  section={section}
                  count={counts.total}
                  activeCount={counts.active}
                />
              );
            })}
          </div>
        </section>

        <aside className="space-y-5">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Preparação da base</CardTitle>
                  <CardDescription>
                    Verificação das configurações essenciais.
                  </CardDescription>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-sm font-bold shadow-sm">
                  {systemReadiness}%
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Progress value={systemReadiness} className="h-2" />

              <div className="mt-4">
                {healthChecks.map((item) => (
                  <HealthRow key={item.label} {...item} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                Prioridades recomendadas
              </CardTitle>
              <CardDescription>
                Ordem segura para manter a criação guiada funcionando.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3">
                <Badge className="h-6 w-6 shrink-0 justify-center rounded-full p-0">1</Badge>
                <p className="text-muted-foreground">
                  Cadastre tipos, objetivos, estilos e tipos de bloco.
                </p>
              </div>

              <div className="flex gap-3">
                <Badge className="h-6 w-6 shrink-0 justify-center rounded-full p-0">2</Badge>
                <p className="text-muted-foreground">
                  Monte fluxos e vincule suas perguntas guiadas.
                </p>
              </div>

              <div className="flex gap-3">
                <Badge className="h-6 w-6 shrink-0 justify-center rounded-full p-0">3</Badge>
                <p className="text-muted-foreground">
                  Crie modelos oficiais e temas visuais para os usuários.
                </p>
              </div>

              <div className="flex gap-3">
                <Badge className="h-6 w-6 shrink-0 justify-center rounded-full p-0">4</Badge>
                <p className="text-muted-foreground">
                  Revise planos e permissões antes de liberar recursos pagos.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Clock3 className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="min-w-0">
                  <p className="font-medium">Última atualização</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {lastUpdated
                      ? lastUpdated.toLocaleString('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : 'Ainda não atualizado'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <section aria-label="Ações administrativas rápidas">
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <WandSparkles className="h-5 w-5 text-primary" />
              </div>

              <div>
                <h2 className="font-semibold">Fortaleça a experiência guiada</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  A qualidade da criação guiada depende principalmente da organização dos fluxos, perguntas e modelos oficiais.
                </p>
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to="/admin/guided-flows">Ver fluxos</Link>
              </Button>

              <Button asChild className="w-full sm:w-auto">
                <Link to="/admin/templates">
                  Gerenciar modelos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}