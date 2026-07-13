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
    return seconds > 0 ? `${minutes}min ${seconds}s` : `${minutes} min`;
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
    const validParentId = block.parent_id && knownIds.has(block.parent_id)
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
      || String(a.created_date || '').localeCompare(String(b.created_date || ''))
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
        computedDepth: Math.max(0, toNumber(block.depth_level)),
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
        <span className="text-sm">Analisando sua apresentação...</span>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, description }) {
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
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
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
  const Icon = check.ok ? CheckCircle2 : AlertTriangle;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${
          check.ok ? 'text-emerald-600' : 'text-amber-600'
        }`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{check.label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {check.description}
        </p>
      </div>
      <Badge variant={check.ok ? 'secondary' : 'outline'} className="shrink-0">
        {check.ok ? 'Pronto' : 'Revisar'}
      </Badge>
    </div>
  );
}

function StructureRow({ block, hasChildren, expanded, onToggle }) {
  const depth = Math.min(6, Math.max(0, block.computedDepth));
  const minutes = Math.max(0, Math.round(toNumber(block.estimated_duration_seconds) / 60));

  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 ${
        block.is_hidden ? 'opacity-55' : 'hover:bg-muted/50'
      }`}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={() => onToggle(block.id)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-muted"
          aria-label={expanded ? 'Recolher subtópicos' : 'Expandir subtópicos'}
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
          depth === 0 ? 'font-semibold' : 'font-normal'
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
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const loadOverview = useCallback(async ({ silent = false } = {}) => {
    if (!id) {
      setError('Identificador da apresentação não encontrado.');
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    setError('');

    try {
      const [presentationData, blockRows] = await Promise.all([
        base44.entities.Presentation.get(id),
        base44.entities.PresentationBlock.filter(
          { presentation_id: id },
          'order_index',
        ),
      ]);

      setPresentation(presentationData || null);
      setBlocks(Array.isArray(blockRows) ? blockRows : []);

      const parentIds = new Set(
        (Array.isArray(blockRows) ? blockRows : [])
          .filter((block) => block.parent_id)
          .map((block) => block.parent_id),
      );
      setExpandedIds(parentIds);
    } catch (loadError) {
      console.error('Erro ao carregar visão geral:', loadError);
      setError('Não foi possível carregar a visão geral desta apresentação.');
      toast({
        title: 'Falha ao carregar apresentação',
        description: 'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, toast]);

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
      [...childrenMap.keys()].filter((parentId) => (
        parentId && !expandedIds.has(parentId)
      )),
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

        const parent = blocks.find((item) => item.id === currentParentId);
        currentParentId = parent?.parent_id || null;
      }

      return true;
    });
  }, [blocks, childrenMap, expandedIds, orderedBlocks]);

  const metrics = useMemo(() => {
    const visibleBlocks = blocks.filter((block) => !block.is_hidden);
    const rootBlocks = visibleBlocks.filter((block) => !block.parent_id);
    const childBlocks = visibleBlocks.filter((block) => block.parent_id);
    const essentialBlocks = visibleBlocks.filter((block) => block.is_essential);
    const optionalBlocks = visibleBlocks.filter((block) => !block.is_essential);
    const emptyBlocks = visibleBlocks.filter((block) => !getBlockHasContent(block));
    const untitledBlocks = visibleBlocks.filter((block) => !block.title?.trim());
    const totalSeconds = visibleBlocks.reduce(
      (sum, block) => sum + Math.max(0, toNumber(block.estimated_duration_seconds)),
      0,
    );
    const plannedSeconds = Math.max(
      0,
      toNumber(presentation?.estimated_duration_minutes) * 60,
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
    };
  }, [blocks, presentation?.estimated_duration_minutes]);

  const checks = useMemo(() => {
    const hasIntroduction = metrics.visibleBlocks.some((block) => (
      containsAnyTerm(block.title, INTRODUCTION_TERMS)
      || containsAnyTerm(block.summary, INTRODUCTION_TERMS)
    ));

    const hasConclusion = metrics.visibleBlocks.some((block) => (
      containsAnyTerm(block.title, CONCLUSION_TERMS)
      || containsAnyTerm(block.summary, CONCLUSION_TERMS)
    ));

    const hasDevelopment = metrics.rootBlocks.length >= 2
      || metrics.childBlocks.length >= 2;

    const hasObjective = Boolean(
      presentation?.objective_id
      || presentation?.main_message?.trim(),
    );

    const timeFits = metrics.plannedSeconds <= 0
      || metrics.totalSeconds <= metrics.plannedSeconds;

    const hasContent = metrics.emptyBlocks.length === 0;
    const hasTitles = metrics.untitledBlocks.length === 0;
    const manageableRootCount = metrics.rootBlocks.length <= 8;

    return [
      {
        key: 'introduction',
        label: 'Abertura ou introdução identificada',
        description: hasIntroduction
          ? 'Existe um bloco que prepara o público para o assunto.'
          : 'Adicione uma introdução, pergunta, história ou contexto inicial.',
        ok: hasIntroduction,
      },
      {
        key: 'development',
        label: 'Desenvolvimento estruturado',
        description: hasDevelopment
          ? 'A apresentação possui pontos suficientes para desenvolver a mensagem.'
          : 'Crie pelo menos dois pontos para desenvolver o assunto com clareza.',
        ok: hasDevelopment,
      },
      {
        key: 'conclusion',
        label: 'Conclusão ou encerramento identificado',
        description: hasConclusion
          ? 'Existe um bloco para resumir ou finalizar a apresentação.'
          : 'Adicione conclusão, resumo final, chamada para ação ou apelo.',
        ok: hasConclusion,
      },
      {
        key: 'objective',
        label: 'Objetivo ou mensagem principal definido',
        description: hasObjective
          ? 'O propósito da apresentação está registrado.'
          : 'Defina o objetivo ou a mensagem principal antes de apresentar.',
        ok: hasObjective,
      },
      {
        key: 'time',
        label: 'Conteúdo dentro do tempo planejado',
        description: timeFits
          ? 'A soma do tempo dos blocos cabe na duração planejada.'
          : `O conteúdo excede o planejado em ${formatDuration(
              metrics.totalSeconds - metrics.plannedSeconds,
            )}.`,
        ok: timeFits,
      },
      {
        key: 'content',
        label: 'Blocos visíveis possuem conteúdo',
        description: hasContent
          ? 'Todos os blocos visíveis possuem resumo ou conteúdo.'
          : `${metrics.emptyBlocks.length} bloco(s) ainda precisam de conteúdo.`,
        ok: hasContent,
      },
      {
        key: 'titles',
        label: 'Blocos possuem títulos claros',
        description: hasTitles
          ? 'Todos os blocos visíveis possuem títulos.'
          : `${metrics.untitledBlocks.length} bloco(s) estão sem título.`,
        ok: hasTitles,
      },
      {
        key: 'root-count',
        label: 'Quantidade de pontos principais equilibrada',
        description: manageableRootCount
          ? 'A quantidade de pontos principais está fácil de acompanhar.'
          : 'Considere agrupar pontos principais para não sobrecarregar o público.',
        ok: manageableRootCount,
      },
    ];
  }, [metrics, presentation?.main_message, presentation?.objective_id]);

  const readiness = useMemo(() => {
    if (checks.length === 0) {
      return 0;
    }

    const passed = checks.filter((check) => check.ok).length;
    return clampPercentage((passed / checks.length) * 100);
  }, [checks]);

  const timeUsagePercentage = useMemo(() => {
    if (metrics.plannedSeconds <= 0) {
      return 0;
    }

    return clampPercentage(
      (metrics.totalSeconds / metrics.plannedSeconds) * 100,
    );
  }, [metrics.plannedSeconds, metrics.totalSeconds]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOverview({ silent: true });
  };

  const toggleExpanded = (blockId) => {
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

  if (loading) {
    return <OverviewLoading />;
  }

  if (!presentation) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          icon={FileText}
          title="Apresentação não encontrada"
          description="Ela pode ter sido removida ou você pode não ter permissão para acessá-la."
          actionLabel="Voltar para apresentações"
          onAction={() => {
            window.location.href = '/presentations';
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <Button asChild variant="ghost" size="icon" className="mt-0.5 shrink-0">
            <Link to={`/presentations/${id}/editor`} aria-label="Voltar ao editor">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Visão geral</Badge>
              {presentation.status && (
                <Badge variant="secondary">{presentation.status}</Badge>
              )}
            </div>
            <h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">
              {presentation.title || 'Apresentação sem título'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Revise a estrutura, o tempo e os pontos importantes antes de começar.
            </p>
          </div>
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

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Não foi possível atualizar os dados</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardContent className="p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Preparação geral</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Este índice considera estrutura, objetivo, conteúdo, tempo e conclusão.
              </p>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">Nível de preparação</span>
                  <span className="font-semibold">{readiness}%</span>
                </div>
                <Progress value={readiness} className="h-3" />
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
              <p className="text-sm font-medium">Recomendação</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {readiness >= 90
                  ? 'A apresentação está pronta para ensaio ou apresentação.'
                  : readiness >= 65
                    ? 'A estrutura está boa, mas ainda existem alguns pontos para revisar.'
                    : 'Revise os itens marcados antes de iniciar uma sessão.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo da apresentação">
        <MetricCard
          icon={Layers3}
          label="Pontos principais"
          value={metrics.rootBlocks.length}
          description={`${metrics.childBlocks.length} subtópico(s)`}
        />
        <MetricCard
          icon={FileText}
          label="Blocos visíveis"
          value={metrics.visibleBlocks.length}
          description={`${blocks.length - metrics.visibleBlocks.length} oculto(s)`}
        />
        <MetricCard
          icon={Clock3}
          label="Tempo estimado"
          value={formatDuration(metrics.totalSeconds)}
          description={metrics.plannedSeconds > 0
            ? `Planejado: ${formatDuration(metrics.plannedSeconds)}`
            : 'Sem limite definido'}
        />
        <MetricCard
          icon={Star}
          label="Essenciais"
          value={metrics.essentialBlocks.length}
          description={`${metrics.optionalBlocks.length} complementar(es)`}
        />
      </section>

      {metrics.plannedSeconds > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="h-4 w-4" />
              Uso do tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>{formatDuration(metrics.totalSeconds)} utilizados</span>
              <span>{formatDuration(metrics.plannedSeconds)} planejados</span>
            </div>
            <Progress value={timeUsagePercentage} className="h-2.5" />
            <p className="mt-2 text-xs text-muted-foreground">
              {metrics.totalSeconds <= metrics.plannedSeconds
                ? `Restam aproximadamente ${formatDuration(
                    metrics.plannedSeconds - metrics.totalSeconds,
                  )}.`
                : `Reduza aproximadamente ${formatDuration(
                    metrics.totalSeconds - metrics.plannedSeconds,
                  )} para caber no tempo.`}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Verificações antes de apresentar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {checks.map((check) => (
              <CheckRow key={check.key} check={check} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers3 className="h-4 w-4" />
              Estrutura da apresentação
            </CardTitle>
            <Badge variant="outline">{metrics.visibleBlocks.length} visíveis</Badge>
          </CardHeader>
          <CardContent>
            {blocks.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center">
                <p className="text-sm font-medium">Nenhum bloco foi criado</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Abra o editor e adicione a introdução, os pontos principais e a conclusão.
                </p>
                <Button asChild size="sm" className="mt-4">
                  <Link to={`/presentations/${id}/editor`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Abrir editor
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="max-h-[520px] overflow-y-auto pr-1">
                {visibleStructure.map((block, index) => (
                  <React.Fragment key={block.id}>
                    <StructureRow
                      block={block}
                      hasChildren={(childrenMap.get(block.id) || []).length > 0}
                      expanded={expandedIds.has(block.id)}
                      onToggle={toggleExpanded}
                    />
                    {index < visibleStructure.length - 1 && block.computedDepth === 0 && (
                      <Separator className="my-1" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="sticky bottom-3 z-20 border-border/80 bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <CardContent className="grid gap-3 p-3 sm:grid-cols-3">
          <Button asChild variant="outline" className="w-full">
            <Link to={`/presentations/${id}/editor`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar conteúdo
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link to={`/rehearsal/${id}`}>
              <Play className="mr-2 h-4 w-4" />
              Ensaiar
            </Link>
          </Button>

          <Button asChild className="w-full">
            <Link to={`/present/${id}`}>
              <Monitor className="mr-2 h-4 w-4" />
              Apresentar
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}