import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Clock3,
  FileText,
  LayoutTemplate,
  Play,
  Plus,
  Presentation as PresentationIcon,
  RefreshCw,
  Sparkles,
  Star,
  Wand2,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import PresentationCard from '@/components/shared/PresentationCard';
import EmptyState from '@/components/shared/EmptyState';

const RECENT_PRESENTATIONS_LIMIT = 8;
const RECENT_SESSIONS_LIMIT = 8;
const RECOMMENDED_TEMPLATES_LIMIT = 6;

function clampPercentage(value) {
  const number = Number(value) || 0;
  return Math.min(100, Math.max(0, Math.round(number)));
}

function formatDuration(seconds) {
  const totalSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  if (minutes < 1) {
    return `${remainingSeconds}s`;
  }

  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes}min ${remainingSeconds}s`;
}

function getSessionLabel(type) {
  return type === 'presentation' ? 'Apresentação' : 'Ensaio';
}

function getSessionRoute(session) {
  if (!session?.presentation_id) {
    return '/presentations';
  }

  return session.session_type === 'presentation'
    ? `/present/${session.presentation_id}`
    : `/rehearsal/${session.presentation_id}`;
}

function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-muted border-t-primary" />

        <span className="text-sm">
          Preparando seu painel...
        </span>
      </div>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  description,
  accentClass = 'bg-primary/10 text-primary',
}) {
  return (
    <Link
      to={to}
      className="block h-full min-w-0"
    >
      <Card className="h-full border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
        <CardContent className="flex h-full items-center gap-3 p-4 sm:p-5">
          <div
            className={`
              flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl
              ${accentClass}
            `}
          >
            <Icon className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">
              {title}
            </p>

            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {description}
            </p>
          </div>

          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>

            <p className="mt-1 break-words text-2xl font-bold">
              {value}
            </p>

            {description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-5 w-5 text-foreground/75" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContinueSessionCard({
  session,
  presentation,
}) {
  const route = getSessionRoute(session);
  const progress = clampPercentage(
    presentation?.progress_percentage,
  );

  return (
    <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/10 via-background to-background">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">
                Sessão em andamento
              </Badge>

              <Badge variant="outline">
                {getSessionLabel(session.session_type)}
              </Badge>
            </div>

            <h2 className="truncate text-xl font-bold sm:text-2xl">
              {presentation?.title || 'Apresentação em andamento'}
            </h2>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" />

                {formatDuration(session.elapsed_seconds)} decorridos
              </span>

              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-4 w-4" />

                {Number(session.completed_count) || 0} tópicos concluídos
              </span>
            </div>

            <div className="mt-4 max-w-xl">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>Progresso salvo</span>
                <span>{progress}%</span>
              </div>

              <Progress value={progress} />
            </div>
          </div>

          <Button
            asChild
            size="lg"
            className="w-full shrink-0 md:w-auto"
          >
            <Link to={route}>
              <Play className="mr-2 h-5 w-5 fill-current" />
              Continuar
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplatePreviewCard({
  template,
  typeName,
}) {
  return (
    <Link
      to="/templates"
      className="block h-full min-w-0"
    >
      <Card className="h-full border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
        <CardContent className="p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <LayoutTemplate className="h-5 w-5 text-primary" />
            </div>

            {template.is_premium && (
              <Badge variant="secondary">
                Premium
              </Badge>
            )}
          </div>

          <h3 className="line-clamp-1 font-semibold">
            {template.name}
          </h3>

          {typeName && (
            <p className="mt-1 text-xs font-medium text-primary">
              {typeName}
            </p>
          )}

          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {template.description
              || 'Modelo pronto para você adaptar ao seu conteúdo.'}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    user,
    profile,
    loading: userLoading,
  } = useCurrentUser();

  const [presentations, setPresentations] = useState([]);
  const [types, setTypes] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
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
        const [
          presentationRows,
          typeRows,
          objectiveRows,
          sessionRows,
          templateRows,
        ] = await Promise.all([
          base44.entities.Presentation.filter(
            {
              user_id: user.id,
              is_archived: false,
            },
            '-updated_date',
            RECENT_PRESENTATIONS_LIMIT,
          ),

          base44.entities.PresentationType.filter(
            {
              active: true,
            },
            'order_index',
          ),

          base44.entities.PresentationObjective.filter(
            {
              active: true,
            },
            'order_index',
          ),

          base44.entities.PresentationSession.filter(
            {
              user_id: user.id,
            },
            '-created_date',
            RECENT_SESSIONS_LIMIT,
          ),

          base44.entities.PresentationTemplate.filter(
            {
              is_official: true,
              active: true,
            },
            'name',
            RECOMMENDED_TEMPLATES_LIMIT,
          ),
        ]);

        setPresentations(
          Array.isArray(presentationRows)
            ? presentationRows
            : [],
        );

        setTypes(
          Array.isArray(typeRows)
            ? typeRows
            : [],
        );

        setObjectives(
          Array.isArray(objectiveRows)
            ? objectiveRows
            : [],
        );

        setSessions(
          Array.isArray(sessionRows)
            ? sessionRows
            : [],
        );

        setTemplates(
          Array.isArray(templateRows)
            ? templateRows
            : [],
        );
      } catch (error) {
        console.error(
          'Erro ao carregar dashboard:',
          error,
        );

        setLoadError(
          'Não foi possível carregar seu painel agora.',
        );

        toast({
          title: 'Falha ao carregar o painel',
          description: 'Confira sua conexão e tente novamente.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      toast,
      user?.id,
    ],
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const typeMap = useMemo(
    () => Object.fromEntries(
      types.map((item) => [
        item.id,
        item.name,
      ]),
    ),
    [types],
  );

  const objectiveMap = useMemo(
    () => Object.fromEntries(
      objectives.map((item) => [
        item.id,
        item.name,
      ]),
    ),
    [objectives],
  );

  const presentationMap = useMemo(
    () => Object.fromEntries(
      presentations.map((item) => [
        item.id,
        item,
      ]),
    ),
    [presentations],
  );

  const activeSession = useMemo(
    () => sessions.find(
      (session) => (
        session.status === 'active'
        || session.status === 'paused'
      ),
    ),
    [sessions],
  );

  const activeSessionPresentation = activeSession
    ? presentationMap[activeSession.presentation_id]
    : null;

  const recentPresentations = useMemo(
    () => presentations.slice(0, 5),
    [presentations],
  );

  const favoritePresentations = useMemo(
    () => presentations
      .filter((item) => item.is_favorite)
      .slice(0, 4),
    [presentations],
  );

  const completedSessions = useMemo(
    () => sessions.filter(
      (session) => session.status === 'completed',
    ),
    [sessions],
  );

  const totalPracticeSeconds = useMemo(
    () => completedSessions.reduce(
      (total, session) => (
        total + (Number(session.elapsed_seconds) || 0)
      ),
      0,
    ),
    [completedSessions],
  );

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadDashboard({
      silent: true,
    });
  };

  const handleFavorite = async (presentation) => {
    if (!presentation?.id) {
      return;
    }

    const nextValue = !presentation.is_favorite;

    setPresentations((current) => (
      current.map((item) => (
        item.id === presentation.id
          ? {
              ...item,
              is_favorite: nextValue,
            }
          : item
      ))
    ));

    try {
      await base44.entities.Presentation.update(
        presentation.id,
        {
          is_favorite: nextValue,
        },
      );
    } catch (error) {
      console.error(
        'Erro ao atualizar favorito:',
        error,
      );

      setPresentations((current) => (
        current.map((item) => (
          item.id === presentation.id
            ? {
                ...item,
                is_favorite: !nextValue,
              }
            : item
        ))
      ));

      toast({
        title: 'Não foi possível atualizar o favorito',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    }
  };

  if (userLoading || loading) {
    return <DashboardLoading />;
  }

  if (profile && !profile.onboarding_completed) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-10">
        <Card className="w-full overflow-hidden border-primary/20">
          <CardContent className="p-6 text-center sm:p-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>

            <h1 className="text-2xl font-bold sm:text-3xl">
              Bem-vindo ao Apresenta+
            </h1>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              Configure suas preferências e monte sua primeira
              apresentação com um passo a passo simples.
            </p>

            <Button
              asChild
              size="lg"
              className="mt-7 w-full sm:w-auto"
            >
              <Link to="/onboarding">
                Começar configuração

                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = (
    profile?.name
    || user?.full_name
    || user?.name
    || 'Apresentador'
  );

  const hasPresentations = presentations.length > 0;

  const favoriteCount = presentations.filter(
    (item) => item.is_favorite,
  ).length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">
            Seu espaço de criação
          </p>

          <h1 className="mt-1 truncate text-2xl font-bold sm:text-3xl">
            Olá, {displayName}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Organize suas ideias, ensaie com segurança e
            apresente sem se perder.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full sm:w-auto"
        >
          <RefreshCw
            className={`
              mr-2 h-4 w-4
              ${refreshing ? 'animate-spin' : ''}
            `}
          />

          Atualizar
        </Button>
      </header>

      {loadError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">
              {loadError}
            </p>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {activeSession && (
        <ContinueSessionCard
          session={activeSession}
          presentation={activeSessionPresentation}
        />
      )}

      <section aria-labelledby="quick-actions-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2
            id="quick-actions-title"
            className="text-lg font-semibold"
          >
            Começar
          </h2>

          <Link
            to="/presentations"
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver apresentações
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <QuickAction
            to="/new-presentation"
            icon={Plus}
            title="Criar do zero"
            description="Comece com uma estrutura livre e organize os tópicos do seu jeito."
          />

          <QuickAction
            to="/new-presentation?mode=guided"
            icon={Wand2}
            title="Criar com ajuda"
            description="Responda perguntas e receba uma estrutura guiada para seu objetivo."
            accentClass="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
          />

          <QuickAction
            to="/templates"
            icon={LayoutTemplate}
            title="Usar um modelo"
            description="Parta de uma estrutura pronta para pregação, aula, palestra ou reunião."
            accentClass="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
          />
        </div>
      </section>

      <section
        aria-label="Resumo do usuário"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          icon={PresentationIcon}
          label="Apresentações"
          value={presentations.length}
          description="Ativas e não arquivadas"
        />

        <StatCard
          icon={Star}
          label="Favoritas"
          value={favoriteCount}
          description="Acesso rápido"
        />

        <StatCard
          icon={Play}
          label="Sessões"
          value={sessions.length}
          description="Ensaios e apresentações"
        />

        <StatCard
          icon={Clock3}
          label="Tempo praticado"
          value={formatDuration(totalPracticeSeconds)}
          description="Nas sessões recentes"
        />
      </section>

      {!hasPresentations ? (
        <Card className="border-dashed">
          <EmptyState
            icon={PresentationIcon}
            title="Sua primeira apresentação começa aqui"
            description="Você pode criar livremente, seguir um guia passo a passo ou partir de um modelo pronto."
            actionLabel="Criar apresentação"
            onAction={() => navigate('/new-presentation')}
          />
        </Card>
      ) : (
        <section aria-labelledby="recent-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2
                id="recent-title"
                className="text-lg font-semibold"
              >
                Apresentações recentes
              </h2>

              <p className="text-xs text-muted-foreground">
                Continue exatamente de onde parou.
              </p>
            </div>

            <Button
              asChild
              variant="ghost"
              size="sm"
            >
              <Link to="/presentations">
                Ver todas

                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {recentPresentations.map((presentation) => (
              <PresentationCard
                key={presentation.id}
                presentation={presentation}
                typeName={
                  typeMap[presentation.presentation_type_id]
                }
                objectiveName={
                  objectiveMap[presentation.objective_id]
                }
                onFavorite={handleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      {favoritePresentations.length > 0 && (
        <section aria-labelledby="favorites-title">
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />

            <h2
              id="favorites-title"
              className="text-lg font-semibold"
            >
              Favoritas
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {favoritePresentations.map((presentation) => (
              <PresentationCard
                key={presentation.id}
                presentation={presentation}
                typeName={
                  typeMap[presentation.presentation_type_id]
                }
                objectiveName={
                  objectiveMap[presentation.objective_id]
                }
                onFavorite={handleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      {templates.length > 0 && (
        <section aria-labelledby="templates-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2
                id="templates-title"
                className="text-lg font-semibold"
              >
                Modelos recomendados
              </h2>

              <p className="text-xs text-muted-foreground">
                Estruturas prontas para acelerar sua criação.
              </p>
            </div>

            <Button
              asChild
              variant="ghost"
              size="sm"
            >
              <Link to="/templates">
                Explorar

                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <TemplatePreviewCard
                key={template.id}
                template={template}
                typeName={
                  typeMap[template.presentation_type_id]
                }
              />
            ))}
          </div>
        </section>
      )}

      <section
        aria-label="Ajuda para criar"
        className="pb-3"
      >
        <Card className="overflow-hidden bg-muted/40">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>

              <div>
                <h2 className="font-semibold">
                  Não sabe como começar?
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Use a criação guiada. O aplicativo ajuda a
                  definir objetivo, público, sequência e conclusão.
                </p>
              </div>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-full shrink-0 sm:w-auto"
            >
              <Link to="/new-presentation?mode=guided">
                <Wand2 className="mr-2 h-4 w-4" />
                Criar com guia
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}