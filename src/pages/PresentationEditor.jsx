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
  ChevronLeft,
  ChevronsDownUp,
  ChevronsUpDown,
  Clock3,
  Eye,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Save,
  ScrollText,
  Settings2,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import AutosaveIndicator from '@/components/shared/AutosaveIndicator';
import DetailLevelControl from '@/components/shared/DetailLevelControl';
import BlockTypeSelector from '@/components/editor/BlockTypeSelector';
import ViewStructure from '@/components/editor/ViewStructure';
import ViewText from '@/components/editor/ViewText';
import ViewCards from '@/components/editor/ViewCards';
import ViewScript from '@/components/editor/ViewScript';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const VIEW_OPTIONS = [
  { key: 'structure', icon: List, label: 'Estrutura' },
  { key: 'text', icon: FileText, label: 'Texto' },
  { key: 'cards', icon: LayoutGrid, label: 'Cartões' },
  { key: 'script', icon: ScrollText, label: 'Roteiro' },
];

const DEFAULT_PREFERENCES = {
  default_view_mode: 'structure',
  default_detail_level: 'normal',
};

const BLOCK_DEFAULTS = {
  title: '',
  summary: '',
  content: '',
  additional_content: '',
  presenter_notes: '',
  importance_level: 3,
  estimated_duration_seconds: 60,
  is_essential: false,
  is_hidden: false,
  is_collapsed: false,
  show_to_audience: true,
};

function normalizeParentId(value) {
  return value || null;
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, safeNumber(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) return `${remainingSeconds}s`;
  if (remainingSeconds === 0) return `${minutes} min`;
  return `${minutes}min ${remainingSeconds}s`;
}

function getDirectChildren(blocks, parentId) {
  const normalizedParent = normalizeParentId(parentId);
  return blocks
    .filter(
      (block) => normalizeParentId(block.parent_id) === normalizedParent,
    )
    .sort(
      (first, second) =>
        safeNumber(first.order_index) - safeNumber(second.order_index),
    );
}

function getDescendantIds(blocks, blockId) {
  const ids = [];
  const visit = (parentId) => {
    getDirectChildren(blocks, parentId).forEach((child) => {
      ids.push(child.id);
      visit(child.id);
    });
  };
  visit(blockId);
  return ids;
}

function buildFlatTree(blocks) {
  const ordered = [];
  const visited = new Set();

  const visit = (parentId, depth) => {
    getDirectChildren(blocks, parentId).forEach((block) => {
      if (visited.has(block.id)) return;
      visited.add(block.id);
      ordered.push({
        ...block,
        depth_level: depth,
      });
      visit(block.id, depth + 1);
    });
  };

  visit(null, 0);

  blocks
    .filter((block) => !visited.has(block.id))
    .sort(
      (first, second) =>
        safeNumber(first.order_index) - safeNumber(second.order_index),
    )
    .forEach((block) => {
      ordered.push({
        ...block,
        parent_id: null,
        depth_level: 0,
      });
    });

  return ordered;
}

function EditorLoading() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <span className="text-sm">Carregando apresentação...</span>
      </div>
    </div>
  );
}

