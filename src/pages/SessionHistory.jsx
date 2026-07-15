import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Eye,
  FileText,
  Flag,
  History,
  ListChecks,
  Pause,
  Play,
  Presentation as PresentationIcon,
  RefreshCw,
  RotateCcw,
  SkipForward,
  TimerReset,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import EmptyState from '@/components/shared/EmptyState';

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercentage(value) {
  return Math.min(100, Math.max(0, Math.round(asNumber(value))));
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
    record?.started_at
    || record?.updated_date
    || record?.updated_at
    || record?.created_date
    || record?.created_at
    || ''
  );

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortSessionsNewestFirst(rows) {
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

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(asNumber(totalSeconds)));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((part) => String(part).padStart(2, '0'))
      .join(':');
  }

  return [minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

function formatDate(value) {
  if (!value) return 'Data não registrada';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data não registrada';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatShortDate(value) {
  if (!value) return 'Sem data';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getSessionTypeMeta(type) {
  if (type === 'presentation') {
    return {
      label: 'Apresentação',
      icon: PresentationIcon,
      badgeClass:
        'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300',
    };
  }

  return {
    label: 'Ensaio',
    icon: Play,
    badgeClass:
      'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300',
  };
}

function getSessionStatusMeta(status) {
  switch (status) {
    case 'completed':
      return {
        label: 'Concluída',
        icon: Check,
        badgeClass:
          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
      };
    case 'paused':
      return {
        label: 'Pausada',
        icon: Pause,
        badgeClass:
          'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
      };
    default:
      return {
        label: 'Em andamento',
        icon: Play,
        badgeClass:
          'border-primary/25 bg-primary/10 text-primary',
      };
  }
}

function getProgressStatusMeta(status) {
  switch (status) {
    case 'completed':
      return {
        label: 'Concluído',
        icon: Check,
        circleClass: 'bg-emerald-500 text-white',
        textClass: 'text-emerald-700 dark:text-emerald-300',
      };
    case 'current':
      return {
        label: 'Atual',
        icon: Play,
        circleClass: 'bg-blue-500 text-white',
        textClass: 'text-blue-700 dark:text-blue-300',
      };
    case 'skipped':
      return {
        label: 'Pulado',
        icon: SkipForward,
        circleClass: 'bg-slate-500 text-white',
        textClass: 'text-slate-600 dark:text-slate-300',
      };
    case 'revisit':
      return {
        label: 'Revisitar',
        icon: RotateCcw,
        circleClass: 'bg-amber-500 text-white',
        textClass: 'text-amber-700 dark:text-amber-300',
      };
    default:
      return {
        label: 'Pendente',
        icon: Flag,
        circleClass: 'bg-muted text-muted-foreground',
        textClass: 'text-muted-foreground',
      };
  }
}

function calculateSessionProgress(session, progressItems) {
  if (progressItems.length > 0) {
    const finished = progressItems.filter((item) => (
      item.status === 'completed' || item.status === 'skipped'
    )).length;

    return clampPercentage((finished / progressItems.length) * 100);
  }

  const completed = asNumber(session?.completed_count);
  const skipped = asNumber(session?.skipped_count);
  const total = completed + skipped;

  return total > 0 ? 100 : 0;
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <span className="text-sm">Carregando histórico...</span>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, description }) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 break-words text-2xl font-bold">{value}</p>
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

function ProgressRow({ item, block }) {
  const meta = getProgressStatusMeta(item.status);
  const Icon = meta.icon;

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/60 bg-background p-3">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.circleClass}`}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {block?.title || 'Tópico removido ou sem título'}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className={meta.textClass}>{meta.label}</span>
          {asNumber(item.elapsed_seconds) > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {formatTime(item.elapsed_seconds)}
            </span>
          )}
          {asNumber(item.visit_count) > 1 && (
            <span>{asNumber(item.visit_count)} visitas</span>
          )}
        </div>
        {item.note && (
          <p className="mt-2 line-clamp-2 text-xs italic text-muted-foreground">
            “{item.note}”
          </p>
        )}
      </div>
    </div>
  );
}

