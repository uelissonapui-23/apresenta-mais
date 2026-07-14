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
    