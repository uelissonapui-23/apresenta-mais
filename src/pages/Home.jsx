import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutTemplate,
  Loader2,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Presentation as PresentationIcon,
  RefreshCw,
  Sparkles,
  Star,
  Target,
  Wand2,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Progress } from '@/components/ui/progress';
import EmptyState from '@/components/shared/EmptyState';

const RECOMMENDED_TEMPLATES_LIMIT = 6;
const RECENT_PRESENTATIONS_LIMIT = 6;
const RECENT_SESSIONS_LIMIT = 20;

const STATUS_LABELS = {
  draft: 'Rascunho',
  ready: 'Pronta',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  archived: 'Arquivada',
};

const STATUS_CLASSES = {
  draft:
    'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',

  ready:
    'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',

  in_progress:
    'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300',

  completed:
    'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',

  archived:
    'border-border bg-muted text-muted-foreground',
};

const NEED_MESSAGES = {
  organize_ideas: {
    title: 'Organize suas ideias com clareza',
    description:
      'Comece livremente e transforme pensamentos soltos em uma sequência fácil de acompanhar.',

    actionLabel: 'Criar do zero',
    actionPath: '/new-presentation',
  },

  guided_creation: {
    title: 'Vamos montar sua apresentação juntos',
    description:
      'Responda perguntas simples e receba uma estrutura adequada ao seu objetivo.',

    actionLabel: 'Criar com ajuda',
    actionPath: '/new-presentation?mode=guided',
  },

  time_control: {
    title: 'Planeje o conteúdo dentro do tempo disponível',
    description:
      'Defina a duração, distribua o tempo entre os assuntos e pratique antes de apresentar.',

    actionLabel: 'Criar apresentação',
    actionPath: '/new-presentation',
  },

  not_get_lost: {
    title: 'Apresente sem perder a sequência',
    description:
      'Prepare tópicos claros e use o modo apresentação para acompanhar o progresso visual.',

    actionLabel: 'Criar apresentação',
    actionPath: '/new-presentation?mode=guided',
  },
};

function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function clampPercentage(value) {
  return Math.min(
    100,
    Math.max(
      0,
      Math.round(toNumber(value)),
    ),
  );
}

function uniqueById(rows) {
  const map = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.id) {
      map.set(row.id, row);
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

function sortNewestFirst(rows) {
  return uniqueById(rows).sort((left, right) => {
    const timestampDifference = (
      getRecordTimestamp(right)
      - getRecordTimestamp(left)
    );

    if (timestampDifference !== 0) {
      return timestampDifference;
    }

    return String(right.id).localeCompare(String(left.id));
  });
}

function selectCurrentRecord(rows) {
  return uniqueById(rows)
    .sort((left, right) => {
      const activeDifference = (
        Number(right?.active !== false)
        - Number(left?.active !== false)
      );

      if (activeDifference !== 0) {
        return activeDifference;
      }

      return getRecordTimestamp(right) - getRecordTimestamp(left);
    })[0] || null;
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(
    0,
    Math.round(toNumber(totalSeconds)),
  );

  const hours = Math.floor(
    safeSeconds / 3600,
  );

  const minutes = Math.floor(
    (safeSeconds % 3600) / 60,
  );

  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return minutes > 0
      ? `${hours}h ${minutes}min`
      : `${hours}h`;
  }

  if (minutes > 0) {
    return seconds > 0
      ? `${minutes}min ${seconds}s`
      : `${minutes} min`;
  }

  return `${seconds}s`;
}