function SessionCard({
  session,
  isExpanded,
  details,
  loadingDetails,
  blocksById,
  onToggle,
  onContinue,
}) {
  const typeMeta = getSessionTypeMeta(session.session_type);
  const statusMeta = getSessionStatusMeta(session.status);
  const TypeIcon = typeMeta.icon;
  const StatusIcon = statusMeta.icon;

  const progress = calculateSessionProgress(session, details || []);
  const plannedSeconds = asNumber(session.planned_duration_seconds);
  const elapsedSeconds = asNumber(session.elapsed_seconds);
  const difference = plannedSeconds > 0
    ? elapsedSeconds - plannedSeconds
    : 0;

  return (
    <Card className="overflow-hidden border-border/70">
      <CardContent className="p-0">
        <button
          type="button"
          onClick={onToggle}
          className="w-full p-4 text-left transition-colors hover:bg-muted/35 sm:p-5"
          aria-expanded={isExpanded}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={typeMeta.badgeClass}>
                  <TypeIcon className="mr-1 h-3.5 w-3.5" />
                  {typeMeta.label}
                </Badge>
                <Badge variant="outline" className={statusMeta.badgeClass}>
                  <StatusIcon className="mr-1 h-3.5 w-3.5" />
                  {statusMeta.label}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {formatDate(session.started_at || session.created_date)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" />
                  {formatTime(elapsedSeconds)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  {asNumber(session.completed_count)} concluídos
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <SkipForward className="h-4 w-4" />
                  {asNumber(session.skipped_count)} pulados
                </span>
              </div>

              {plannedSeconds > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Planejado: {formatTime(plannedSeconds)} ·{' '}
                  {difference === 0
                    ? 'tempo exato'
                    : difference > 0
                      ? `${formatTime(Math.abs(difference))} acima do planejado`
                      : `${formatTime(Math.abs(difference))} abaixo do planejado`}
                </p>
              )}

              <div className="mt-4 max-w-xl">
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progresso da sessão</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {(session.status === 'active' || session.status === 'paused') && (
                <Button
                  type="button"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onContinue();
                  }}
                >
                  <Play className="mr-1.5 h-4 w-4" />
                  Continuar
                </Button>
              )}

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {isExpanded
                  ? <ChevronUp className="h-4 w-4" />
                  : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="border-t bg-muted/20 p-4 sm:p-5">
            {loadingDetails ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Carregando detalhes...
              </div>
            ) : details?.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border bg-background p-3 text-center">
                    <p className="text-xl font-bold">{details.length}</p>
                    <p className="text-xs text-muted-foreground">Tópicos</p>
                  </div>
                  <div className="rounded-xl border bg-background p-3 text-center">
                    <p className="text-xl font-bold text-emerald-600">
                      {details.filter((item) => item.status === 'completed').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Concluídos</p>
                  </div>
                  <div className="rounded-xl border bg-background p-3 text-center">
                    <p className="text-xl font-bold text-amber-600">
                      {details.filter((item) => item.status === 'revisit').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Revisitar</p>
                  </div>
                  <div className="rounded-xl border bg-background p-3 text-center">
                    <p className="text-xl font-bold">
                      {details.reduce(
                        (total, item) => total + asNumber(item.elapsed_seconds),
                        0,
                      ) > 0
                        ? formatTime(details.reduce(
                            (total, item) => total + asNumber(item.elapsed_seconds),
                            0,
                          ))
                        : '00:00'}
                    </p>
                    <p className="text-xs text-muted-foreground">Registrado</p>
                  </div>
                </div>

                {session.notes && (
                  <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <FileText className="h-4 w-4 text-primary" />
                      Observações da sessão
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {session.notes}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <ListChecks className="h-4 w-4" />
                    Caminho percorrido
                  </h3>
                  <div className="space-y-2">
                    {details.map((item) => (
                      <ProgressRow
                        key={item.id}
                        item={item}
                        block={blocksById[item.block_id]}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-background p-6 text-center">
                <Eye className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">
                  Sem detalhes de tópicos
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Esta sessão foi registrada, mas não possui progresso individual salvo.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SessionHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: userLoading } = useCurrentUser();

  const [presentation, setPresentation] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [detailsBySession, setDetailsBySession] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const detailsLockRef = useRef(new Set());

  const loadPage = useCallback(async ({ silent = false } = {}) => {
    if (!id || !user?.id) {
      if (!id) {
        setError('Identificador da apresentação não encontrado.');
      } else if (!user?.id) {
        setError('Entre na sua conta para acessar este histórico.');
      }

      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!silent) setLoading(true);
    setError('');

    try {
      const [presentationRow, sessionRows, blockRows] = await Promise.all([
        base44.entities.Presentation.get(id),
        base44.entities.PresentationSession.filter(
          {
            presentation_id: id,
            user_id: user.id,
          },
          '-started_at',
        ),
        base44.entities.PresentationBlock.filter(
          { presentation_id: id },
          'order_index',
        ),
      ]);

      if (!presentationRow || presentationRow.user_id !== user.id) {
        throw new Error('Apresentação não encontrada ou sem permissão.');
      }

      const normalizedSessions = sortSessionsNewestFirst(
        sessionRows,
      ).filter((session) => (
        session.presentation_id === id
        && session.user_id === user.id
      ));

      const normalizedBlocks = uniqueById(blockRows).filter(
        (block) => block.presentation_id === id,
      );

      setPresentation(presentationRow);
      setSessions(normalizedSessions);
      setBlocks(normalizedBlocks);
      setDetailsBySession({});
      setExpandedSessionId(null);
    } catch (loadError) {
      console.error('Erro ao carregar histórico:', loadError);
      setError(
        loadError?.message
          || 'Não foi possível carregar o histórico desta apresentação.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (!userLoading && user?.id) {
      loadPage();
    } else if (!userLoading && !user?.id) {
      setLoading(false);
      setError('Entre na sua conta para acessar este histórico.');
    }
  }, [loadPage, user?.id, userLoading]);

  const blocksById = useMemo(
    () => Object.fromEntries(blocks.map((block) => [block.id, block])),
    [blocks],
  );

  const stats = useMemo(() => {
    const completedSessions = sessions.filter(
      (session) => session.status === 'completed',
    );
    const rehearsals = sessions.filter(
      (session) => session.session_type === 'rehearsal',
    );
    const presentations = sessions.filter(
      (session) => session.session_type === 'presentation',
    );
    const totalSeconds = sessions.reduce(
      (total, session) => total + asNumber(session.elapsed_seconds),
      0,
    );

    return {
      total: sessions.length,
      completed: completedSessions.length,
      rehearsals: rehearsals.length,
      presentations: presentations.length,
      totalSeconds,
    };
  }, [sessions]);

  const handleToggleSession = async (sessionId) => {
    if (!sessionId) {
      return;
    }

    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
      return;
    }

    const session = sessions.find((item) => item.id === sessionId);

    if (
      !session
      || session.presentation_id !== id
      || session.user_id !== user?.id
    ) {
      toast({
        title: 'Sessão inválida',
        description:
          'Atualize o histórico antes de tentar abrir os detalhes novamente.',
        variant: 'destructive',
      });

      return;
    }

    setExpandedSessionId(sessionId);

    if (detailsBySession[sessionId]) {
      return;
    }

    if (detailsLockRef.current.has(sessionId)) {
      return;
    }

    detailsLockRef.current.add(sessionId);

    setLoadingDetails((current) => ({
      ...current,
      [sessionId]: true,
    }));

    try {
      const rows = await base44.entities.SessionBlockProgress.filter(
        {
          session_id: sessionId,
        },
        'order_used',
      );

      const normalizedDetails = uniqueById(rows)
        .filter((item) => item.session_id === sessionId)
        .sort((left, right) => (
          asNumber(left.order_used)
          - asNumber(right.order_used)
          || String(left.id).localeCompare(String(right.id))
        ));

      setDetailsBySession((current) => ({
        ...current,
        [sessionId]: normalizedDetails,
      }));
    } catch (detailsError) {
      console.error(
        'Erro ao carregar detalhes da sessão:',
        detailsError,
      );

      toast({
        title: 'Não foi possível abrir os detalhes',
        description:
          'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });

      setExpandedSessionId(null);
    } finally {
      detailsLockRef.current.delete(sessionId);

      setLoadingDetails((current) => ({
        ...current,
        [sessionId]: false,
      }));
    }
  };

  const handleContinue = (session) => {
    if (
      !session?.id
      || session.presentation_id !== id
      || session.user_id !== user?.id
      || !['in_progress', 'paused'].includes(session.status)
    ) {
      toast({
        title: 'Esta sessão não pode ser continuada',
        description:
          'Inicie uma nova sessão ou atualize o histórico.',
        variant: 'destructive',
      });
      return;
    }

    const route = session.session_type === 'presentation'
      ? `/present/${id}`
      : `/rehearsal/${id}`;

    navigate(route);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPage({ silent: true });
  };

  if (userLoading || loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-xl items-center px-4 py-10">
        <Card className="w-full border-destructive/30">
          <CardContent className="p-6 text-center sm:p-8">
            <AlertCircle className="mx-auto h-11 w-11 text-destructive" />
            <h1 className="mt-4 text-xl font-bold">
              Não foi possível abrir o histórico
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={() => loadPage()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => navigate(`/presentations/${id}/editor`)}
            aria-label="Voltar ao editor"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">
              Histórico de sessões
            </p>
            <h1 className="mt-1 truncate text-2xl font-bold sm:text-3xl">
              {presentation?.title || 'Apresentação'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Compare ensaios, apresentações e o tempo usado em cada tópico.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            disabled={
              refreshing
              || Object.values(loadingDetails).some(Boolean)
            }
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>

          <Button asChild>
            <Link to={`/rehearsal/${id}`}>
              <Play className="mr-2 h-4 w-4" />
              Novo ensaio
            </Link>
          </Button>
        </div>
      </header>

      <section
        aria-label="Resumo do histórico"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          icon={History}
          label="Sessões"
          value={stats.total}
          description={`${stats.completed} concluídas`}
        />
        <StatCard
          icon={Play}
          label="Ensaios"
          value={stats.rehearsals}
          description="Sessões de preparação"
        />
        <StatCard
          icon={PresentationIcon}
          label="Apresentações"
          value={stats.presentations}
          description="Sessões realizadas"
        />
        <StatCard
          icon={Clock3}
          label="Tempo total"
          value={formatTime(stats.totalSeconds)}
          description="Somando todas as sessões"
        />
      </section>

      {sessions.length > 0 && (
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" />
              Resumo da evolução
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sessões concluídas</span>
                  <span className="font-medium">
                    {stats.completed}/{stats.total}
                  </span>
                </div>
                <Progress
                  className="mt-2"
                  value={stats.total > 0
                    ? (stats.completed / stats.total) * 100
                    : 0}
                />
              </div>

              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Primeira sessão
                </p>
                <p className="mt-1 font-medium">
                  {formatShortDate(
                    sessions[sessions.length - 1]?.started_at
                    || sessions[sessions.length - 1]?.created_date,
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Sessão mais recente
                </p>
                <p className="mt-1 font-medium">
                  {formatShortDate(
                    sessions[0]?.started_at || sessions[0]?.created_date,
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="sessions-title">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="sessions-title" className="text-lg font-semibold">
              Todas as sessões
            </h2>
            <p className="text-xs text-muted-foreground">
              Toque em uma sessão para ver o caminho percorrido tópico por tópico.
            </p>
          </div>

          <Button asChild variant="outline" size="sm">
            <Link to={`/present/${id}`}>
              <PresentationIcon className="mr-2 h-4 w-4" />
              Apresentar agora
            </Link>
          </Button>
        </div>

        {sessions.length === 0 ? (
          <Card className="border-dashed">
            <EmptyState
              icon={TimerReset}
              title="Nenhuma sessão registrada"
              description="Quando você ensaiar ou apresentar, o tempo, o progresso e os tópicos percorridos aparecerão aqui."
              actionLabel="Iniciar primeiro ensaio"
              onAction={() => navigate(`/rehearsal/${id}`)}
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isExpanded={expandedSessionId === session.id}
                details={detailsBySession[session.id] || []}
                loadingDetails={loadingDetails[session.id] === true}
                blocksById={blocksById}
                onToggle={() => handleToggleSession(session.id)}
                onContinue={() => handleContinue(session)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}