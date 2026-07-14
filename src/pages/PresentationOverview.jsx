import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  EyeOff,
  FileText,
  Layers3,
  Monitor,
  Pencil,
  Play,
  RefreshCw,
  Sparkles,
  Star,
  Target,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import EmptyState from '@/components/shared/EmptyState';

const INTRODUCTION_TERMS = [
  'introdução',
  'introducao',
  'abertura',
  'início',
  'inicio',
  'contexto',
];

const CONCLUSION_TERMS = [
  'conclusão',
  'conclusao',
  'encerramento',
  'fechamento',
  'resumo final',
  'apelo',
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function containsAnyTerm(value, terms) {
  const normalizedValue = normalizeText(value);

  return terms.some((term) => (
    normalizedValue.includes(normalizeText(term))
  ));
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampPercentage(value) {
  return Math.min(100, Math.max(0, Math.round(toNumber(value))));
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.round(toNumber(totalSeconds)));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }

  if (minutes > 0) {
    return seconds > 0
      ? `${minutes}min ${seconds}s`
      : `${minutes} min`;
  }

  return `${seconds}s`;
}

function getBlockTitle(block) {
  return block?.title?.trim() || 'Bloco sem título';
}

function getBlockHasContent(block) {
  return Boolean(
    block?.summary?.trim()
    || block?.content?.trim()
    || block?.additional_content?.trim(),
  );
}

function getOrderedTree(blocks) {
  const childrenMap = new Map();
  const knownIds = new Set(blocks.map((block) => block.id));

  blocks.forEach((block) => {
    const validParentId = (
      block.parent_id
      && knownIds.has(block.parent_id)
    )
      ? block.parent_id
      : null;

    if (!childrenMap.has(validParentId)) {
      childrenMap.set(validParentId, []);
    }

    childrenMap.get(validParentId).push(block);
  });

  childrenMap.forEach((children) => {
    children.sort((a, b) => (
      toNumber(a.order_index) - toNumber(b.order_index)
      || String(a.created_date || '').localeCompare(
        String(b.created_date || ''),
      )
    ));
  });

  const result = [];
  const visited = new Set();

  const walk = (parentId, depth) => {
    const children = childrenMap.get(parentId) || [];

    children.forEach((block) => {
      if (visited.has(block.id)) {
        return;
      }

      visited.add(block.id);

      result.push({
        ...block,
        computedDepth: depth,
      });

      walk(block.id, depth + 1);
    });
  };

  walk(null, 0);

  blocks.forEach((block) => {
    if (!visited.has(block.id)) {
      result.push({
        ...block,
        computedDepth: Math.max(
          0,
          toNumber(block.depth_level),
        ),
      });
    }
  });

  return result;
}

function OverviewLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-muted border-t-primary" />

        <span className="text-sm">
          Analisando sua apresentação...
        </span>
      </div>
    </div>
  );
}

