import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  CheckCircle2,
  Clock3,
  Copy,
  Edit3,
  FileText,
  Filter,
  History,
  LayoutGrid,
  List,
  MoreVertical,
  Play,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  Tag as TagIcon,
  Trash2,
  X,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';

const PAGE_LIMIT = 200;

const TAG_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
];
const DEFAULT_TAG_COLOR = '#3B82F6';

function TagBadge({ tag }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{
        backgroundColor: `${tag.color || DEFAULT_TAG_COLOR}20`,
        color: tag.color || DEFAULT_TAG_COLOR,
      }}
      title={tag.name}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: tag.color || DEFAULT_TAG_COLOR }} />
      <span className="truncate">{tag.name}</span>
    </span>
  );
}

function PresentationTags({ tags = [] }) {
  if (!tags.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {tags.slice(0, 4).map((tag) => <TagBadge key={tag.id} tag={tag} />)}
      {tags.length > 4 && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">+{tags.length - 4}</Badge>}
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'draft', label: 'Rascunhos' },
  { value: 'ready', label: 'Prontas' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluídas' },
  { value: 'favorites', label: 'Favoritas' },
  { value: 'archived', label: 'Arquivadas' },
];

const STATUS_META = {
  draft: {
    label: 'Rascunho',
    className: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
  },
  ready: {
    label: 'Pronta',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  in_progress: {
    label: 'Em andamento',
    className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300',
  },
  completed: {
    label: 'Concluída',
    className: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300',
  },
  archived: {
    label: 'Arquivada',
    className: 'border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400',
  },
};

const SORT_OPTIONS = [
  { value: 'updated_desc', label: 'Alteradas recentemente' },
  { value: 'created_desc', label: 'Criadas recentemente' },
  { value: 'title_asc', label: 'Título de A a Z' },
  { value: 'title_desc', label: 'Título de Z a A' },
  { value: 'duration_asc', label: 'Menor duração' },
  { value: 'duration_desc', label: 'Maior duração' },
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function uniqueById(rows) {
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  return [...map.values()];
}

function clampPercentage(value) {
  const number = Number(value) || 0;
  return Math.min(100, Math.max(0, Math.round(number)));
}

function formatDate(value) {
  if (!value) return 'Sem data';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getTimestamp(item, field) {
  const value = item?.[field];
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.draft;
}

function removeSystemFields(record) {
  if (!record || typeof record !== 'object') return {};

  const {
    id,
    created_date,
    updated_date,
    created_by,
    created_by_id,
    created_by_email,
    ...clean
  } = record;

  return clean;
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <span className="text-sm">Carregando suas apresentações...</span>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, description }) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-5 w-5 text-foreground/75" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PresentationListCard({
  presentation,
  typeName,
  objectiveName,
  presentationTags,
  activeSession,
  busyAction,
  onFavorite,
  onRename,
  onDuplicate,
  onArchive,
  onDelete,
  onManageTags,
}) {
  const status = getStatusMeta(presentation.status);
  const progress = clampPercentage(presentation.progress_percentage);
  const isBusy = busyAction?.presentationId === presentation.id;
  const isArchived = Boolean(presentation.is_archived) || presentation.status === 'archived';

  return (
    <Card className="group overflow-hidden border-border/70 transition-all hover:border-primary/25 hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-start gap-2">
                  <Link
                    to={`/presentations/${presentation.id}/editor`}
                    className="min-w-0 flex-1"
                  >
                    <h2 className="truncate font-semibold text-foreground transition-colors hover:text-primary sm:text-lg">
                      {presentation.title || 'Apresentação sem título'}
                    </h2>
                  </Link>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={isBusy}
                    onClick={() => onFavorite(presentation)}
                    aria-label={presentation.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        presentation.is_favorite
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </Button>
                </div>

                {presentation.subtitle && (
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {presentation.subtitle}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>

                  {typeName && (
                    <Badge variant="secondary" className="font-normal">
                      {typeName}
                    </Badge>
                  )}

                  {activeSession && (
                    <Badge className="bg-blue-600 text-white hover:bg-blue-600">
                      Sessão em andamento
                    </Badge>
                  )}
                </div>

                {objectiveName && (
                  <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                    Objetivo: {objectiveName}
                  </p>
                )}
                <PresentationTags tags={presentationTags} />
              </div>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-3 lg:w-[390px] lg:shrink-0">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {Number(presentation.estimated_duration_minutes) || 0} min
              </p>
              <p className="mt-1">Duração prevista</p>
            </div>

            <div className="rounded-xl bg-muted/50 p-3">
              <p className="font-medium text-foreground">
                {formatDate(presentation.updated_date || presentation.last_opened_at)}
              </p>
              <p className="mt-1">Última alteração</p>
            </div>

            <div className="col-span-2 rounded-xl bg-muted/50 p-3 sm:col-span-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">Progresso</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="mt-2 h-1.5" />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            {activeSession ? (
              <Button asChild size="sm" className="flex-1 sm:flex-none">
                <Link
                  to={
                    activeSession.session_type === 'presentation'
                      ? `/present/${presentation.id}`
                      : `/rehearsal/${presentation.id}`
                  }
                >
                  <Play className="mr-2 h-4 w-4 fill-current" />
                  Continuar
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="flex-1 sm:flex-none">
                <Link to={`/presentations/${presentation.id}/editor`}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  disabled={isBusy}
                >
                  {isBusy ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreVertical className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link to={`/presentations/${presentation.id}/overview`}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Visão geral
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to={`/rehearsal/${presentation.id}`}>
                    <Play className="mr-2 h-4 w-4" />
                    Ensaiar
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to={`/present/${presentation.id}`}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Apresentar
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to={`/session-history/${presentation.id}`}>
                    <History className="mr-2 h-4 w-4" />
                    Histórico
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => onManageTags(presentation)}>
                  <TagIcon className="mr-2 h-4 w-4" />
                  Gerenciar etiquetas
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => onRename(presentation)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Renomear
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => onDuplicate(presentation)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicar com conteúdo
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => onArchive(presentation)}>
                  {isArchived ? (
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                  ) : (
                    <Archive className="mr-2 h-4 w-4" />
                  )}
                  {isArchived ? 'Restaurar' : 'Arquivar'}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(presentation)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir definitivamente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PresentationGridCard({
  presentation,
  typeName,
  objectiveName,
  presentationTags,
  activeSession,
  busyAction,
  onFavorite,
  onRename,
  onDuplicate,
  onArchive,
  onDelete,
  onManageTags,
}) {
  const status = getStatusMeta(presentation.status);
  const progress = clampPercentage(presentation.progress_percentage);
  const isBusy = busyAction?.presentationId === presentation.id;
  const isArchived = Boolean(presentation.is_archived) || presentation.status === 'archived';

  return (
    <Card className="group flex h-full flex-col overflow-hidden border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isBusy}
              onClick={() => onFavorite(presentation)}
            >
              <Star
                className={`h-4 w-4 ${
                  presentation.is_favorite
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground'
                }`}
              />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isBusy}
                >
                  {isBusy ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreVertical className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link to={`/presentations/${presentation.id}/editor`}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/presentations/${presentation.id}/overview`}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Visão geral
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/rehearsal/${presentation.id}`}>
                    <Play className="mr-2 h-4 w-4" />
                    Ensaiar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/present/${presentation.id}`}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Apresentar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/session-history/${presentation.id}`}>
                    <History className="mr-2 h-4 w-4" />
                    Histórico
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onManageTags(presentation)}>
                  <TagIcon className="mr-2 h-4 w-4" />
                  Gerenciar etiquetas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onRename(presentation)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Renomear
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(presentation)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicar com conteúdo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onArchive(presentation)}>
                  {isArchived ? (
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                  ) : (
                    <Archive className="mr-2 h-4 w-4" />
                  )}
                  {isArchived ? 'Restaurar' : 'Arquivar'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(presentation)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir definitivamente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Link to={`/presentations/${presentation.id}/editor`} className="mt-4 block min-w-0">
          <h2 className="line-clamp-2 text-lg font-semibold transition-colors hover:text-primary">
            {presentation.title || 'Apresentação sem título'}
          </h2>
        </Link>

        {presentation.subtitle && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {presentation.subtitle}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="outline" className={status.className}>
            {status.label}
          </Badge>
          {typeName && <Badge variant="secondary">{typeName}</Badge>}
          {activeSession && (
            <Badge className="bg-blue-600 text-white hover:bg-blue-600">
              Em sessão
            </Badge>
          )}
        </div>

        {objectiveName && (
          <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
            Objetivo: {objectiveName}
          </p>
        )}
        <PresentationTags tags={presentationTags} />

        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {Number(presentation.estimated_duration_minutes) || 0} min
            </span>
            <span>{formatDate(presentation.updated_date || presentation.last_opened_at)}</span>
          </div>

          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          <Button asChild className="mt-4 w-full">
            <Link
              to={
                activeSession
                  ? activeSession.session_type === 'presentation'
                    ? `/present/${presentation.id}`
                    : `/rehearsal/${presentation.id}`
                  : `/presentations/${presentation.id}/editor`
              }
            >
              {activeSession ? (
                <>
                  <Play className="mr-2 h-4 w-4 fill-current" />
                  Continuar
                </>
              ) : (
                <>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Abrir apresentação
                </>
              )}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Presentations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: userLoading } = useCurrentUser();

  const [presentations, setPresentations] = useState([]);
  const [types, setTypes] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [tags, setTags] = useState([]);
  const [presentationTagLinks, setPresentationTagLinks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [busyAction, setBusyAction] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [objectiveFilter, setObjectiveFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated_desc');
  const [viewMode, setViewMode] = useState('list');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [tagTarget, setTagTarget] = useState(null);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLOR);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!silent) setLoading(true);
    setLoadError('');

    try {
      const [presentationRows, typeRows, objectiveRows, sessionRows, tagRows] = await Promise.all([
        base44.entities.Presentation.filter(
          { user_id: user.id },
          '-updated_date',
          PAGE_LIMIT,
        ),
        base44.entities.PresentationType.filter(
          { active: true },
          'order_index',
          PAGE_LIMIT,
        ),
        base44.entities.PresentationObjective.filter(
          { active: true },
          'order_index',
          PAGE_LIMIT,
        ),
        base44.entities.PresentationSession.filter(
          { user_id: user.id },
          '-created_date',
          PAGE_LIMIT,
        ),
        base44.entities.Tag.filter({ user_id: user.id }, 'name', PAGE_LIMIT),
      ]);

      const ownedPresentations = uniqueById(presentationRows);
      const tagLinkGroups = await Promise.all(
        ownedPresentations.map((presentation) => (
          base44.entities.PresentationTag.filter(
            { presentation_id: presentation.id },
            '-created_date',
            PAGE_LIMIT,
          )
        )),
      );

      setPresentations(ownedPresentations);
      setTypes(uniqueById(typeRows));
      setObjectives(uniqueById(objectiveRows));
      setSessions(uniqueById(sessionRows));
      setTags(uniqueById(tagRows));
      setPresentationTagLinks(uniqueById(tagLinkGroups.flat()));
    } catch (error) {
      console.error('Erro ao carregar apresentações:', error);
      setLoadError('Não foi possível carregar suas apresentações.');
      toast({
        title: 'Falha ao carregar',
        description: 'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const typeMap = useMemo(
    () => Object.fromEntries(types.map((item) => [item.id, item.name])),
    [types],
  );

  const objectiveMap = useMemo(
    () => Object.fromEntries(objectives.map((item) => [item.id, item.name])),
    [objectives],
  );

  const tagMap = useMemo(
    () => Object.fromEntries(tags.map((item) => [item.id, item])),
    [tags],
  );

  const tagsByPresentation = useMemo(() => {
    const map = {};
    presentationTagLinks.forEach((link) => {
      const tag = tagMap[link.tag_id];
      if (!tag) return;
      if (!map[link.presentation_id]) map[link.presentation_id] = [];
      map[link.presentation_id].push(tag);
    });
    Object.values(map).forEach((items) => items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')));
    return map;
  }, [presentationTagLinks, tagMap]);

  const activeSessionMap = useMemo(() => {
    const map = {};

    sessions.forEach((session) => {
      if (!session?.presentation_id) return;
      if (session.status !== 'active' && session.status !== 'paused') return;

      if (!map[session.presentation_id]) {
        map[session.presentation_id] = session;
      }
    });

    return map;
  }, [sessions]);

  const filteredPresentations = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    const result = presentations.filter((presentation) => {
      const isArchived = Boolean(presentation.is_archived) || presentation.status === 'archived';

      if (statusFilter === 'archived') {
        if (!isArchived) return false;
      } else {
        if (isArchived) return false;

        if (statusFilter === 'favorites' && !presentation.is_favorite) return false;
        if (
          statusFilter !== 'all'
          && statusFilter !== 'favorites'
          && presentation.status !== statusFilter
        ) {
          return false;
        }
      }

      if (typeFilter !== 'all' && presentation.presentation_type_id !== typeFilter) {
        return false;
      }

      if (objectiveFilter !== 'all' && presentation.objective_id !== objectiveFilter) {
        return false;
      }

      if (tagFilter !== 'all') {
        const presentationTagIds = presentationTagLinks
          .filter((link) => link.presentation_id === presentation.id)
          .map((link) => link.tag_id);
        if (!presentationTagIds.includes(tagFilter)) return false;
      }

      if (normalizedSearch) {
        const haystack = normalizeText([
          presentation.title,
          presentation.subtitle,
          presentation.description,
          presentation.main_theme,
          presentation.main_message,
          presentation.audience,
          typeMap[presentation.presentation_type_id],
          objectiveMap[presentation.objective_id],
        ].filter(Boolean).join(' '));

        if (!haystack.includes(normalizedSearch)) return false;
      }

      return true;
    });

    return [...result].sort((a, b) => {
      if (sortBy === 'created_desc') {
        return getTimestamp(b, 'created_date') - getTimestamp(a, 'created_date');
      }
      if (sortBy === 'title_asc') {
        return String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR');
      }
      if (sortBy === 'title_desc') {
        return String(b.title || '').localeCompare(String(a.title || ''), 'pt-BR');
      }
      if (sortBy === 'duration_asc') {
        return (Number(a.estimated_duration_minutes) || 0)
          - (Number(b.estimated_duration_minutes) || 0);
      }
      if (sortBy === 'duration_desc') {
        return (Number(b.estimated_duration_minutes) || 0)
          - (Number(a.estimated_duration_minutes) || 0);
      }

      return getTimestamp(b, 'updated_date') - getTimestamp(a, 'updated_date');
    });
  }, [
    objectiveFilter,
    objectiveMap,
    presentations,
    search,
    sortBy,
    statusFilter,
    typeFilter,
    typeMap,
    tagFilter,
    presentationTagLinks,
  ]);

  const counts = useMemo(() => {
    const active = presentations.filter(
      (item) => !item.is_archived && item.status !== 'archived',
    );

    return {
      total: active.length,
      drafts: active.filter((item) => item.status === 'draft').length,
      ready: active.filter((item) => item.status === 'ready').length,
      favorites: active.filter((item) => item.is_favorite).length,
      archived: presentations.filter(
        (item) => item.is_archived || item.status === 'archived',
      ).length,
    };
  }, [presentations]);

  const hasActiveFilters = Boolean(
    search
    || statusFilter !== 'all'
    || typeFilter !== 'all'
    || objectiveFilter !== 'all'
    || tagFilter !== 'all',
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData({ silent: true });
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setObjectiveFilter('all');
    setTagFilter('all');
    setSortBy('updated_desc');
  };

  const handleFavorite = async (presentation) => {
    if (!presentation?.id || busyAction) return;

    const nextValue = !presentation.is_favorite;
    setBusyAction({ type: 'favorite', presentationId: presentation.id });

    setPresentations((current) => current.map((item) => (
      item.id === presentation.id
        ? { ...item, is_favorite: nextValue }
        : item
    )));

    try {
      await base44.entities.Presentation.update(presentation.id, {
        is_favorite: nextValue,
      });
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      setPresentations((current) => current.map((item) => (
        item.id === presentation.id
          ? { ...item, is_favorite: !nextValue }
          : item
      )));
      toast({
        title: 'Não foi possível atualizar o favorito',
        variant: 'destructive',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleArchive = async (presentation) => {
    if (!presentation?.id || busyAction) return;

    const isArchived = Boolean(presentation.is_archived) || presentation.status === 'archived';
    const nextArchived = !isArchived;
    const previousStatus = presentation.status === 'archived' ? 'draft' : presentation.status;

    setBusyAction({ type: 'archive', presentationId: presentation.id });

    try {
      const updatePayload = nextArchived
        ? {
            is_archived: true,
            status: 'archived',
          }
        : {
            is_archived: false,
            status: previousStatus === 'archived' ? 'draft' : previousStatus,
          };

      await base44.entities.Presentation.update(presentation.id, updatePayload);

      setPresentations((current) => current.map((item) => (
        item.id === presentation.id
          ? { ...item, ...updatePayload }
          : item
      )));

      toast({
        title: nextArchived ? 'Apresentação arquivada' : 'Apresentação restaurada',
      });
    } catch (error) {
      console.error('Erro ao arquivar/restaurar:', error);
      toast({
        title: 'Não foi possível concluir a ação',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleOpenRename = (presentation) => {
    setRenameTarget(presentation);
    setRenameValue(presentation?.title || '');
  };

  const handleRename = async () => {
    const title = renameValue.trim();
    if (!renameTarget?.id || !title || busyAction) return;

    setBusyAction({ type: 'rename', presentationId: renameTarget.id });

    try {
      await base44.entities.Presentation.update(renameTarget.id, { title });
      setPresentations((current) => current.map((item) => (
        item.id === renameTarget.id ? { ...item, title } : item
      )));
      setRenameTarget(null);
      setRenameValue('');
      toast({ title: 'Apresentação renomeada' });
    } catch (error) {
      console.error('Erro ao renomear:', error);
      toast({
        title: 'Não foi possível renomear',
        variant: 'destructive',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDuplicate = async (presentation) => {
    if (!presentation?.id || busyAction || !user?.id) return;

    setBusyAction({ type: 'duplicate', presentationId: presentation.id });
    let duplicatedPresentation = null;

    try {
      const originalBlocks = await base44.entities.PresentationBlock.filter(
        { presentation_id: presentation.id },
        'order_index',
        PAGE_LIMIT,
      );

      const cleanPresentation = removeSystemFields(presentation);
      duplicatedPresentation = await base44.entities.Presentation.create({
        ...cleanPresentation,
        user_id: user.id,
        title: `${presentation.title || 'Apresentação'} (cópia)`,
        status: 'draft',
        progress_percentage: 0,
        is_favorite: false,
        is_archived: false,
        current_version: 1,
        last_opened_at: new Date().toISOString(),
      });

      const sourceBlocks = Array.isArray(originalBlocks) ? originalBlocks : [];
      const idMap = {};
      const pending = [...sourceBlocks].sort((a, b) => {
        const depthDifference = (Number(a.depth_level) || 0) - (Number(b.depth_level) || 0);
        if (depthDifference !== 0) return depthDifference;
        return (Number(a.order_index) || 0) - (Number(b.order_index) || 0);
      });

      for (const sourceBlock of pending) {
        const cleanBlock = removeSystemFields(sourceBlock);
        const newParentId = sourceBlock.parent_id
          ? idMap[sourceBlock.parent_id] || null
          : null;

        const createdBlock = await base44.entities.PresentationBlock.create({
          ...cleanBlock,
          presentation_id: duplicatedPresentation.id,
          parent_id: newParentId,
        });

        idMap[sourceBlock.id] = createdBlock.id;
      }

      setPresentations((current) => [duplicatedPresentation, ...current]);
      toast({
        title: 'Apresentação duplicada',
        description: `${sourceBlocks.length} bloco(s) foram copiados.`,
      });
    } catch (error) {
      console.error('Erro ao duplicar apresentação:', error);

      if (duplicatedPresentation?.id) {
        try {
          const partialBlocks = await base44.entities.PresentationBlock.filter(
            { presentation_id: duplicatedPresentation.id },
            'order_index',
            PAGE_LIMIT,
          );
          await Promise.allSettled(
            (partialBlocks || []).map((block) => (
              block?.id ? base44.entities.PresentationBlock.delete(block.id) : null
            )),
          );
          await base44.entities.Presentation.delete(duplicatedPresentation.id);
        } catch (rollbackError) {
          console.error('Erro ao remover cópia incompleta:', rollbackError);
        }
      }

      toast({
        title: 'Não foi possível duplicar',
        description: 'A apresentação original não foi alterada.',
        variant: 'destructive',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const deleteRows = async (entity, rows) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    await Promise.allSettled(
      safeRows
        .filter((row) => row?.id)
        .map((row) => entity.delete(row.id)),
    );
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id || busyAction) return;

    const presentationId = deleteTarget.id;
    setBusyAction({ type: 'delete', presentationId });

    try {
      const [blocks, presentationSessions, guidedAnswers, presentationTags] = await Promise.all([
        base44.entities.PresentationBlock.filter(
          { presentation_id: presentationId },
          'order_index',
          PAGE_LIMIT,
        ),
        base44.entities.PresentationSession.filter(
          { presentation_id: presentationId },
          '-created_date',
          PAGE_LIMIT,
        ),
        base44.entities.GuidedAnswer.filter(
          { presentation_id: presentationId },
          '-created_date',
          PAGE_LIMIT,
        ),
        base44.entities.PresentationTag.filter(
          { presentation_id: presentationId },
          '-created_date',
          PAGE_LIMIT,
        ),
      ]);

      const sessionIds = (presentationSessions || [])
        .map((session) => session.id)
        .filter(Boolean);

      const progressGroups = await Promise.all(
        sessionIds.map((sessionId) => (
          base44.entities.SessionBlockProgress.filter(
            { session_id: sessionId },
            'order_used',
            PAGE_LIMIT,
          )
        )),
      );

      await deleteRows(
        base44.entities.SessionBlockProgress,
        progressGroups.flat(),
      );
      await deleteRows(base44.entities.PresentationSession, presentationSessions);
      await deleteRows(base44.entities.GuidedAnswer, guidedAnswers);
      await deleteRows(base44.entities.PresentationTag, presentationTags);
      await deleteRows(base44.entities.PresentationBlock, blocks);
      await base44.entities.Presentation.delete(presentationId);

      setPresentations((current) => current.filter((item) => item.id !== presentationId));
      setSessions((current) => current.filter((item) => item.presentation_id !== presentationId));
      setPresentationTagLinks((current) => current.filter((item) => item.presentation_id !== presentationId));
      setDeleteTarget(null);

      toast({ title: 'Apresentação excluída definitivamente' });
    } catch (error) {
      console.error('Erro ao excluir apresentação:', error);
      toast({
        title: 'Não foi possível excluir completamente',
        description: 'Tente novamente. Nenhum conteúdo novo foi criado.',
        variant: 'destructive',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name || !user?.id || busyAction) return;
    if (tags.some((tag) => normalizeText(tag.name) === normalizeText(name))) {
      toast({ title: 'Já existe uma etiqueta com esse nome', variant: 'destructive' });
      return;
    }
    setBusyAction({ type: 'tag-create', presentationId: tagTarget?.id });
    try {
      const created = await base44.entities.Tag.create({ user_id: user.id, name, color: newTagColor });
      setTags((current) => [...current, created].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')));
      setNewTagName('');
      setNewTagColor(DEFAULT_TAG_COLOR);
      setShowCreateTag(false);
      toast({ title: 'Etiqueta criada' });
    } catch (error) {
      console.error('Erro ao criar etiqueta:', error);
      toast({ title: 'Não foi possível criar a etiqueta', variant: 'destructive' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleTag = async (tagId) => {
    if (!tagTarget?.id || busyAction) return;
    const existing = presentationTagLinks.find((link) => link.presentation_id === tagTarget.id && link.tag_id === tagId);
    setBusyAction({ type: 'tag-toggle', presentationId: tagTarget.id });
    try {
      if (existing) {
        await base44.entities.PresentationTag.delete(existing.id);
        setPresentationTagLinks((current) => current.filter((link) => link.id !== existing.id));
      } else {
        const created = await base44.entities.PresentationTag.create({ presentation_id: tagTarget.id, tag_id: tagId });
        setPresentationTagLinks((current) => [...current, created]);
      }
    } catch (error) {
      console.error('Erro ao atualizar etiqueta:', error);
      toast({ title: 'Não foi possível atualizar as etiquetas', variant: 'destructive' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteTag = async (tag) => {
    if (!tag?.id || busyAction) return;
    setBusyAction({ type: 'tag-delete', presentationId: tagTarget?.id });
    try {
      const links = presentationTagLinks.filter((link) => link.tag_id === tag.id);
      await Promise.allSettled(links.map((link) => base44.entities.PresentationTag.delete(link.id)));
      await base44.entities.Tag.delete(tag.id);
      setTags((current) => current.filter((item) => item.id !== tag.id));
      setPresentationTagLinks((current) => current.filter((link) => link.tag_id !== tag.id));
      if (tagFilter === tag.id) setTagFilter('all');
      toast({ title: 'Etiqueta excluída' });
    } catch (error) {
      console.error('Erro ao excluir etiqueta:', error);
      toast({ title: 'Não foi possível excluir a etiqueta', variant: 'destructive' });
    } finally {
      setBusyAction(null);
    }
  };

  if (userLoading || loading) {
    return <LoadingState />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Sua biblioteca de conteúdo</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Minhas apresentações</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Organize, edite, ensaie e apresente todos os seus conteúdos em um só lugar.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button asChild className="w-full sm:w-auto">
            <Link to="/new-presentation">
              <Plus className="mr-2 h-4 w-4" />
              Nova apresentação
            </Link>
          </Button>
        </div>
      </header>

      {loadError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button type="button" variant="outline" size="sm" onClick={handleRefresh}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Resumo das apresentações">
        <SummaryCard icon={FileText} label="Ativas" value={counts.total} description="Não arquivadas" />
        <SummaryCard icon={Edit3} label="Rascunhos" value={counts.drafts} description="Em construção" />
        <SummaryCard icon={CheckCircle2} label="Prontas" value={counts.ready} description="Prontas para usar" />
        <SummaryCard icon={Star} label="Favoritas" value={counts.favorites} description="Acesso rápido" />
        <div className="col-span-2 lg:col-span-1">
          <SummaryCard icon={Archive} label="Arquivadas" value={counts.archived} description="Guardadas" />
        </div>
      </section>

      <Card className="border-border/70">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por título, tema, público, tipo ou objetivo..."
                className="pl-9 pr-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44">
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

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant={showAdvancedFilters ? 'secondary' : 'outline'}
                onClick={() => setShowAdvancedFilters((current) => !current)}
                className="col-span-2 sm:w-auto"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Mais filtros
              </Button>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Tipo</p>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {types.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Objetivo</p>
                <Select value={objectiveFilter} onValueChange={setObjectiveFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os objetivos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os objetivos</SelectItem>
                    {objectives.map((objective) => (
                      <SelectItem key={objective.id} value={objective.id}>
                        {objective.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Etiqueta</p>
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as etiquetas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as etiquetas</SelectItem>
                    {tags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="w-full"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Limpar filtros
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">
            {filteredPresentations.length} apresentação(ões) encontrada(s)
          </p>
          {hasActiveFilters && (
            <p className="text-xs text-muted-foreground">Resultado conforme os filtros aplicados.</p>
          )}
        </div>

        <div className="inline-flex self-start rounded-lg border bg-background p-1 sm:self-auto">
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            onClick={() => setViewMode('list')}
            className="h-8 px-3"
          >
            <List className="mr-1.5 h-4 w-4" />
            Lista
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            onClick={() => setViewMode('grid')}
            className="h-8 px-3"
          >
            <LayoutGrid className="mr-1.5 h-4 w-4" />
            Cards
          </Button>
        </div>
      </div>

      {filteredPresentations.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            icon={FileText}
            title={presentations.length === 0 ? 'Nenhuma apresentação criada' : 'Nenhuma apresentação encontrada'}
            description={
              presentations.length === 0
                ? 'Crie sua primeira apresentação do zero, com ajuda ou usando um modelo.'
                : 'Altere os filtros ou a busca para encontrar outros conteúdos.'
            }
            actionLabel={presentations.length === 0 ? 'Criar apresentação' : 'Limpar filtros'}
            onAction={presentations.length === 0 ? () => navigate('/new-presentation') : clearFilters}
          />
        </Card>
      ) : viewMode === 'grid' ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPresentations.map((presentation) => (
            <PresentationGridCard
              key={presentation.id}
              presentation={presentation}
              typeName={typeMap[presentation.presentation_type_id]}
              objectiveName={objectiveMap[presentation.objective_id]}
              presentationTags={tagsByPresentation[presentation.id] || []}
              activeSession={activeSessionMap[presentation.id]}
              busyAction={busyAction}
              onFavorite={handleFavorite}
              onRename={handleOpenRename}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onDelete={setDeleteTarget}
              onManageTags={setTagTarget}
            />
          ))}
        </section>
      ) : (
        <section className="space-y-3">
          {filteredPresentations.map((presentation) => (
            <PresentationListCard
              key={presentation.id}
              presentation={presentation}
              typeName={typeMap[presentation.presentation_type_id]}
              objectiveName={objectiveMap[presentation.objective_id]}
              presentationTags={tagsByPresentation[presentation.id] || []}
              activeSession={activeSessionMap[presentation.id]}
              busyAction={busyAction}
              onFavorite={handleFavorite}
              onRename={handleOpenRename}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onDelete={setDeleteTarget}
              onManageTags={setTagTarget}
            />
          ))}
        </section>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && busyAction?.type !== 'delete') setDeleteTarget(null);
        }}
        title="Excluir apresentação definitivamente"
        description={`A apresentação “${deleteTarget?.title || ''}”, seus blocos, respostas guiadas e histórico de sessões serão removidos. Esta ação não pode ser desfeita.`}
        confirmLabel={busyAction?.type === 'delete' ? 'Excluindo...' : 'Excluir definitivamente'}
        cancelLabel="Cancelar"
        onConfirm={handleDelete}
        variant="destructive"
      />

      <Dialog
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open && busyAction?.type !== 'rename') {
            setRenameTarget(null);
            setRenameValue('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear apresentação</DialogTitle>
            <DialogDescription>
              Altere somente o título. Todo o conteúdo será preservado.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Input
              autoFocus
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              maxLength={160}
              placeholder="Título da apresentação"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && renameValue.trim()) {
                  event.preventDefault();
                  handleRename();
                }
              }}
            />
            <p className="mt-2 text-right text-xs text-muted-foreground">
              {renameValue.length}/160
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRenameTarget(null);
                setRenameValue('');
              }}
              disabled={busyAction?.type === 'rename'}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleRename}
              disabled={!renameValue.trim() || busyAction?.type === 'rename'}
            >
              {busyAction?.type === 'rename' && (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar título
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}