function parseAccessibility(value) {
  if (!value) {
    return {};
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    const parsed = JSON.parse(value);

    return (
      parsed
      && typeof parsed === 'object'
    )
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function getSessionLabel(type) {
  return type === 'presentation'
    ? 'Apresentação'
    : 'Ensaio';
}

function getSessionRoute(session) {
  if (!session?.presentation_id) {
    return '/presentations';
  }

  return session.session_type === 'presentation'
    ? `/present/${session.presentation_id}`
    : `/rehearsal/${session.presentation_id}`;
}

function getPresentationEditorRoute(presentationId) {
  return `/presentations/${presentationId}/editor`;
}

function getPresentationOverviewRoute(presentationId) {
  return `/presentations/${presentationId}/overview`;
}

function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />

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
            className={[
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
              accentClass,
            ].join(' ')}
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
    <Card className="h-full border-border/70">
      <CardContent className="h-full p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>

            <p className="mt-1 break-words text-2xl font-bold">
              {value}
            </p>

            {description && (
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
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

  const sessionStatus = (
    session.status === 'paused'
      ? 'Pausada'
      : 'Em andamento'
  );

  return (
    <Card className="overflow-hidden border-primary/25 bg-primary/5">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">
                Sessão {sessionStatus.toLowerCase()}
              </Badge>

              <Badge variant="outline">
                {getSessionLabel(session.session_type)}
              </Badge>
            </div>

            <h2 className="break-words text-xl font-bold sm:text-2xl">
              {presentation?.title || 'Apresentação em andamento'}
            </h2>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" />

                {formatDuration(session.elapsed_seconds)} decorridos
              </span>

              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />

                {toNumber(session.completed_count)} tópicos concluídos
              </span>
            </div>

            {progress > 0 && (
              <div className="mt-4 max-w-xl">
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progresso salvo</span>
                  <span>{progress}%</span>
                </div>

                <Progress value={progress} />
              </div>
            )}
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

function RecentPresentationCard({
  presentation,
  typeName,
  objectiveName,
  onFavorite,
}) {
  const progress = clampPercentage(
    presentation.progress_percentage,
  );

  const status = (
    presentation.status
    || 'draft'
  );

  return (
    <Card className="group min-w-0 border-border/70 transition-all hover:border-primary/25 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex min-w-0 items-start gap-3">
          <Link
            to={getPresentationEditorRoute(presentation.id)}
            className="min-w-0 flex-1"
          >
            <h3 className="truncate font-semibold transition-colors group-hover:text-primary">
              {presentation.title || 'Apresentação sem título'}
            </h3>

            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {presentation.main_theme
                || presentation.subtitle
                || objectiveName
                || 'Continue organizando sua apresentação.'}
            </p>
          </Link>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onFavorite(presentation)}
              aria-label={
                presentation.is_favorite
                  ? 'Remover dos favoritos'
                  : 'Adicionar aos favoritos'
              }
            >
              <Star
                className={[
                  'h-4 w-4',
                  presentation.is_favorite
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground',
                ].join(' ')}
              />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Mais ações"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={getPresentationEditorRoute(presentation.id)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to={getPresentationOverviewRoute(presentation.id)}>
                    <Target className="mr-2 h-4 w-4" />
                    Visão geral
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link to={`/rehearsal/${presentation.id}`}>
                    <Play className="mr-2 h-4 w-4" />
                    Ensaiar
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to={`/present/${presentation.id}`}>
                    <PresentationIcon className="mr-2 h-4 w-4" />
                    Apresentar
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={STATUS_CLASSES[status]}
          >
            {STATUS_LABELS[status] || status}
          </Badge>

          {typeName && (
            <Badge
              variant="secondary"
              className="text-xs"
            >
              {typeName}
            </Badge>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {toNumber(presentation.estimated_duration_minutes)} min
          </span>

          {progress > 0 && (
            <div className="flex min-w-[110px] items-center gap-2">
              <Progress
                value={progress}
                className="h-1.5 flex-1"
              />

              <span>
                {progress}%
              </span>
            </div>
          )}
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
  const [preferences, setPreferences] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadingLockRef = useRef(false);
  const favoriteLocksRef = useRef(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      if (loadingLockRef.current) {
        return;
      }

      if (!user?.id) {
        setPresentations([]);
        setTypes([]);
        setObjectives([]);
        setSessions([]);
        setTemplates([]);
        setPreferences(null);
        setLoadError('');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      loadingLockRef.current = true;

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
          preferenceRows,
        ] = await Promise.all([
          base44.entities.Presentation.filter(
            {
              user_id: user.id,
            },
            '-updated_date',
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

          base44.entities.UserPreference.filter(
            {
              user_id: user.id,
            },
            '-updated_date',
            1,
          ),
        ]);

        const normalizedPresentations = sortNewestFirst(
          presentationRows,
        ).filter(
          (presentation) => (
            presentation.user_id === user.id
          ),
        );

        const validPresentationIds = new Set(
          normalizedPresentations.map(
            (presentation) => presentation.id,
          ),
        );

        setPresentations(normalizedPresentations);

        setTypes(
          uniqueById(typeRows).filter(
            (type) => type.active !== false,
          ),
        );

        setObjectives(
          uniqueById(objectiveRows).filter(
            (objective) => objective.active !== false,
          ),
        );

        setSessions(
          sortNewestFirst(sessionRows).filter(
            (session) => (
              session.user_id === user.id
              && validPresentationIds.has(
                session.presentation_id,
              )
            ),
          ),
        );

        setTemplates(
          uniqueById(templateRows).filter(
            (template) => (
              template.active !== false
              && template.is_official === true
            ),
          ),
        );

        setPreferences(
          selectCurrentRecord(preferenceRows),
        );
      } catch (error) {
        // Ao sair da conta, as requisições que já estavam em voo podem receber
        // 401/403 depois que a sessão foi encerrada. Isso não é falha do painel.
        if (!mountedRef.current) {
          return;
        }

        const status = error?.status || error?.response?.status || error?.code;
        const authEnded = status === 401 || status === 403 || status === 'PGRST301';

        if (authEnded) {
          setLoadError('');
          return;
        }

        console.error('Erro ao carregar dashboard:', error);
        setLoadError('Não foi possível carregar seu painel agora.');
        toast({
          title: 'Falha ao carregar o painel',
          description: 'Confira sua conexão e tente novamente.',
          variant: 'destructive',
        });
      } finally {
        loadingLockRef.current = false;
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
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

  const activePresentations = useMemo(
    () => presentations.filter(
      (item) => (
        !item.is_archived
        && item.status !== 'archived'
      ),
    ),
    [presentations],
  );

  const activeSession = useMemo(
    () => sessions.find(
      (session) => {
        const presentation = presentationMap[
          session.presentation_id
        ];

        return (
          ['active', 'paused'].includes(session.status)
          && presentation
          && presentation.user_id === user?.id
          && presentation.is_archived !== true
          && presentation.status !== 'archived'
        );
      },
    ) || null,
    [
      presentationMap,
      sessions,
      user?.id,
    ],
  );

  const activeSessionPresentation = activeSession
    ? presentationMap[activeSession.presentation_id]
    : null;

  const recentPresentations = useMemo(
    () => activePresentations.slice(
      0,
      RECENT_PRESENTATIONS_LIMIT,
    ),
    [activePresentations],
  );

  const favoritePresentations = useMemo(
    () => activePresentations
      .filter((item) => item.is_favorite)
      .slice(0, 4),
    [activePresentations],
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
        total + toNumber(session.elapsed_seconds)
      ),
      0,
    ),
    [completedSessions],
  );

  const presentationSessionCount = useMemo(
    () => sessions.filter(
      (session) => (
        session.session_type === 'presentation'
      ),
    ).length,
    [sessions],
  );

  const personalization = useMemo(() => {
    const accessibility = parseAccessibility(
      preferences?.accessibility_settings_json,
    );

    return (
      NEED_MESSAGES[accessibility.primary_need]
      || NEED_MESSAGES.guided_creation
    );
  }, [preferences?.accessibility_settings_json]);

  const handleRefresh = async () => {
    if (
      refreshing
      || loadingLockRef.current
    ) {
      return;
    }

    setRefreshing(true);

    await loadDashboard({
      silent: true,
    });
  };

  const handleFavorite = async (presentation) => {
    if (
      !presentation?.id
      || !user?.id
      || presentation.user_id !== user.id
      || favoriteLocksRef.current.has(presentation.id)
    ) {
      return;
    }

    const currentPresentation = presentations.find(
      (item) => item.id === presentation.id,
    );

    if (!currentPresentation) {
      toast({
        title: 'Apresentação não encontrada',
        description:
          'Atualize o painel antes de tentar novamente.',
        variant: 'destructive',
      });
      return;
    }

    favoriteLocksRef.current.add(presentation.id);

    const nextValue = !currentPresentation.is_favorite;

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
      const updated = await base44.entities.Presentation.update(
        presentation.id,
        {
          is_favorite: nextValue,
        },
      );

      if (updated?.id) {
        setPresentations((current) => (
          current.map((item) => (
            item.id === presentation.id
              ? {
                  ...item,
                  ...updated,
                  is_favorite: nextValue,
                }
              : item
          ))
        ));
      }
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
                is_favorite:
                  currentPresentation.is_favorite,
              }
            : item
        ))
      ));

      toast({
        title: 'Não foi possível atualizar o favorito',
        description:
          'A alteração foi desfeita. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      favoriteLocksRef.current.delete(
        presentation.id,
      );
    }
  };

  if (
    userLoading
    || loading
  ) {
    return <DashboardLoading />;
  }

  if (!user?.id) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-10">
        <Card className="w-full border-dashed">
          <CardContent className="flex flex-col items-center p-8 text-center sm:p-10">
            <PresentationIcon className="h-10 w-10 text-muted-foreground" />

            <h1 className="mt-4 text-xl font-semibold">
              Entre para acessar seu painel
            </h1>

            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Suas apresentações, sessões e preferências ficam vinculadas à sua conta.
            </p>

            <Button asChild className="mt-5">
              <Link to="/login">
                Entrar
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (
    profile
    && profile.onboarding_completed !== true
  ) {
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

  const hasPresentations = (
    activePresentations.length > 0
  );

  const favoriteCount = activePresentations.filter(
    (item) => item.is_favorite,
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 overflow-x-hidden px-4 pb-10 pt-5 sm:px-6 sm:pb-12 sm:pt-7 lg:px-8 lg:pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">
            Seu espaço de criação
          </p>

          <h1 className="mt-1 break-words text-2xl font-bold sm:text-3xl">
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
          disabled={
            refreshing
            || loadingLockRef.current
          }
          className="w-full sm:w-auto"
        >
          <RefreshCw
            className={[
              'mr-2 h-4 w-4',
              refreshing ? 'animate-spin' : '',
            ].join(' ')}
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
              disabled={
                refreshing
                || loadingLockRef.current
              }
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

      {!activeSession && (
        <Card className="overflow-hidden border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm">
                <Target className="h-5 w-5 text-primary" />
              </div>

              <div className="min-w-0">
                <h2 className="font-semibold">
                  {personalization.title}
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {personalization.description}
                </p>
              </div>
            </div>

            <Button
              asChild
              className="w-full shrink-0 sm:w-auto"
            >
              <Link to={personalization.actionPath}>
                {personalization.actionLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
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
            accentClass="bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
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
        className="home-stat-grid grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          icon={PresentationIcon}
          label="Apresentações"
          value={activePresentations.length}
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
          label="Sessões recentes"
          value={sessions.length}
          description={`${presentationSessionCount} apresentações reais`}
        />

        <StatCard
          icon={Clock3}
          label="Tempo praticado"
          value={formatDuration(totalPracticeSeconds)}
          description="Nas sessões recentes concluídas"
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
              <RecentPresentationCard
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
              <RecentPresentationCard
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