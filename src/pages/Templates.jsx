import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  Crown,
  Filter,
  Layers3,
  LayoutGrid,
  LayoutList,
  LayoutTemplate,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  UserRound,
  X,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import { backendConfig } from '@/lib/backendConfig';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import EmptyState from '@/components/shared/EmptyState';

const ALL_VALUE = 'all';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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

function normalizeDate(value, { endOfDay = false } = {}) {
  if (!value) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const date = new Date(
    dateOnly
      ? `${raw}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`
      : raw,
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function isProfilePlanActive(profile) {
  if (!profile?.plan_id) return false;

  const status = String(profile.plan_status || 'none')
    .trim()
    .toLowerCase();

  if (status === 'permanent') return true;
  if (status !== 'active') return false;

  const expiration = normalizeDate(
    profile.plan_expires_at,
    { endOfDay: true },
  );

  return !expiration || expiration.getTime() >= Date.now();
}

function sortDeepestFirst(blocks) {
  return [...blocks].sort((left, right) => {
    const depthDifference = (
      Number(right?.depth_level || 0)
      - Number(left?.depth_level || 0)
    );

    if (depthDifference !== 0) {
      return depthDifference;
    }

    return Number(right?.order_index || 0)
      - Number(left?.order_index || 0);
  });
}

function sortTemplateBlocks(blocks) {
  return [...blocks].sort((a, b) => {
    const depthA = Number(a.depth_level) || 0;
    const depthB = Number(b.depth_level) || 0;

    if (depthA !== depthB) {
      return depthA - depthB;
    }

    return (Number(a.order_index) || 0)
      - (Number(b.order_index) || 0);
  });
}

function formatDuration(seconds) {
  const totalSeconds = Math.max(0, Number(seconds) || 0);
  const totalMinutes = Math.round(totalSeconds / 60);

  if (totalMinutes < 1) {
    return 'Menos de 1 min';
  }

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes > 0
    ? `${hours}h ${minutes}min`
    : `${hours}h`;
}

function TemplatesLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <span className="text-sm">Carregando modelos...</span>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  typeName,
  objectiveName,
  styleName,
  blockCount,
  estimatedSeconds,
  viewMode,
  onPreview,
  onUse,
  isUsing,
  isLocked,
}) {
  return (
    <Card className="group h-full overflow-hidden border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      {template.thumbnail_url ? (
        <div className="aspect-[16/8] overflow-hidden border-b bg-muted">
          <img
            src={template.thumbnail_url}
            alt={`Capa do modelo ${template.name}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      ) : (
        <div className="flex aspect-[16/8] items-center justify-center border-b bg-gradient-to-br from-primary/15 via-background to-muted">
          <LayoutTemplate className="h-12 w-12 text-primary/70" />
        </div>
      )}

      <CardContent className="flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug">
              {template.name}
            </h3>

            {typeName && (
              <p className="mt-1 text-xs font-medium text-primary">
                {typeName}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {template.is_official && (
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300">
                <Check className="mr-1 h-3 w-3" />
                Oficial
              </Badge>
            )}

            {template.is_premium && (
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300">
                <Crown className="mr-1 h-3 w-3" />
                Premium
              </Badge>
            )}
          </div>
        </div>

        <p className="mt-3 line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-muted-foreground">
          {template.description
            || 'Estrutura pronta para você preencher e adaptar ao seu conteúdo.'}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
            <Layers3 className="h-3.5 w-3.5" />
            {blockCount || 0} blocos
          </span>

          {estimatedSeconds > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              <Clock3 className="h-3.5 w-3.5" />
              {formatDuration(estimatedSeconds)}
            </span>
          )}

          {objectiveName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              <Sparkles className="h-3.5 w-3.5" />
              {objectiveName}
            </span>
          )}

          {styleName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              <BookOpen className="h-3.5 w-3.5" />
              {styleName}
            </span>
          )}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onPreview(template)}
          >
            Ver estrutura
          </Button>

          <Button
            type="button"
            onClick={() => onUse(template)}
            disabled={isUsing}
            variant={isLocked ? 'secondary' : 'default'}
          >
            {isUsing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isLocked ? (
              <Lock className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {isLocked ? 'Ver plano' : 'Usar modelo'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateListItem({
  template,
  typeName,
  objectiveName,
  blockCount,
  estimatedSeconds,
  onPreview,
  onUse,
  isUsing,
  isLocked,
}) {
  return (
    <Card className="border-border/70 transition-all hover:border-primary/30 hover:shadow-sm">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
            {template.thumbnail_url ? (
              <img
                src={template.thumbnail_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <LayoutTemplate className="h-6 w-6 text-primary" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold">
                {template.name}
              </h3>

              {template.is_official && (
                <Badge variant="secondary">Oficial</Badge>
              )}

              {template.is_premium && (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300">
                  Premium
                </Badge>
              )}
            </div>

            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {template.description
                || 'Estrutura pronta para adaptar.'}
            </p>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {typeName && <span>{typeName}</span>}
              {objectiveName && <span>{objectiveName}</span>}
              <span>{blockCount || 0} blocos</span>
              {estimatedSeconds > 0 && (
                <span>{formatDuration(estimatedSeconds)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
          <Button
            type="button"
            variant="outline"
            onClick={() => onPreview(template)}
          >
            Ver estrutura
          </Button>

          <Button
            type="button"
            onClick={() => onUse(template)}
            disabled={isUsing}
            variant={isLocked ? 'secondary' : 'default'}
          >
            {isUsing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isLocked ? (
              <Lock className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {isLocked ? 'Ver plano' : 'Usar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewBlockRow({
  block,
  childrenByParent,
  blockTypeMap,
  expanded,
  onToggle,
}) {
  const children = childrenByParent.get(block.id) || [];
  const hasChildren = children.length > 0;
  const isExpanded = expanded.has(block.id);

  return (
    <div>
      <div
        className="flex items-start gap-2 rounded-lg border bg-background p-3"
        style={{
          marginLeft: `${Math.min(Number(block.depth_level) || 0, 4) * 14}px`,
        }}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggle(block.id)}
          disabled={!hasChildren}
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:cursor-default disabled:opacity-30"
          aria-label={isExpanded ? 'Recolher bloco' : 'Expandir bloco'}
        >
          {hasChildren && (
            isExpanded
              ? <ChevronDown className="h-4 w-4" />
              : <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">
              {block.title || 'Bloco sem título'}
            </p>

            {blockTypeMap[block.block_type_id] && (
              <Badge variant="outline" className="text-[10px]">
                {blockTypeMap[block.block_type_id]}
              </Badge>
            )}

            {block.is_essential && (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300">
                Essencial
              </Badge>
            )}
          </div>

          {block.summary && (
            <p className="mt-1 text-sm text-muted-foreground">
              {block.summary}
            </p>
          )}
        </div>

        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDuration(block.estimated_duration_seconds)}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-2 space-y-2">
          {children.map((child) => (
            <PreviewBlockRow
              key={child.id}
              block={child}
              childrenByParent={childrenByParent}
              blockTypeMap={blockTypeMap}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Templates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    user,
    profile,
    isAdmin,
    loading: userLoading,
  } = useCurrentUser();

  const [templates, setTemplates] = useState([]);
  const [templateBlocks, setTemplateBlocks] = useState([]);
  const [types, setTypes] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [styles, setStyles] = useState([]);
  const [blockTypes, setBlockTypes] = useState([]);
  const [themes, setThemes] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(ALL_VALUE);
  const [objectiveFilter, setObjectiveFilter] = useState(ALL_VALUE);
  const [originFilter, setOriginFilter] = useState(ALL_VALUE);
  const [viewMode, setViewMode] = useState('grid');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [usingTemplateId, setUsingTemplateId] = useState('');
  const useTemplateLockRef = useRef(false);

  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [expandedPreviewBlocks, setExpandedPreviewBlocks] = useState(
    new Set(),
  );

  const loadPage = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    setLoadError('');

    try {
      const [
        templateRows,
        templateBlockRows,
        typeRows,
        objectiveRows,
        styleRows,
        blockTypeRows,
        themeRows,
        planRows,
      ] = await Promise.all([
        base44.entities.PresentationTemplate.filter(
          { active: true },
          'name',
        ),
        base44.entities.TemplateBlock.list('order_index'),
        base44.entities.PresentationType.filter(
          { active: true },
          'order_index',
        ),
        base44.entities.PresentationObjective.filter(
          { active: true },
          'order_index',
        ),
        base44.entities.CommunicationStyle.filter(
          { active: true },
          'order_index',
        ),
        base44.entities.BlockType.filter(
          { active: true },
          'order_index',
        ),
        base44.entities.PresentationTheme.filter(
          { active: true },
          'name',
        ),
        backendConfig.features.paidPlans
          && profile?.plan_id
          && isProfilePlanActive(profile)
          ? base44.entities.Plan.filter({
              id: profile.plan_id,
            })
          : Promise.resolve([]),
      ]);

      const normalizedTemplates = uniqueById(templateRows);
      const validTemplateIds = new Set(
        normalizedTemplates.map((template) => template.id),
      );

      setTemplates(normalizedTemplates);
      setTemplateBlocks(
        uniqueById(templateBlockRows).filter(
          (block) => validTemplateIds.has(block.template_id),
        ),
      );
      setTypes(uniqueById(typeRows));
      setObjectives(uniqueById(objectiveRows));
      setStyles(uniqueById(styleRows));
      setBlockTypes(uniqueById(blockTypeRows));
      setThemes(uniqueById(themeRows));
      setCurrentPlan(
        uniqueById(planRows).find(
          (plan) => plan.id === profile?.plan_id,
        ) || null,
      );
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      setLoadError('Não foi possível carregar os modelos agora.');

      toast({
        title: 'Falha ao carregar modelos',
        description: 'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile, toast]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const typeMap = useMemo(
    () => Object.fromEntries(types.map((item) => [item.id, item.name])),
    [types],
  );

  const objectiveMap = useMemo(
    () => Object.fromEntries(
      objectives.map((item) => [item.id, item.name]),
    ),
    [objectives],
  );

  const styleMap = useMemo(
    () => Object.fromEntries(styles.map((item) => [item.id, item.name])),
    [styles],
  );

  const blockTypeMap = useMemo(
    () => Object.fromEntries(
      blockTypes.map((item) => [item.id, item.name]),
    ),
    [blockTypes],
  );

  const blocksByTemplate = useMemo(() => {
    const map = new Map();

    templateBlocks.forEach((block) => {
      if (!map.has(block.template_id)) {
        map.set(block.template_id, []);
      }

      map.get(block.template_id).push(block);
    });

    map.forEach((blocks, templateId) => {
      map.set(templateId, sortTemplateBlocks(blocks));
    });

    return map;
  }, [templateBlocks]);

  const templateStats = useMemo(() => {
    const map = new Map();

    templates.forEach((template) => {
      const blocks = blocksByTemplate.get(template.id) || [];
      const estimatedSeconds = blocks.reduce(
        (total, block) => total
          + (Number(block.estimated_duration_seconds) || 0),
        0,
      );

      map.set(template.id, {
        blockCount: blocks.length,
        estimatedSeconds,
      });
    });

    return map;
  }, [blocksByTemplate, templates]);

  const visibleTemplates = useMemo(() => {
    const query = normalizeText(search);

    return templates.filter((template) => {
      const belongsToCurrentUser = Boolean(
        user?.id && template.owner_user_id === user.id,
      );

      const canView = template.is_public
        || template.is_official
        || belongsToCurrentUser;

      if (!canView) {
        return false;
      }

      if (
        typeFilter !== ALL_VALUE
        && template.presentation_type_id !== typeFilter
      ) {
        return false;
      }

      if (
        objectiveFilter !== ALL_VALUE
        && template.objective_id !== objectiveFilter
      ) {
        return false;
      }

      if (originFilter === 'official' && !template.is_official) {
        return false;
      }

      if (originFilter === 'mine' && !belongsToCurrentUser) {
        return false;
      }

      if (originFilter === 'free' && template.is_premium) {
        return false;
      }

      if (originFilter === 'premium' && !template.is_premium) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = normalizeText([
        template.name,
        template.description,
        typeMap[template.presentation_type_id],
        objectiveMap[template.objective_id],
        styleMap[template.communication_style_id],
      ].filter(Boolean).join(' '));

      return searchable.includes(query);
    });
  }, [
    objectiveFilter,
    objectiveMap,
    originFilter,
    search,
    styleMap,
    templates,
    typeFilter,
    typeMap,
    user?.id,
  ]);

  const canUsePremiumTemplates = Boolean(
    !backendConfig.features.paidPlans
    || isAdmin
    || (
      isProfilePlanActive(profile)
      && currentPlan?.can_use_premium_templates === true
    ),
  );

  const isTemplateLocked = useCallback(
    (template) => Boolean(
      template?.is_premium
      && !canUsePremiumTemplates
    ),
    [canUsePremiumTemplates],
  );

  const previewBlocks = previewTemplate
    ? blocksByTemplate.get(previewTemplate.id) || []
    : [];

  const previewChildrenByParent = useMemo(() => {
    const map = new Map();

    previewBlocks.forEach((block) => {
      const key = block.parent_id || '__root__';

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key).push(block);
    });

    map.forEach((items, key) => {
      map.set(
        key,
        [...items].sort(
          (a, b) => (Number(a.order_index) || 0)
            - (Number(b.order_index) || 0),
        ),
      );
    });

    return map;
  }, [previewBlocks]);

  const previewRootBlocks = previewChildrenByParent.get('__root__') || [];

  const clearFilters = () => {
    setSearch('');
    setTypeFilter(ALL_VALUE);
    setObjectiveFilter(ALL_VALUE);
    setOriginFilter(ALL_VALUE);
  };

  const openPreview = (template) => {
    setPreviewTemplate(template);

    const blocks = blocksByTemplate.get(template.id) || [];
    setExpandedPreviewBlocks(new Set(blocks.map((block) => block.id)));
  };

  const togglePreviewBlock = (blockId) => {
    setExpandedPreviewBlocks((current) => {
      const next = new Set(current);

      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }

      return next;
    });
  };

  const copyTemplateBlocks = async (templateId, presentationId) => {
    const sourceBlocks = sortTemplateBlocks(
      uniqueById(blocksByTemplate.get(templateId) || []),
    );

    if (sourceBlocks.length === 0) {
      throw new Error('Este modelo não possui uma estrutura válida.');
    }

    const idMap = new Map();
    const createdBlocks = [];
    const pending = [...sourceBlocks];
    let safetyCounter = sourceBlocks.length + 1;

    while (pending.length > 0 && safetyCounter > 0) {
      safetyCounter -= 1;
      let createdInThisRound = 0;

      for (let index = pending.length - 1; index >= 0; index -= 1) {
        const sourceBlock = pending[index];

        const parentReady = (
          !sourceBlock.parent_id
          || idMap.has(sourceBlock.parent_id)
        );

        if (!parentReady) {
          continue;
        }

        const created = await base44.entities.PresentationBlock.create({
          presentation_id: presentationId,
          parent_id: sourceBlock.parent_id
            ? idMap.get(sourceBlock.parent_id)
            : '',
          block_type_id: sourceBlock.block_type_id || '',
          title: sourceBlock.title || 'Novo tópico',
          summary: sourceBlock.summary || '',
          content: sourceBlock.content || '',
          additional_content: sourceBlock.additional_content || '',
          presenter_notes: sourceBlock.presenter_notes || '',
          order_index: Number(sourceBlock.order_index) || 0,
          depth_level: Number(sourceBlock.depth_level) || 0,
          importance_level: Number(sourceBlock.importance_level) || 3,
          estimated_duration_seconds:
            Number(sourceBlock.estimated_duration_seconds) || 60,
          is_essential: Boolean(sourceBlock.is_essential),
          is_hidden: Boolean(sourceBlock.is_hidden),
          is_collapsed: Boolean(sourceBlock.is_collapsed),
          show_to_audience: sourceBlock.show_to_audience !== false,
          icon: sourceBlock.icon || '',
          background_style: sourceBlock.background_style || '',
          text_style: sourceBlock.text_style || '',
        });

        if (!created?.id) {
          throw new Error('A cópia de um bloco não retornou um ID válido.');
        }

        idMap.set(sourceBlock.id, created.id);
        createdBlocks.push(created);
        pending.splice(index, 1);
        createdInThisRound += 1;
      }

      if (createdInThisRound === 0) {
        throw new Error(
          'A hierarquia deste modelo está incompleta ou possui referências inválidas.',
        );
      }
    }

    if (pending.length > 0) {
      throw new Error('A estrutura do modelo não pôde ser copiada por completo.');
    }

    return createdBlocks;
  };

  const handleUseTemplate = async (template) => {
    if (
      !template?.id
      || !user?.id
      || usingTemplateId
      || useTemplateLockRef.current
    ) {
      return;
    }

    const belongsToCurrentUser = template.owner_user_id === user.id;
    const canView = (
      template.is_public
      || template.is_official
      || belongsToCurrentUser
    );

    if (!canView) {
      toast({
        title: 'Modelo indisponível',
        description: 'Este modelo não está disponível para sua conta.',
        variant: 'destructive',
      });
      return;
    }

    if (isTemplateLocked(template)) {
      toast({
        title: 'Modelo disponível em um plano superior',
        description:
          'Confira os planos que liberam modelos premium.',
      });

      navigate('/my-plan');
      return;
    }

    useTemplateLockRef.current = true;
    setUsingTemplateId(template.id);

    let createdPresentation = null;
    let createdBlocks = [];

    try {
      const maxPresentations = Number(currentPlan?.max_presentations);

      if (
        backendConfig.features.paidPlans
        && isProfilePlanActive(profile)
        && Number.isFinite(maxPresentations)
        && maxPresentations >= 0
      ) {
        const currentPresentations = uniqueById(
          await base44.entities.Presentation.filter({
            user_id: user.id,
          }),
        );

        if (currentPresentations.length >= maxPresentations) {
          throw new Error('PLAN_LIMIT_REACHED');
        }
      }

      const stats = templateStats.get(template.id);
      const estimatedMinutes = stats?.estimatedSeconds > 0
        ? Math.max(1, Math.round(stats.estimatedSeconds / 60))
        : 30;

      const defaultTheme = themes.find(
        (theme) => theme.active !== false && !theme.is_premium,
      ) || themes[0];

      createdPresentation = await base44.entities.Presentation.create({
        user_id: user.id,
        title: `${template.name} - Nova apresentação`,
        subtitle: '',
        description: template.description || '',
        presentation_type_id: template.presentation_type_id || '',
        objective_id: template.objective_id || '',
        communication_style_id:
          template.communication_style_id || '',
        audience: '',
        audience_knowledge_level: 'mixed',
        main_theme: template.name || '',
        main_message: '',
        estimated_duration_minutes: estimatedMinutes,
        theme_id: defaultTheme?.id || '',
        default_view_mode: 'structure',
        status: 'draft',
        progress_percentage: 0,
        is_favorite: false,
        is_archived: false,
        current_version: 1,
        last_opened_at: new Date().toISOString(),
      });

      if (!createdPresentation?.id) {
        throw new Error('A apresentação não retornou um ID válido.');
      }

      createdBlocks = await copyTemplateBlocks(
        template.id,
        createdPresentation.id,
      );

      toast({
        title: 'Apresentação criada',
        description: 'O modelo foi copiado e já pode ser editado.',
      });

      setPreviewTemplate(null);
      navigate(`/presentations/${createdPresentation.id}/editor`);
    } catch (error) {
      console.error('Erro ao usar modelo:', error);

      for (const block of sortDeepestFirst(createdBlocks)) {
        try {
          await base44.entities.PresentationBlock.delete(block.id);
        } catch (cleanupError) {
          console.error(
            'Não foi possível remover um bloco incompleto:',
            cleanupError,
          );
        }
      }

      if (createdPresentation?.id) {
        try {
          const leftoverBlocks = uniqueById(
            await base44.entities.PresentationBlock.filter({
              presentation_id: createdPresentation.id,
            }),
          );

          for (const block of sortDeepestFirst(leftoverBlocks)) {
            await base44.entities.PresentationBlock.delete(block.id);
          }

          await base44.entities.Presentation.delete(
            createdPresentation.id,
          );
        } catch (cleanupError) {
          console.error(
            'Não foi possível remover a apresentação incompleta:',
            cleanupError,
          );
        }
      }

      toast({
        title: error.message === 'PLAN_LIMIT_REACHED'
          ? 'Limite de apresentações atingido'
          : 'Não foi possível usar o modelo',
        description: error.message === 'PLAN_LIMIT_REACHED'
          ? 'Exclua uma apresentação ou altere seu plano para continuar.'
          : (
            error.message
            || 'Nenhuma apresentação completa foi criada. Tente novamente.'
          ),
        variant: 'destructive',
      });
    } finally {
      useTemplateLockRef.current = false;
      setUsingTemplateId('');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPage({ silent: true });
  };

  if (userLoading || loading) {
    return <TemplatesLoading />;
  }

  if (!user?.id) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4">
        <EmptyState
          icon={UserRound}
          title="Entre para usar os modelos"
          description="Sua conta é necessária para criar apresentações a partir de modelos."
          actionLabel="Entrar"
          onAction={() => navigate('/login')}
        />
      </div>
    );
  }

  const hasActiveFilters = Boolean(
    search
    || typeFilter !== ALL_VALUE
    || objectiveFilter !== ALL_VALUE
    || originFilter !== ALL_VALUE,
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <LayoutTemplate className="h-4 w-4" />
            Biblioteca de estruturas
          </div>

          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            Modelos de apresentação
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Escolha uma estrutura pronta, veja os tópicos antes de usar e adapte tudo ao seu conteúdo.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing || Boolean(usingTemplateId)}
          className="w-full sm:w-auto"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </header>

      {loadError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button type="button" variant="outline" onClick={handleRefresh}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, tipo, objetivo ou estilo..."
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

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Todos os tipos</SelectItem>
                  {types.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={objectiveFilter}
                onValueChange={setObjectiveFilter}
              >
                <SelectTrigger className="w-full lg:w-[190px]">
                  <SelectValue placeholder="Objetivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Todos os objetivos</SelectItem>
                  {objectives.map((objective) => (
                    <SelectItem key={objective.id} value={objective.id}>
                      {objective.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={originFilter} onValueChange={setOriginFilter}>
                <SelectTrigger className="w-full lg:w-[170px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Todos os modelos</SelectItem>
                  <SelectItem value="official">Oficiais</SelectItem>
                  <SelectItem value="mine">Meus modelos</SelectItem>
                  <SelectItem value="free">Gratuitos</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>
                {visibleTemplates.length} {visibleTemplates.length === 1 ? 'modelo encontrado' : 'modelos encontrados'}
              </span>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8"
                >
                  Limpar filtros
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 rounded-lg border bg-muted/40 p-1">
              <Button
                type="button"
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8"
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Cartões
              </Button>

              <Button
                type="button"
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8"
              >
                <LayoutList className="mr-2 h-4 w-4" />
                Lista
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {visibleTemplates.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            icon={LayoutTemplate}
            title="Nenhum modelo encontrado"
            description={hasActiveFilters
              ? 'Altere ou limpe os filtros para ver outros modelos.'
              : 'Os modelos oficiais e públicos aparecerão aqui quando forem cadastrados.'}
            actionLabel={hasActiveFilters ? 'Limpar filtros' : undefined}
            onAction={hasActiveFilters ? clearFilters : undefined}
          />
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleTemplates.map((template) => {
            const stats = templateStats.get(template.id) || {};

            return (
              <TemplateCard
                key={template.id}
                template={template}
                typeName={typeMap[template.presentation_type_id]}
                objectiveName={objectiveMap[template.objective_id]}
                styleName={styleMap[template.communication_style_id]}
                blockCount={stats.blockCount}
                estimatedSeconds={stats.estimatedSeconds}
                viewMode={viewMode}
                onPreview={openPreview}
                onUse={handleUseTemplate}
                isUsing={usingTemplateId === template.id}
                isLocked={isTemplateLocked(template)}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleTemplates.map((template) => {
            const stats = templateStats.get(template.id) || {};

            return (
              <TemplateListItem
                key={template.id}
                template={template}
                typeName={typeMap[template.presentation_type_id]}
                objectiveName={objectiveMap[template.objective_id]}
                blockCount={stats.blockCount}
                estimatedSeconds={stats.estimatedSeconds}
                onPreview={openPreview}
                onUse={handleUseTemplate}
                isUsing={usingTemplateId === template.id}
                isLocked={isTemplateLocked(template)}
              />
            );
          })}
        </div>
      )}

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>

            <div>
              <h2 className="font-semibold">
                Prefere começar com perguntas guiadas?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                O aplicativo pode ajudar você a escolher a melhor estrutura conforme seu tipo de apresentação e objetivo.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/new-presentation?mode=guided')}
            className="w-full shrink-0 sm:w-auto"
          >
            Criar com ajuda
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(previewTemplate)}
        onOpenChange={(open) => {
          if (!open && !usingTemplateId) {
            setPreviewTemplate(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
          {previewTemplate && (
            <>
              <DialogHeader className="border-b px-5 py-4 pr-12">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>{previewTemplate.name}</DialogTitle>

                  {previewTemplate.is_official && (
                    <Badge variant="secondary">Oficial</Badge>
                  )}

                  {previewTemplate.is_premium && (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300">
                      <Crown className="mr-1 h-3 w-3" />
                      Premium
                    </Badge>
                  )}
                </div>

                <DialogDescription>
                  {previewTemplate.description
                    || 'Veja a estrutura antes de criar sua apresentação.'}
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[62vh] overflow-y-auto px-5 py-4">
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p className="mt-1 line-clamp-1 text-sm font-medium">
                      {typeMap[previewTemplate.presentation_type_id] || 'Livre'}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Objetivo</p>
                    <p className="mt-1 line-clamp-1 text-sm font-medium">
                      {objectiveMap[previewTemplate.objective_id] || 'Não definido'}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Blocos</p>
                    <p className="mt-1 text-sm font-medium">
                      {previewBlocks.length}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Duração</p>
                    <p className="mt-1 text-sm font-medium">
                      {formatDuration(
                        templateStats.get(previewTemplate.id)?.estimatedSeconds,
                      )}
                    </p>
                  </div>
                </div>

                {previewRootBlocks.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center">
                    <LayoutTemplate className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 font-medium">Modelo sem blocos cadastrados</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      A apresentação será criada vazia para você montar a estrutura.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {previewRootBlocks.map((block) => (
                      <PreviewBlockRow
                        key={block.id}
                        block={block}
                        childrenByParent={previewChildrenByParent}
                        blockTypeMap={blockTypeMap}
                        expanded={expandedPreviewBlocks}
                        onToggle={togglePreviewBlock}
                      />
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="border-t px-5 py-4 sm:justify-between">
                <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                  {previewTemplate.owner_user_id === user?.id ? (
                    <>
                      <UserRound className="h-4 w-4" />
                      Modelo criado por você
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4" />
                      Estrutura reutilizável
                    </>
                  )}
                </div>

                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPreviewTemplate(null)}
                    disabled={Boolean(usingTemplateId)}
                  >
                    Fechar
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleUseTemplate(previewTemplate)}
                    disabled={Boolean(usingTemplateId)}
                  >
                    {usingTemplateId === previewTemplate.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    Criar apresentação
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}