function MetricCard({
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

function CheckRow({ check }) {
  const Icon = check.ok
    ? CheckCircle2
    : AlertTriangle;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${
          check.ok
            ? 'text-emerald-600'
            : 'text-amber-600'
        }`}
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {check.label}
        </p>

        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {check.description}
        </p>
      </div>

      <Badge
        variant={check.ok ? 'secondary' : 'outline'}
        className="shrink-0"
      >
        {check.ok ? 'Pronto' : 'Revisar'}
      </Badge>
    </div>
  );
}

function StructureRow({
  block,
  hasChildren,
  expanded,
  onToggle,
}) {
  const depth = Math.min(
    6,
    Math.max(0, block.computedDepth),
  );

  const minutes = Math.max(
    0,
    Math.round(
      toNumber(block.estimated_duration_seconds) / 60,
    ),
  );

  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 ${
        block.is_hidden
          ? 'opacity-55'
          : 'hover:bg-muted/50'
      }`}
      style={{
        paddingLeft: `${8 + depth * 16}px`,
      }}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={() => onToggle(block.id)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-muted"
          aria-label={
            expanded
              ? 'Recolher subtópicos'
              : 'Expandir subtópicos'
          }
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ) : (
        <span className="h-6 w-6 shrink-0" />
      )}

      {block.is_essential && (
        <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />
      )}

      {block.is_hidden && (
        <EyeOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}

      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          depth === 0
            ? 'font-semibold'
            : 'font-normal'
        }`}
      >
        {getBlockTitle(block)}
      </span>

      <span className="shrink-0 text-xs text-muted-foreground">
        {minutes > 0 ? `${minutes} min` : '—'}
      </span>
    </div>
  );
}

export default function PresentationOverview() {
  const { id } = useParams();
  const { toast } = useToast();

  const [presentation, setPresentation] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [expandedIds, setExpandedIds] = useState(
    () => new Set(),
  );

  const loadOverview = useCallback(
    async ({ silent = false } = {}) => {
      if (!id) {
        setError(
          'Identificador da apresentação não encontrado.',
        );
        setLoading(false);
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      setError('');

      try {
        const [
          presentationData,
          blockRows,
        ] = await Promise.all([
          base44.entities.Presentation.get(id),

          base44.entities.PresentationBlock.filter(
            {
              presentation_id: id,
            },
            'order_index',
          ),
        ]);

        setPresentation(presentationData || null);

        setBlocks(
          Array.isArray(blockRows)
            ? blockRows
            : [],
        );

        const parentIds = new Set(
          (
            Array.isArray(blockRows)
              ? blockRows
              : []
          )
            .filter((block) => block.parent_id)
            .map((block) => block.parent_id),
        );

        setExpandedIds(parentIds);
      } catch (loadError) {
        console.error(
          'Erro ao carregar visão geral:',
          loadError,
        );

        setError(
          'Não foi possível carregar a visão geral desta apresentação.',
        );

        toast({
          title: 'Falha ao carregar apresentação',
          description: 'Confira sua conexão e tente novamente.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      id,
      toast,
    ],
  );

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const orderedBlocks = useMemo(
    () => getOrderedTree(blocks),
    [blocks],
  );

  const childrenMap = useMemo(() => {
    const map = new Map();

    blocks.forEach((block) => {
      const parentId = block.parent_id || null;

      if (!map.has(parentId)) {
        map.set(parentId, []);
      }

      map.get(parentId).push(block);
    });

    return map;
  }, [blocks]);

  const visibleStructure = useMemo(() => {
    const collapsedParents = new Set(
      [...childrenMap.keys()].filter(
        (parentId) => (
          parentId
          && !expandedIds.has(parentId)
        ),
      ),
    );

    return orderedBlocks.filter((block) => {
      let currentParentId = block.parent_id;
      const visited = new Set();

      while (currentParentId) {
        if (visited.has(currentParentId)) {
          break;
        }

        visited.add(currentParentId);

        if (collapsedParents.has(currentParentId)) {
          return false;
        }

        const parent = blocks.find(
          (item) => item.id === currentParentId,
        );

        currentParentId = parent?.parent_id || null;
      }

      return true;
    });
  }, [
    blocks,
    childrenMap,
    expandedIds,
    orderedBlocks,
  ]);

  const metrics = useMemo(() => {
    const visibleBlocks = blocks.filter(
      (block) => !block.is_hidden,
    );

    const rootBlocks = visibleBlocks.filter(
      (block) => !block.parent_id,
    );

    const childBlocks = visibleBlocks.filter(
      (block) => block.parent_id,
    );

    const essentialBlocks = visibleBlocks.filter(
      (block) => block.is_essential,
    );

    const optionalBlocks = visibleBlocks.filter(
      (block) => !block.is_essential,
    );

    const emptyBlocks = visibleBlocks.filter(
      (block) => !getBlockHasContent(block),
    );

    const untitledBlocks = visibleBlocks.filter(
      (block) => !block.title?.trim(),
    );

    const totalSeconds = visibleBlocks.reduce(
      (sum, block) => (
        sum
        + Math.max(
          0,
          toNumber(block.estimated_duration_seconds),
        )
      ),
      0,
    );
        const plannedSeconds = Math.max(
      0,
      toNumber(
        presentation?.estimated_duration_minutes,
      ) * 60,
    );

    const timeDifferenceSeconds = (
      totalSeconds - plannedSeconds
    );

    const introductionExists = visibleBlocks.some(
      (block) => containsAnyTerm(
        [
          block.title,
          block.summary,
        ].filter(Boolean).join(' '),
        INTRODUCTION_TERMS,
      ),
    );

    const conclusionExists = visibleBlocks.some(
      (block) => containsAnyTerm(
        [
          block.title,
          block.summary,
        ].filter(Boolean).join(' '),
        CONCLUSION_TERMS,
      ),
    );

    const developmentExists = rootBlocks.length >= 2;

    const mainMessageExists = Boolean(
      presentation?.main_message?.trim(),
    );

    const objectiveExists = Boolean(
      presentation?.objective_id,
    );

    const timeIsBalanced = (
      plannedSeconds <= 0
      || totalSeconds <= plannedSeconds * 1.1
    );

    const hasEnoughContent = visibleBlocks.length >= 3;

    const checks = [
      {
        key: 'introduction',
        label: 'Introdução ou abertura',
        description: introductionExists
          ? 'A apresentação possui uma abertura identificável.'
          : 'Adicione uma introdução para preparar o público e apresentar o tema.',
        ok: introductionExists,
        weight: 15,
      },
      {
        key: 'development',
        label: 'Desenvolvimento',
        description: developmentExists
          ? 'Existem pontos principais suficientes para desenvolver a mensagem.'
          : 'Adicione pelo menos dois pontos principais para desenvolver o assunto.',
        ok: developmentExists,
        weight: 15,
      },
      {
        key: 'conclusion',
        label: 'Conclusão ou encerramento',
        description: conclusionExists
          ? 'A apresentação possui um encerramento identificável.'
          : 'Adicione uma conclusão para reforçar a mensagem principal.',
        ok: conclusionExists,
        weight: 15,
      },
      {
        key: 'message',
        label: 'Mensagem principal',
        description: mainMessageExists
          ? 'A ideia central está definida.'
          : 'Defina claramente o que o público deve compreender ao final.',
        ok: mainMessageExists,
        weight: 15,
      },
      {
        key: 'objective',
        label: 'Objetivo',
        description: objectiveExists
          ? 'O objetivo da apresentação foi selecionado.'
          : 'Escolha o resultado que você deseja alcançar com a apresentação.',
        ok: objectiveExists,
        weight: 10,
      },
      {
        key: 'content',
        label: 'Conteúdo suficiente',
        description: hasEnoughContent
          ? 'A estrutura possui uma quantidade adequada de blocos.'
          : 'A apresentação ainda possui poucos tópicos para formar uma estrutura completa.',
        ok: hasEnoughContent,
        weight: 10,
      },
      {
        key: 'time',
        label: 'Tempo planejado',
        description: timeIsBalanced
          ? 'O conteúdo está dentro ou próximo da duração planejada.'
          : `O conteúdo ultrapassa o tempo planejado em ${formatDuration(
              Math.max(0, timeDifferenceSeconds),
            )}.`,
        ok: timeIsBalanced,
        weight: 10,
      },
      {
        key: 'complete-blocks',
        label: 'Blocos preenchidos',
        description: emptyBlocks.length === 0
          ? 'Todos os blocos visíveis possuem algum conteúdo.'
          : `${emptyBlocks.length} bloco(s) ainda estão sem resumo ou conteúdo.`,
        ok: emptyBlocks.length === 0,
        weight: 10,
      },
    ];

    const readiness = clampPercentage(
      checks.reduce(
        (total, check) => (
          total + (check.ok ? check.weight : 0)
        ),
        0,
      ),
    );

    return {
      visibleBlocks,
      rootBlocks,
      childBlocks,
      essentialBlocks,
      optionalBlocks,
      emptyBlocks,
      untitledBlocks,
      totalSeconds,
      plannedSeconds,
      timeDifferenceSeconds,
      checks,
      readiness,
      introductionExists,
      conclusionExists,
      developmentExists,
      mainMessageExists,
      objectiveExists,
      timeIsBalanced,
    };
  }, [
    blocks,
    presentation?.estimated_duration_minutes,
    presentation?.main_message,
    presentation?.objective_id,
  ]);

  const warnings = useMemo(() => {
    const items = [];

    if (metrics.untitledBlocks.length > 0) {
      items.push({
        title: 'Existem blocos sem título',
        description: `${metrics.untitledBlocks.length} bloco(s) precisam receber um título para facilitar a navegação.`,
      });
    }

    if (metrics.emptyBlocks.length > 0) {
      items.push({
        title: 'Existem blocos sem conteúdo',
        description: `${metrics.emptyBlocks.length} bloco(s) ainda não possuem resumo, texto ou conteúdo adicional.`,
      });
    }

    if (
      metrics.plannedSeconds > 0
      && metrics.timeDifferenceSeconds > 0
    ) {
      items.push({
        title: 'A apresentação ultrapassa o tempo planejado',
        description: `Reduza aproximadamente ${formatDuration(
          metrics.timeDifferenceSeconds,
        )} ou aumente a duração planejada.`,
      });
    }

    if (metrics.rootBlocks.length > 10) {
      items.push({
        title: 'Muitos tópicos principais',
        description: 'Considere agrupar alguns pontos como subtópicos para tornar a sequência mais fácil de acompanhar.',
      });
    }

    if (metrics.visibleBlocks.length > 0 && metrics.essentialBlocks.length === 0) {
      items.push({
        title: 'Nenhum bloco foi marcado como essencial',
        description: 'Marcar os pontos indispensáveis ajudará a criar versões mais curtas da apresentação.',
      });
    }

    return items;
  }, [metrics]);

  const readinessLabel = useMemo(() => {
    if (metrics.readiness >= 90) {
      return {
        text: 'Pronta para apresentar',
        className: 'text-emerald-600',
      };
    }

    if (metrics.readiness >= 70) {
      return {
        text: 'Quase pronta',
        className: 'text-blue-600',
      };
    }

    if (metrics.readiness >= 40) {
      return {
        text: 'Em desenvolvimento',
        className: 'text-amber-600',
      };
    }

    return {
      text: 'Estrutura inicial',
      className: 'text-rose-600',
    };
  }, [metrics.readiness]);

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadOverview({
      silent: true,
    });
  };

  const handleToggleExpanded = (blockId) => {
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }

      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedIds(
      new Set(
        blocks
          .filter((block) => (
            childrenMap.has(block.id)
          ))
          .map((block) => block.id),
      ),
    );
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  if (loading) {
    return <OverviewLoading />;
  }

  if (error || !presentation) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-2xl items-center px-4 py-10">
        <Card className="w-full">
          <CardContent className="p-6 text-center sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>

            <h1 className="mt-5 text-xl font-bold">
              Não foi possível abrir a apresentação
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {error || 'A apresentação não foi encontrada.'}
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                asChild
                variant="outline"
              >
                <Link to="/presentations">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Link>
              </Button>

              <Button onClick={handleRefresh}>
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
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-3 mb-2"
          >
            <Link to="/presentations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Minhas apresentações
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              Visão geral
            </Badge>

            {presentation.status && (
              <Badge variant="outline">
                {presentation.status === 'draft' && 'Rascunho'}
                {presentation.status === 'ready' && 'Pronta'}
                {presentation.status === 'in_progress' && 'Em andamento'}
                {presentation.status === 'completed' && 'Concluída'}
                {presentation.status === 'archived' && 'Arquivada'}
              </Badge>
            )}
          </div>

          <h1 className="mt-3 break-words text-2xl font-bold sm:text-3xl">
            {presentation.title || 'Apresentação sem título'}
          </h1>

          {presentation.subtitle && (
            <p className="mt-1 break-words text-sm text-muted-foreground sm:text-base">
              {presentation.subtitle}
            </p>
          )}

          {presentation.main_message && (
            <div className="mt-4 flex max-w-3xl items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

              <p className="text-sm leading-relaxed">
                <span className="font-medium">
                  Mensagem principal:
                </span>{' '}
                {presentation.main_message}
              </p>
            </div>
          )}
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap xl:justify-end">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />
            Atualizar
          </Button>

          <Button
            asChild
            variant="outline"
          >
            <Link to={`/presentation-editor/${presentation.id}`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
          >
            <Link to={`/rehearsal/${presentation.id}`}>
              <Play className="mr-2 h-4 w-4" />
              Ensaiar
            </Link>
          </Button>

          <Button asChild>
            <Link to={`/present/${presentation.id}`}>
              <Monitor className="mr-2 h-4 w-4" />
              Apresentar
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          icon={Layers3}
          label="Pontos principais"
          value={metrics.rootBlocks.length}
          description={`${metrics.childBlocks.length} subtópico(s)`}
        />

        <MetricCard
          icon={Clock3}
          label="Duração calculada"
          value={formatDuration(metrics.totalSeconds)}
          description={
            metrics.plannedSeconds > 0
              ? `Planejado: ${formatDuration(metrics.plannedSeconds)}`
              : 'Tempo planejado não definido'
          }
        />

        <MetricCard
          icon={Star}
          label="Essenciais"
          value={metrics.essentialBlocks.length}
          description={`${metrics.optionalBlocks.length} complementar(es)`}
        />

        <MetricCard
          icon={EyeOff}
          label="Ocultos"
          value={blocks.filter((block) => block.is_hidden).length}
          description={`${metrics.visibleBlocks.length} visível(is)`}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card className="overflow-hidden border-border/70">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Índice de preparação
                  </CardTitle>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Avaliação baseada na estrutura, conteúdo e duração.
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-3xl font-bold">
                    {metrics.readiness}%
                  </p>

                  <p className={`text-sm font-medium ${readinessLabel.className}`}>
                    {readinessLabel.text}
                  </p>
                </div>
              </div>

              <Progress
                value={metrics.readiness}
                className="mt-4 h-3"
              />
            </CardHeader>

            <CardContent className="grid gap-3 md:grid-cols-2">
              {metrics.checks.map((check) => (
                <CheckRow
                  key={check.key}
                  check={check}
                />
              ))}
            </CardContent>
          </Card>

          {warnings.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Pontos de atenção
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {warnings.map((warning) => (
                  <Alert
                    key={warning.title}
                    className="bg-background/70"
                  >
                    <AlertTriangle className="h-4 w-4" />

                    <AlertTitle>
                      {warning.title}
                    </AlertTitle>

                    <AlertDescription>
                      {warning.description}
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="border-border/70">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Estrutura da apresentação
                  </CardTitle>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Visualize a sequência antes de ensaiar ou apresentar.
                  </p>
                </div>

                {blocks.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExpandAll}
                    >
                      Expandir
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCollapseAll}
                    >
                      Recolher
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {blocks.length === 0 ? (
                <EmptyState
                  icon={Layers3}
                  title="Nenhum tópico foi criado"
                  description="Abra o editor e adicione introdução, pontos principais e conclusão."
                  actionLabel="Abrir editor"
                  onAction={() => {
                    window.location.href = `/presentation-editor/${presentation.id}`;
                  }}
                />
              ) : (
                <div className="rounded-xl border border-border/70 p-2">
                  {visibleStructure.map((block) => {
                    const hasChildren = (
                      childrenMap.get(block.id)?.length > 0
                    );

                    return (
                      <StructureRow
                        key={block.id}
                        block={block}
                        hasChildren={hasChildren}
                        expanded={expandedIds.has(block.id)}
                        onToggle={handleToggleExpanded}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Distribuição do tempo
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    Planejado
                  </span>

                  <span className="font-medium">
                    {metrics.plannedSeconds > 0
                      ? formatDuration(metrics.plannedSeconds)
                      : 'Não definido'}
                  </span>
                </div>

                <Separator className="my-3" />

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    Calculado
                  </span>

                  <span className="font-medium">
                    {formatDuration(metrics.totalSeconds)}
                  </span>
                </div>
              </div>

              {metrics.plannedSeconds > 0 && (
                <Alert
                  className={
                    metrics.timeDifferenceSeconds <= 0
                      ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/10'
                      : 'border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/10'
                  }
                >
                  {metrics.timeDifferenceSeconds <= 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}

                  <AlertTitle>
                    {metrics.timeDifferenceSeconds <= 0
                      ? 'Dentro do tempo'
                      : 'Acima do tempo'}
                  </AlertTitle>

                  <AlertDescription>
                    {metrics.timeDifferenceSeconds <= 0
                      ? `Restam aproximadamente ${formatDuration(
                          Math.abs(metrics.timeDifferenceSeconds),
                        )}.`
                      : `Excede em aproximadamente ${formatDuration(
                          metrics.timeDifferenceSeconds,
                        )}.`}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Resumo da estrutura
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  Blocos totais
                </span>

                <span className="font-medium">
                  {blocks.length}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  Blocos visíveis
                </span>

                <span className="font-medium">
                  {metrics.visibleBlocks.length}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  Pontos principais
                </span>

                <span className="font-medium">
                  {metrics.rootBlocks.length}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  Subtópicos
                </span>

                <span className="font-medium">
                  {metrics.childBlocks.length}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  Essenciais
                </span>

                <span className="font-medium">
                  {metrics.essentialBlocks.length}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  Sem conteúdo
                </span>

                <span className={
                  metrics.emptyBlocks.length > 0
                    ? 'font-medium text-amber-600'
                    : 'font-medium'
                }>
                  {metrics.emptyBlocks.length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <h2 className="font-semibold">
                Próximo passo
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {metrics.readiness >= 70
                  ? 'Sua estrutura já está adequada para começar um ensaio.'
                  : 'Revise os pontos indicados antes de iniciar o ensaio.'}
              </p>

              <div className="mt-4 grid gap-2">
                <Button asChild>
                  <Link to={`/rehearsal/${presentation.id}`}>
                    <Play className="mr-2 h-4 w-4" />
                    Iniciar ensaio
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                >
                  <Link to={`/presentation-editor/${presentation.id}`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Continuar editando
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="ghost"
                >
                  <Link to={`/session-history/${presentation.id}`}>
                    Ver histórico
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}