export default function PresentationEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: userLoading } = useCurrentUser();

  const [presentation, setPresentation] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [blockTypes, setBlockTypes] = useState([]);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [viewMode, setViewMode] = useState('structure');
  const [detailLevel, setDetailLevel] = useState('normal');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteMode, setDeleteMode] = useState('move_children');

  const addParentRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadEditor = useCallback(
    async ({ silent = false } = {}) => {
      if (!id || !user?.id) return;

      if (!silent) setLoading(true);
      setLoadError('');

      try {
        const [presentationRecord, blockRows, typeRows, preferenceRows] =
          await Promise.all([
            base44.entities.Presentation.get(id),
            base44.entities.PresentationBlock.filter(
              { presentation_id: id },
              'order_index',
            ),
            base44.entities.BlockType.filter(
              { active: true },
              'order_index',
            ),
            base44.entities.UserPreference.filter({ user_id: user.id }),
          ]);

        if (!presentationRecord) {
          throw new Error('presentation_not_found');
        }

        if (presentationRecord.user_id !== user.id) {
          throw new Error('access_denied');
        }

        const preference =
          Array.isArray(preferenceRows) && preferenceRows.length > 0
            ? preferenceRows[0]
            : DEFAULT_PREFERENCES;

        const normalizedBlocks = buildFlatTree(
          Array.isArray(blockRows) ? blockRows : [],
        );

        if (!mountedRef.current) return;

        setPresentation(presentationRecord);
        setBlocks(normalizedBlocks);
        setBlockTypes(Array.isArray(typeRows) ? typeRows : []);
        setPreferences({ ...DEFAULT_PREFERENCES, ...preference });
        setViewMode(
          presentationRecord.default_view_mode ||
            preference.default_view_mode ||
            'structure',
        );
        setDetailLevel(preference.default_detail_level || 'normal');
      } catch (error) {
        console.error('Erro ao carregar editor:', error);

        if (error?.message === 'access_denied') {
          setLoadError('Você não tem permissão para editar esta apresentação.');
        } else if (error?.message === 'presentation_not_found') {
          setLoadError('Esta apresentação não foi encontrada.');
        } else {
          setLoadError('Não foi possível carregar o editor agora.');
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [id, user?.id],
  );

  useEffect(() => {
    if (!userLoading && user?.id) {
      loadEditor();
    }
  }, [loadEditor, user?.id, userLoading]);

  const orderedBlocks = useMemo(() => buildFlatTree(blocks), [blocks]);

  const totalDuration = useMemo(
    () =>
      orderedBlocks.reduce(
        (total, block) =>
          total + safeNumber(block.estimated_duration_seconds),
        0,
      ),
    [orderedBlocks],
  );

  const visibleBlockCount = useMemo(
    () => orderedBlocks.filter((block) => !block.is_hidden).length,
    [orderedBlocks],
  );

  const essentialCount = useMemo(
    () => orderedBlocks.filter((block) => block.is_essential).length,
    [orderedBlocks],
  );

  const setBlocksAndNormalize = useCallback((updater) => {
    setBlocks((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      return buildFlatTree(next);
    });
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEditor({ silent: true });
  };

  const handleUpdateBlock = useCallback(
    async (blockId, updates) => {
      if (!blockId || !updates || processing) return;

      setSaveStatus('saving');
      setBlocksAndNormalize((current) =>
        current.map((block) =>
          block.id === blockId ? { ...block, ...updates } : block,
        ),
      );

      try {
        await base44.entities.PresentationBlock.update(blockId, updates);
        setSaveStatus('saved');
      } catch (error) {
        console.error('Erro ao salvar bloco:', error);
        setSaveStatus('error');
        toast({
          title: 'Não foi possível salvar o bloco',
          description: 'Atualize a página e tente novamente.',
          variant: 'destructive',
        });
        await loadEditor({ silent: true });
      }
    },
    [loadEditor, processing, setBlocksAndNormalize, toast],
  );

  const normalizeSiblingOrder = useCallback(
    async (parentId, sourceBlocks = blocks) => {
      const siblings = getDirectChildren(sourceBlocks, parentId);
      const changes = siblings
        .map((block, index) => ({ block, order_index: index }))
        .filter(
          ({ block, order_index }) =>
            safeNumber(block.order_index) !== order_index,
        );

      if (changes.length === 0) return sourceBlocks;

      await Promise.all(
        changes.map(({ block, order_index }) =>
          base44.entities.PresentationBlock.update(block.id, { order_index }),
        ),
      );

      return sourceBlocks.map((block) => {
        const changed = changes.find((item) => item.block.id === block.id);
        return changed ? { ...block, order_index: changed.order_index } : block;
      });
    },
    [blocks],
  );

  const handleAddBlock = async (blockType, parentId = null) => {
    if (!blockType?.id || processing) return;

    setProcessing(true);
    setSaveStatus('saving');

    try {
      const normalizedParent = normalizeParentId(parentId);
      const parentBlock = normalizedParent
        ? blocks.find((block) => block.id === normalizedParent)
        : null;
      const siblings = getDirectChildren(blocks, normalizedParent);
      const orderIndex = siblings.length;

      const newBlock = await base44.entities.PresentationBlock.create({
        presentation_id: id,
        parent_id: normalizedParent,
        block_type_id: blockType.id,
        ...BLOCK_DEFAULTS,
        order_index: orderIndex,
        depth_level: parentBlock
          ? safeNumber(parentBlock.depth_level) + 1
          : 0,
      });

      setBlocksAndNormalize((current) => [...current, newBlock]);
      setSaveStatus('saved');
      setShowTypeSelector(false);
      addParentRef.current = null;

      toast({
        title: 'Bloco adicionado',
        description: parentBlock
          ? `Novo subtópico criado em “${parentBlock.title || 'bloco'}”.`
          : 'Novo bloco principal criado.',
      });
    } catch (error) {
      console.error('Erro ao criar bloco:', error);
      setSaveStatus('error');
      toast({
        title: 'Não foi possível criar o bloco',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const openDeleteDialog = (block) => {
    const hasChildren = blocks.some((item) => item.parent_id === block.id);
    setDeleteMode(hasChildren ? 'move_children' : 'delete_all');
    setDeleteTarget(block);
  };

  const handleDeleteBlock = async () => {
    if (!deleteTarget || processing) return;

    setProcessing(true);
    setSaveStatus('saving');

    try {
      const directChildren = getDirectChildren(blocks, deleteTarget.id);
      const targetParent = normalizeParentId(deleteTarget.parent_id);

      if (deleteMode === 'delete_all') {
        const descendantIds = getDescendantIds(blocks, deleteTarget.id);
        const idsToDelete = [...descendantIds.reverse(), deleteTarget.id];

        await Promise.all(
          idsToDelete.map((blockId) =>
            base44.entities.PresentationBlock.delete(blockId),
          ),
        );

        let nextBlocks = blocks.filter(
          (block) => !idsToDelete.includes(block.id),
        );
        nextBlocks = await normalizeSiblingOrder(targetParent, nextBlocks);
        setBlocksAndNormalize(nextBlocks);
      } else {
        const parentDepth = targetParent
          ? safeNumber(
              blocks.find((block) => block.id === targetParent)?.depth_level,
            )
          : -1;

        await Promise.all(
          directChildren.map((child) =>
            base44.entities.PresentationBlock.update(child.id, {
              parent_id: targetParent,
              depth_level: parentDepth + 1,
            }),
          ),
        );

        await base44.entities.PresentationBlock.delete(deleteTarget.id);

        let nextBlocks = blocks
          .filter((block) => block.id !== deleteTarget.id)
          .map((block) =>
            block.parent_id === deleteTarget.id
              ? {
                  ...block,
                  parent_id: targetParent,
                  depth_level: parentDepth + 1,
                }
              : block,
          );

        nextBlocks = await normalizeSiblingOrder(targetParent, nextBlocks);
        setBlocksAndNormalize(nextBlocks);
      }

      setSaveStatus('saved');
      setDeleteTarget(null);
      toast({ title: 'Bloco excluído' });
    } catch (error) {
      console.error('Erro ao excluir bloco:', error);
      setSaveStatus('error');
      toast({
        title: 'Não foi possível excluir o bloco',
        description: 'Nenhum conteúdo foi removido da tela sem confirmação.',
        variant: 'destructive',
      });
      await loadEditor({ silent: true });
    } finally {
      setProcessing(false);
    }
  };

  const duplicateBranch = useCallback(
    async (sourceBlockId, newParentId, titleSuffix = '') => {
      const source = blocks.find((block) => block.id === sourceBlockId);
      if (!source) return null;

      const siblings = getDirectChildren(blocks, newParentId);
      const copy = await base44.entities.PresentationBlock.create({
        presentation_id: id,
        parent_id: normalizeParentId(newParentId),
        block_type_id: source.block_type_id,
        title: `${source.title || 'Bloco'}${titleSuffix}`,
        summary: source.summary || '',
        content: source.content || '',
        additional_content: source.additional_content || '',
        presenter_notes: source.presenter_notes || '',
        order_index: siblings.length,
        depth_level: newParentId
          ? safeNumber(
              blocks.find((block) => block.id === newParentId)?.depth_level,
            ) + 1
          : 0,
        importance_level: safeNumber(source.importance_level, 3),
        estimated_duration_seconds: safeNumber(
          source.estimated_duration_seconds,
          60,
        ),
        is_essential: Boolean(source.is_essential),
        is_hidden: Boolean(source.is_hidden),
        is_collapsed: Boolean(source.is_collapsed),
        show_to_audience: source.show_to_audience !== false,
      });

      const children = getDirectChildren(blocks, sourceBlockId);
      const created = [copy];

      for (const child of children) {
        const childCreated = await duplicateBranch(child.id, copy.id, '');
        if (Array.isArray(childCreated)) created.push(...childCreated);
      }

      return created;
    },
    [blocks, id],
  );

  const handleDuplicate = async (blockId) => {
    if (processing) return;
    const source = blocks.find((block) => block.id === blockId);
    if (!source) return;

    setProcessing(true);
    setSaveStatus('saving');

    try {
      const created = await duplicateBranch(
        blockId,
        normalizeParentId(source.parent_id),
        ' (cópia)',
      );
      setBlocksAndNormalize((current) => [
        ...current,
        ...(Array.isArray(created) ? created : []),
      ]);
      setSaveStatus('saved');
      toast({ title: 'Bloco duplicado com seus subtópicos' });
    } catch (error) {
      console.error('Erro ao duplicar bloco:', error);
      setSaveStatus('error');
      toast({
        title: 'Não foi possível duplicar o bloco',
        variant: 'destructive',
      });
      await loadEditor({ silent: true });
    } finally {
      setProcessing(false);
    }
  };

  const moveBlock = async (blockId, direction) => {
    if (processing) return;
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock) return;

    const siblings = getDirectChildren(blocks, currentBlock.parent_id);
    const currentIndex = siblings.findIndex((block) => block.id === blockId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
      return;
    }

    const targetBlock = siblings[targetIndex];
    setProcessing(true);
    setSaveStatus('saving');

    try {
      await Promise.all([
        base44.entities.PresentationBlock.update(currentBlock.id, {
          order_index: targetBlock.order_index,
        }),
        base44.entities.PresentationBlock.update(targetBlock.id, {
          order_index: currentBlock.order_index,
        }),
      ]);

      setBlocksAndNormalize((current) =>
        current.map((block) => {
          if (block.id === currentBlock.id) {
            return { ...block, order_index: targetBlock.order_index };
          }
          if (block.id === targetBlock.id) {
            return { ...block, order_index: currentBlock.order_index };
          }
          return block;
        }),
      );
      setSaveStatus('saved');
    } catch (error) {
      console.error('Erro ao mover bloco:', error);
      setSaveStatus('error');
      toast({
        title: 'Não foi possível alterar a ordem',
        variant: 'destructive',
      });
      await loadEditor({ silent: true });
    } finally {
      setProcessing(false);
    }
  };

  const handleMoveUp = (blockId) => moveBlock(blockId, -1);
  const handleMoveDown = (blockId) => moveBlock(blockId, 1);

  const handleIndent = async (blockId) => {
    if (processing) return;
    const block = blocks.find((item) => item.id === blockId);
    if (!block) return;

    const siblings = getDirectChildren(blocks, block.parent_id);
    const index = siblings.findIndex((item) => item.id === blockId);
    const previousSibling = index > 0 ? siblings[index - 1] : null;
    if (!previousSibling) {
      toast({
        title: 'Não é possível aumentar o nível',
        description: 'O bloco precisa ter outro bloco imediatamente acima.',
      });
      return;
    }

    setProcessing(true);
    setSaveStatus('saving');

    try {
      const newSiblings = getDirectChildren(blocks, previousSibling.id);
      const updates = {
        parent_id: previousSibling.id,
        depth_level: safeNumber(previousSibling.depth_level) + 1,
        order_index: newSiblings.length,
      };

      await base44.entities.PresentationBlock.update(blockId, updates);
      let nextBlocks = blocks.map((item) =>
        item.id === blockId ? { ...item, ...updates } : item,
      );
      nextBlocks = await normalizeSiblingOrder(block.parent_id, nextBlocks);
      setBlocksAndNormalize(nextBlocks);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Erro ao aumentar nível:', error);
      setSaveStatus('error');
      toast({
        title: 'Não foi possível aumentar o nível',
        variant: 'destructive',
      });
      await loadEditor({ silent: true });
    } finally {
      setProcessing(false);
    }
  };

  const handleOutdent = async (blockId) => {
    if (processing) return;
    const block = blocks.find((item) => item.id === blockId);
    if (!block?.parent_id) return;

    const parent = blocks.find((item) => item.id === block.parent_id);
    if (!parent) return;

    const newParentId = normalizeParentId(parent.parent_id);
    const destinationSiblings = getDirectChildren(blocks, newParentId);
    const parentPosition = destinationSiblings.findIndex(
      (item) => item.id === parent.id,
    );
    const targetOrder = parentPosition >= 0 ? parentPosition + 1 : destinationSiblings.length;

    setProcessing(true);
    setSaveStatus('saving');

    try {
      const updates = {
        parent_id: newParentId,
        depth_level: Math.max(0, safeNumber(parent.depth_level)),
        order_index: targetOrder + 0.5,
      };

      await base44.entities.PresentationBlock.update(blockId, updates);
      let nextBlocks = blocks.map((item) =>
        item.id === blockId ? { ...item, ...updates } : item,
      );
      nextBlocks = await normalizeSiblingOrder(newParentId, nextBlocks);
      nextBlocks = await normalizeSiblingOrder(parent.id, nextBlocks);
      setBlocksAndNormalize(nextBlocks);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Erro ao diminuir nível:', error);
      setSaveStatus('error');
      toast({
        title: 'Não foi possível diminuir o nível',
        variant: 'destructive',
      });
      await loadEditor({ silent: true });
    } finally {
      setProcessing(false);
    }
  };

  const handleAddChild = (parentId) => {
    addParentRef.current = parentId;
    setShowTypeSelector(true);
  };

  const setAllCollapsed = async (isCollapsed) => {
    if (processing || blocks.length === 0) return;

    setProcessing(true);
    setSaveStatus('saving');
    setBlocksAndNormalize((current) =>
      current.map((block) => ({ ...block, is_collapsed: isCollapsed })),
    );

    try {
      await Promise.all(
        blocks.map((block) =>
          base44.entities.PresentationBlock.update(block.id, {
            is_collapsed: isCollapsed,
          }),
        ),
      );
      setSaveStatus('saved');
    } catch (error) {
      console.error('Erro ao atualizar expansão dos blocos:', error);
      setSaveStatus('error');
      toast({
        title: 'Não foi possível atualizar todos os blocos',
        variant: 'destructive',
      });
      await loadEditor({ silent: true });
    } finally {
      setProcessing(false);
    }
  };

  const handleViewModeChange = async (nextMode) => {
    setViewMode(nextMode);
    if (!presentation || presentation.default_view_mode === nextMode) return;

    try {
      await base44.entities.Presentation.update(presentation.id, {
        default_view_mode: nextMode,
      });
      setPresentation((current) => ({
        ...current,
        default_view_mode: nextMode,
      }));
    } catch (error) {
      console.error('Erro ao salvar modo de visualização:', error);
    }
  };

  if (userLoading || loading) return <EditorLoading />;

  if (loadError || !presentation) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-xl font-bold">
              Não foi possível abrir o editor
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {loadError || 'Apresentação não encontrada.'}
            </p>
            <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="outline" onClick={() => navigate('/presentations')}>
                Voltar às apresentações
              </Button>
              <Button onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] min-w-0 flex-col overflow-x-hidden">
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
            >
              <Link to="/presentations" aria-label="Voltar às apresentações">
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-sm font-semibold sm:text-base">
                  {presentation.title || 'Apresentação sem título'}
                </h1>
                <AutosaveIndicator status={saveStatus} />
              </div>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {orderedBlocks.length} blocos · {formatDuration(totalDuration)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handleRefresh}
              disabled={refreshing || processing}
              aria-label="Atualizar editor"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
            </Button>

            <Button asChild variant="ghost" size="icon" className="h-9 w-9">
              <Link
                to={`/presentations/${id}/overview`}
                aria-label="Abrir visão geral"
              >
                <Eye className="h-4 w-4" />
              </Link>
            </Button>

            <Button asChild variant="ghost" size="icon" className="h-9 w-9">
              <Link to={`/rehearsal/${id}`} aria-label="Iniciar ensaio">
                <Play className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-1 overflow-x-auto px-3 pb-2 sm:px-4">
          {VIEW_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.key}
                variant={viewMode === option.key ? 'default' : 'ghost'}
                size="sm"
                className="h-8 shrink-0 text-xs"
                onClick={() => handleViewModeChange(option.key)}
              >
                <Icon className="mr-1 h-3.5 w-3.5" />
                {option.label}
              </Button>
            );
          })}

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                  <Settings2 className="h-3.5 w-3.5" />
                  Opções
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAllCollapsed(false)}>
                  <ChevronsUpDown className="mr-2 h-4 w-4" />
                  Expandir todos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAllCollapsed(true)}>
                  <ChevronsDownUp className="mr-2 h-4 w-4" />
                  Recolher todos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={`/presentations/${id}/overview`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver visão geral
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/rehearsal/${id}`}>
                    <Play className="mr-2 h-4 w-4" />
                    Iniciar ensaio
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="overflow-x-auto px-3 pb-2 sm:px-4">
          <DetailLevelControl
            value={detailLevel}
            onChange={setDetailLevel}
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-4 sm:px-5 md:py-6">
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Card className="border-border/70">
            <CardContent className="p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Blocos
              </p>
              <p className="mt-1 text-lg font-bold">{orderedBlocks.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardContent className="p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Visíveis
              </p>
              <p className="mt-1 text-lg font-bold">{visibleBlockCount}</p>
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardContent className="p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Essenciais
              </p>
              <p className="mt-1 text-lg font-bold">{essentialCount}</p>
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardContent className="p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Duração
              </p>
              <p className="mt-1 text-lg font-bold">
                {formatDuration(totalDuration)}
              </p>
            </CardContent>
          </Card>
        </div>

        {processing && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processando alteração...
          </div>
        )}

        {orderedBlocks.length === 0 ? (
          <Card className="border-dashed">
            <EmptyState
              title="Nenhum bloco ainda"
              description="Adicione o primeiro bloco para começar a construir sua apresentação."
              actionLabel="Adicionar bloco"
              onAction={() => {
                addParentRef.current = null;
                setShowTypeSelector(true);
              }}
            />
          </Card>
        ) : (
          <div className="min-w-0">
            {viewMode === 'structure' && (
              <ViewStructure
                blocks={orderedBlocks}
                blockTypes={blockTypes}
                detailLevel={detailLevel}
                onUpdate={handleUpdateBlock}
                onDelete={openDeleteDialog}
                onDuplicate={handleDuplicate}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onIndent={handleIndent}
                onOutdent={handleOutdent}
                onAddChild={handleAddChild}
              />
            )}

            {viewMode === 'text' && (
              <ViewText blocks={orderedBlocks} detailLevel={detailLevel} />
            )}

            {viewMode === 'cards' && (
              <ViewCards
                blocks={orderedBlocks}
                blockTypes={blockTypes}
                detailLevel={detailLevel}
              />
            )}

            {viewMode === 'script' && (
              <ViewScript blocks={orderedBlocks} detailLevel={detailLevel} />
            )}
          </div>
        )}

        <div className="flex justify-center py-6">
          <Button
            variant="outline"
            className="w-full gap-2 sm:w-auto"
            onClick={() => {
              addParentRef.current = null;
              setShowTypeSelector(true);
            }}
            disabled={processing}
          >
            <Plus className="h-4 w-4" />
            Adicionar bloco
          </Button>
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{orderedBlocks.length} blocos</Badge>
          <Badge variant="outline">
            <Clock3 className="mr-1 h-3 w-3" />
            {formatDuration(totalDuration)} estimados
          </Badge>
          <Badge variant="outline">
            <Save className="mr-1 h-3 w-3" />
            Salvamento automático
          </Badge>
        </div>
      </div>

      <BlockTypeSelector
        open={showTypeSelector}
        onOpenChange={(open) => {
          setShowTypeSelector(open);
          if (!open) addParentRef.current = null;
        }}
        blockTypes={blockTypes}
        onSelect={(blockType) =>
          handleAddBlock(blockType, addParentRef.current)
        }
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !processing) setDeleteTarget(null);
        }}
        title="Excluir bloco"
        description={
          deleteTarget && blocks.some((block) => block.parent_id === deleteTarget.id)
            ? deleteMode === 'delete_all'
              ? `“${deleteTarget.title || 'Este bloco'}” e todos os seus subtópicos serão excluídos definitivamente.`
              : `“${deleteTarget.title || 'Este bloco'}” será excluído e seus subtópicos serão movidos para o nível acima.`
            : `Tem certeza que deseja excluir “${deleteTarget?.title || 'este bloco'}”?`
        }
        confirmLabel={processing ? 'Excluindo...' : 'Excluir'}
        onConfirm={handleDeleteBlock}
        variant="destructive"
      />

      {deleteTarget && blocks.some((block) => block.parent_id === deleteTarget.id) && (
        <div className="fixed inset-x-3 bottom-20 z-[70] mx-auto max-w-md rounded-xl border bg-background p-3 shadow-xl sm:bottom-6">
          <p className="text-sm font-medium">O bloco possui subtópicos</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Escolha o que deve acontecer com eles antes de confirmar a exclusão.
          </p>
          <div className="mt-3 grid gap-2">
            <Button
              type="button"
              variant={deleteMode === 'move_children' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDeleteMode('move_children')}
            >
              Excluir apenas o bloco e mover subtópicos
            </Button>
            <Button
              type="button"
              variant={deleteMode === 'delete_all' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setDeleteMode('delete_all')}
            >
              Excluir bloco e todos os subtópicos
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}