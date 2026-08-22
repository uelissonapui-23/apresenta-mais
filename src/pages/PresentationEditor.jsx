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
  Sparkles,
  PanelTop,
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
  { key: 'structure', icon: List, label: 'Organizar', description: 'Monte a ordem e a hierarquia dos tópicos.' },
  { key: 'text', icon: FileText, label: 'Escrever', description: 'Concentre-se no texto corrido da apresentação.' },
  { key: 'cards', icon: LayoutGrid, label: 'Visualizar', description: 'Veja cada tópico como um cartão independente.' },
  { key: 'script', icon: ScrollText, label: 'Roteiro', description: 'Leia o fluxo como você pretende apresentar.' },
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

function uniqueById(rows) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    if (!row?.id || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
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

function getRecordTimestamp(record) {
  const value = (
    record?.updated_date
    || record?.updated_at
    || record?.created_date
    || record?.created_at
    || ''
  );

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
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

function sortDeepestFirst(blocks) {
  return [...blocks].sort((left, right) => {
    const depthDifference = (
      safeNumber(right.depth_level)
      - safeNumber(left.depth_level)
    );

    if (depthDifference !== 0) {
      return depthDifference;
    }

    return safeNumber(right.order_index) - safeNumber(left.order_index);
  });
}

function updateBranchDepth(blocks, rootId, depthDelta) {
  const descendantIds = new Set(getDescendantIds(blocks, rootId));

  return blocks.map((block) => {
    if (!descendantIds.has(block.id)) {
      return block;
    }

    return {
      ...block,
      depth_level: Math.max(
        0,
        safeNumber(block.depth_level) + depthDelta,
      ),
    };
  });
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
  const [showSummary, setShowSummary] = useState(false);

  const addParentRef = useRef(null);
  const mountedRef = useRef(true);
  const activeSaveCountRef = useRef(0);
  const operationLockRef = useRef(false);

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

        const preference = (
          selectCurrentRecord(preferenceRows)
          || DEFAULT_PREFERENCES
        );

        const normalizedBlocks = buildFlatTree(
          uniqueById(blockRows),
        );

        if (!mountedRef.current) return;

        setPresentation(presentationRecord);
        setBlocks(normalizedBlocks);
        setBlockTypes(uniqueById(typeRows));
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
    } else if (!userLoading && !user?.id) {
      setLoading(false);
      setLoadError('Entre na sua conta para editar esta apresentação.');
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
      if (!blockId || !updates || typeof updates !== 'object') return;

      activeSaveCountRef.current += 1;
      setSaveStatus('saving');
      setBlocksAndNormalize((current) =>
        current.map((block) =>
          block.id === blockId ? { ...block, ...updates } : block,
        ),
      );

      try {
        await base44.entities.PresentationBlock.update(blockId, updates);
        activeSaveCountRef.current = Math.max(0, activeSaveCountRef.current - 1);
        if (activeSaveCountRef.current === 0) setSaveStatus('saved');
      } catch (error) {
        console.error('Erro ao salvar bloco:', error);
        activeSaveCountRef.current = Math.max(0, activeSaveCountRef.current - 1);
        setSaveStatus('error');
        toast({
          title: 'Não foi possível salvar o bloco',
          description: 'Atualize a página e tente novamente.',
          variant: 'destructive',
        });
        await loadEditor({ silent: true });
      }
    },
    [loadEditor, setBlocksAndNormalize, toast],
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
    if (!blockType?.id || operationLockRef.current) return;

    operationLockRef.current = true;
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
      operationLockRef.current = false;
      setProcessing(false);
    }
  };

  const openDeleteDialog = (block) => {
    const hasChildren = blocks.some((item) => item.parent_id === block.id);
    setDeleteMode(hasChildren ? 'move_children' : 'delete_all');
    setDeleteTarget(block);
  };

  const deleteBlockRelations = useCallback(async (blockIds) => {
    const uniqueIds = [...new Set(blockIds.filter(Boolean))];

    for (const blockId of uniqueIds) {
      const [attachments, references] = await Promise.all([
        base44.entities.BlockAttachment.filter({ block_id: blockId }),
        base44.entities.BlockReference.filter({ block_id: blockId }),
      ]);

      for (const attachment of uniqueById(attachments)) {
        await base44.entities.BlockAttachment.delete(attachment.id);
      }

      for (const reference of uniqueById(references)) {
        await base44.entities.BlockReference.delete(reference.id);
      }
    }
  }, []);

  const handleDeleteBlock = async () => {
    if (!deleteTarget || operationLockRef.current) return;

    operationLockRef.current = true;
    setProcessing(true);
    setSaveStatus('saving');

    try {
      const directChildren = getDirectChildren(blocks, deleteTarget.id);
      const targetParent = normalizeParentId(deleteTarget.parent_id);

      if (deleteMode === 'delete_all') {
        const descendantIds = getDescendantIds(blocks, deleteTarget.id);
        const idsToDelete = [...descendantIds, deleteTarget.id];

        await deleteBlockRelations(idsToDelete);

        const rowsToDelete = sortDeepestFirst(
          blocks.filter((block) => idsToDelete.includes(block.id)),
        );

        for (const block of rowsToDelete) {
          await base44.entities.PresentationBlock.delete(block.id);
        }

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

        const depthDelta = (parentDepth + 1) - (
          safeNumber(deleteTarget.depth_level) + 1
        );

        for (const child of directChildren) {
          await base44.entities.PresentationBlock.update(child.id, {
            parent_id: targetParent,
            depth_level: parentDepth + 1,
          });

          const descendants = getDescendantIds(blocks, child.id)
            .map((descendantId) => blocks.find((item) => item.id === descendantId))
            .filter(Boolean);

          for (const descendant of descendants) {
            await base44.entities.PresentationBlock.update(descendant.id, {
              depth_level: Math.max(
                0,
                safeNumber(descendant.depth_level) + depthDelta,
              ),
            });
          }
        }

        await deleteBlockRelations([deleteTarget.id]);
        await base44.entities.PresentationBlock.delete(deleteTarget.id);

        let nextBlocks = blocks.filter(
          (block) => block.id !== deleteTarget.id,
        );

        for (const child of directChildren) {
          nextBlocks = nextBlocks.map((block) => {
            if (block.id === child.id) {
              return {
                ...block,
                parent_id: targetParent,
                depth_level: parentDepth + 1,
              };
            }

            return block;
          });

          nextBlocks = updateBranchDepth(nextBlocks, child.id, depthDelta);
        }

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
        description: 'O editor foi atualizado para refletir o estado real dos dados.',
        variant: 'destructive',
      });
      await loadEditor({ silent: true });
    } finally {
      operationLockRef.current = false;
      setProcessing(false);
    }
  };

  const copyBlockRelations = useCallback(async (sourceBlockId, targetBlockId) => {
    const [attachments, references] = await Promise.all([
      base44.entities.BlockAttachment.filter({ block_id: sourceBlockId }),
      base44.entities.BlockReference.filter({ block_id: sourceBlockId }),
    ]);

    for (const attachment of uniqueById(attachments)) {
      await base44.entities.BlockAttachment.create({
        block_id: targetBlockId,
        attachment_type: attachment.attachment_type || 'link',
        file_url: attachment.file_url || '',
        title: attachment.title || '',
        description: attachment.description || '',
        order_index: safeNumber(attachment.order_index),
      });
    }

    for (const reference of uniqueById(references)) {
      await base44.entities.BlockReference.create({
        block_id: targetBlockId,
        reference_type: reference.reference_type || 'Outro',
        title: reference.title || '',
        reference_text: reference.reference_text || '',
        source: reference.source || '',
        url: reference.url || '',
      });
    }
  }, []);

  const duplicateBranch = useCallback(
    async (
      sourceBlockId,
      newParentId,
      orderIndex,
      titleSuffix,
      createdBlocks,
    ) => {
      const source = blocks.find((block) => block.id === sourceBlockId);
      if (!source) {
        throw new Error('Bloco de origem não encontrado.');
      }

      const parent = newParentId
        ? createdBlocks.find((block) => block.id === newParentId)
          || blocks.find((block) => block.id === newParentId)
        : null;

      const copy = await base44.entities.PresentationBlock.create({
        presentation_id: id,
        parent_id: normalizeParentId(newParentId),
        block_type_id: source.block_type_id,
        title: `${source.title || 'Bloco'}${titleSuffix || ''}`,
        summary: source.summary || '',
        content: source.content || '',
        additional_content: source.additional_content || '',
        presenter_notes: source.presenter_notes || '',
        order_index: orderIndex,
        depth_level: parent ? safeNumber(parent.depth_level) + 1 : 0,
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

      createdBlocks.push(copy);
      await copyBlockRelations(source.id, copy.id);

      const children = getDirectChildren(blocks, sourceBlockId);

      for (let index = 0; index < children.length; index += 1) {
        await duplicateBranch(
          children[index].id,
          copy.id,
          index,
          '',
          createdBlocks,
        );
      }

      return copy;
    },
    [blocks, copyBlockRelations, id],
  );

  const handleDuplicate = async (blockId) => {
    if (operationLockRef.current) return;
    const source = blocks.find((block) => block.id === blockId);
    if (!source) return;

    operationLockRef.current = true;
    setProcessing(true);
    setSaveStatus('saving');

    const createdBlocks = [];

    try {
      const destinationSiblings = getDirectChildren(
        blocks,
        source.parent_id,
      );

      await duplicateBranch(
        blockId,
        normalizeParentId(source.parent_id),
        destinationSiblings.length,
        ' (cópia)',
        createdBlocks,
      );

      setBlocksAndNormalize((current) => [
        ...current,
        ...createdBlocks,
      ]);
      setSaveStatus('saved');
      toast({ title: 'Bloco duplicado com conteúdo, anexos e subtópicos' });
    } catch (error) {
      console.error('Erro ao duplicar bloco:', error);

      try {
        await deleteBlockRelations(
          createdBlocks.map((block) => block.id),
        );

        for (const block of sortDeepestFirst(createdBlocks)) {
          await base44.entities.PresentationBlock.delete(block.id);
        }
      } catch (rollbackError) {
        console.error(
          'Erro ao remover a duplicação incompleta:',
          rollbackError,
        );
      }

      setSaveStatus('error');
      toast({
        title: 'Não foi possível duplicar o bloco',
        description: 'A cópia incompleta foi removida sempre que possível.',
        variant: 'destructive',
      });
      await loadEditor({ silent: true });
    } finally {
      operationLockRef.current = false;
      setProcessing(false);
    }
  };

  const moveBlock = async (blockId, direction) => {
    if (operationLockRef.current) return;
    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock) return;

    const siblings = getDirectChildren(blocks, currentBlock.parent_id);
    const currentIndex = siblings.findIndex((block) => block.id === blockId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
      return;
    }

    const targetBlock = siblings[targetIndex];
    operationLockRef.current = true;
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
      operationLockRef.current = false;
      setProcessing(false);
    }
  };


  const handleDragReorder = async ({
    draggedId,
    targetId,
    sourceIndex,
    destinationIndex,
  }) => {
    if (
      operationLockRef.current
      || draggedId === targetId
    ) {
      return;
    }

    const draggedBlock = blocks.find(
      (block) => block.id === draggedId,
    );

    const targetBlock = blocks.find(
      (block) => block.id === targetId,
    );

    if (!draggedBlock || !targetBlock) {
      return;
    }

    const draggedDescendantIds = new Set(
      getDescendantIds(blocks, draggedId),
    );

    if (draggedDescendantIds.has(targetId)) {
      toast({
        title: 'Movimento inválido',
        description:
          'Um tópico não pode ser colocado dentro da própria estrutura.',
        variant: 'destructive',
      });
      return;
    }

    const oldParentId = normalizeParentId(
      draggedBlock.parent_id,
    );

    const newParentId = normalizeParentId(
      targetBlock.parent_id,
    );

    const depthDelta = (
      safeNumber(targetBlock.depth_level)
      - safeNumber(draggedBlock.depth_level)
    );

    const destinationSiblings = getDirectChildren(
      blocks,
      newParentId,
    ).filter((block) => block.id !== draggedId);

    const targetSiblingIndex = destinationSiblings.findIndex(
      (block) => block.id === targetId,
    );

    if (targetSiblingIndex < 0) {
      return;
    }

    const insertIndex = sourceIndex < destinationIndex
      ? targetSiblingIndex + 1
      : targetSiblingIndex;

    destinationSiblings.splice(
      insertIndex,
      0,
      draggedBlock,
    );

    const oldParentSiblings = oldParentId === newParentId
      ? destinationSiblings
      : getDirectChildren(blocks, oldParentId)
        .filter((block) => block.id !== draggedId);

    const descendantBlocks = [...draggedDescendantIds]
      .map((descendantId) => blocks.find(
        (block) => block.id === descendantId,
      ))
      .filter(Boolean);

    const updatedById = new Map();

    destinationSiblings.forEach((block, index) => {
      updatedById.set(block.id, {
        ...block,
        parent_id: newParentId,
        order_index: index,
        depth_level: block.id === draggedId
          ? Math.max(0, safeNumber(block.depth_level) + depthDelta)
          : block.depth_level,
      });
    });

    if (oldParentId !== newParentId) {
      oldParentSiblings.forEach((block, index) => {
        updatedById.set(block.id, {
          ...block,
          order_index: index,
        });
      });
    }

    descendantBlocks.forEach((block) => {
      updatedById.set(block.id, {
        ...block,
        depth_level: Math.max(
          0,
          safeNumber(block.depth_level) + depthDelta,
        ),
      });
    });

    operationLockRef.current = true;
    setProcessing(true);
    setSaveStatus('saving');

    try {
      const updates = [...updatedById.values()];

      for (const block of updates) {
        const original = blocks.find(
          (item) => item.id === block.id,
        );

        if (!original) {
          continue;
        }

        const payload = {};

        if (
          normalizeParentId(original.parent_id)
          !== normalizeParentId(block.parent_id)
        ) {
          payload.parent_id = normalizeParentId(
            block.parent_id,
          );
        }

        if (
          safeNumber(original.order_index)
          !== safeNumber(block.order_index)
        ) {
          payload.order_index = safeNumber(
            block.order_index,
          );
        }

        if (
          safeNumber(original.depth_level)
          !== safeNumber(block.depth_level)
        ) {
          payload.depth_level = safeNumber(
            block.depth_level,
          );
        }

        if (Object.keys(payload).length > 0) {
          await base44.entities.PresentationBlock.update(
            block.id,
            payload,
          );
        }
      }

      setBlocksAndNormalize((current) => current.map(
        (block) => updatedById.get(block.id) || block,
      ));

      setSaveStatus('saved');

      toast({
        title: 'Ordem atualizada',
        description:
          'O tópico e seus subtópicos foram reorganizados.',
      });
    } catch (error) {
      console.error(
        'Erro ao reorganizar por arrastar:',
        error,
      );

      setSaveStatus('error');

      toast({
        title: 'Não foi possível reorganizar',
        description:
          'A estrutura será recarregada sem apagar nenhum conteúdo.',
        variant: 'destructive',
      });

      await loadEditor({ silent: true });
    } finally {
      operationLockRef.current = false;
      setProcessing(false);
    }
  };

  const handleMoveUp = (blockId) => moveBlock(blockId, -1);
  const handleMoveDown = (blockId) => moveBlock(blockId, 1);

  const handleIndent = async (blockId) => {
    if (operationLockRef.current) return;
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

    operationLockRef.current = true;
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

      const descendants = getDescendantIds(blocks, blockId)
        .map((descendantId) => blocks.find((item) => item.id === descendantId))
        .filter(Boolean);

      for (const descendant of descendants) {
        await base44.entities.PresentationBlock.update(descendant.id, {
          depth_level: safeNumber(descendant.depth_level) + 1,
        });
      }

      let nextBlocks = blocks.map((item) =>
        item.id === blockId ? { ...item, ...updates } : item,
      );
      nextBlocks = updateBranchDepth(nextBlocks, blockId, 1);
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
      operationLockRef.current = false;
      setProcessing(false);
    }
  };

  const handleOutdent = async (blockId) => {
    if (operationLockRef.current) return;
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

    operationLockRef.current = true;
    setProcessing(true);
    setSaveStatus('saving');

    try {
      const updates = {
        parent_id: newParentId,
        depth_level: Math.max(0, safeNumber(parent.depth_level)),
        order_index: targetOrder + 0.5,
      };

      await base44.entities.PresentationBlock.update(blockId, updates);

      const descendants = getDescendantIds(blocks, blockId)
        .map((descendantId) => blocks.find((item) => item.id === descendantId))
        .filter(Boolean);

      for (const descendant of descendants) {
        await base44.entities.PresentationBlock.update(descendant.id, {
          depth_level: Math.max(
            0,
            safeNumber(descendant.depth_level) - 1,
          ),
        });
      }

      let nextBlocks = blocks.map((item) =>
        item.id === blockId ? { ...item, ...updates } : item,
      );
      nextBlocks = updateBranchDepth(nextBlocks, blockId, -1);
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
      operationLockRef.current = false;
      setProcessing(false);
    }
  };

  const handleAddChild = (parentId) => {
    addParentRef.current = parentId;
    setShowTypeSelector(true);
  };

  const setAllCollapsed = async (isCollapsed) => {
    if (operationLockRef.current || blocks.length === 0) return;

    operationLockRef.current = true;
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
      operationLockRef.current = false;
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
    <div className="flex min-h-[calc(100vh-4rem)] min-w-0 flex-col overflow-x-hidden bg-muted/10">
      <div className="sticky top-0 z-30 border-b border-border/80 bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex w-full max-w-7xl min-w-0 items-center justify-between gap-3 px-3 py-3 sm:px-5 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl">
              <Link to="/presentations" aria-label="Voltar às apresentações">
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-base font-bold sm:text-lg lg:text-xl">
                  {presentation.title || 'Apresentação sem título'}
                </h1>
                <AutosaveIndicator status={saveStatus} />
              </div>
              <p className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">
                Seu espaço de criação · {orderedBlocks.length} tópicos · {formatDuration(totalDuration)} estimados
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden h-10 rounded-xl md:inline-flex"
              onClick={() => setShowSummary((current) => !current)}
            >
              <PanelTop className="mr-2 h-4 w-4" />
              {showSummary ? 'Ocultar resumo' : 'Ver resumo'}
            </Button>

            <Button asChild variant="outline" size="sm" className="hidden h-10 rounded-xl sm:inline-flex">
              <Link to={`/presentations/${id}/overview`}>
                <Eye className="mr-2 h-4 w-4" />
                Prévia
              </Link>
            </Button>

            <Button asChild size="sm" className="h-10 rounded-xl px-4 shadow-sm">
              <Link to={`/rehearsal/${id}`}>
                <Play className="mr-2 h-4 w-4" />
                Ensaiar
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" aria-label="Mais opções">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleRefresh} disabled={refreshing || processing}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar editor
                </DropdownMenuItem>
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
                    Abrir prévia completa
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-3 py-5 sm:px-5 md:py-7 lg:px-8">
        <section className="mb-5 rounded-2xl border bg-background p-3 shadow-sm sm:p-4 lg:p-5">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Como você quer trabalhar agora?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Troque de modo sem perder conteúdo. Cada visão usa a mesma apresentação.
              </p>
            </div>
            <Badge variant="secondary" className="w-fit">{orderedBlocks.length} tópicos</Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {VIEW_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = viewMode === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleViewModeChange(option.key)}
                  className={`group min-w-0 rounded-xl border p-3 text-left transition-all sm:p-4 ${
                    active
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                      : 'border-border/80 bg-background hover:border-primary/40 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border bg-muted/20 p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Quanto detalhe mostrar</p>
                <p className="text-xs text-muted-foreground">Ajuste a quantidade de informação sem alterar o conteúdo salvo.</p>
              </div>
            </div>
            <DetailLevelControl value={detailLevel} onChange={setDetailLevel} />
          </div>
        </section>

        {(showSummary || false) && (
          <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Tópicos', orderedBlocks.length],
              ['Visíveis', visibleBlockCount],
              ['Essenciais', essentialCount],
              ['Duração', formatDuration(totalDuration)],
            ].map(([label, value]) => (
              <Card key={label} className="border-border/70 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-bold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <section className="min-w-0 flex-1 rounded-2xl border bg-background shadow-sm">
          <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-base font-bold">
                {VIEW_OPTIONS.find((option) => option.key === viewMode)?.label || 'Conteúdo'}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {VIEW_OPTIONS.find((option) => option.key === viewMode)?.description}
              </p>
            </div>
            <Button
              className="w-full rounded-xl sm:w-auto"
              onClick={() => {
                addParentRef.current = null;
                setShowTypeSelector(true);
              }}
              disabled={processing}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo tópico
            </Button>
          </div>

          <div className="p-3 sm:p-5 lg:p-6">
            {orderedBlocks.length > 0 && !processing && viewMode === 'structure' && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-dashed bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                <LayoutGrid className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Arraste pelo ícone de pontos para reorganizar. A ordem é salva automaticamente.</span>
              </div>
            )}

            {processing && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando sua alteração...
              </div>
            )}

            {orderedBlocks.length === 0 ? (
              <div className="py-4">
                <EmptyState
                  title="Comece pelo primeiro tópico"
                  description="Crie um tópico principal. Depois você pode adicionar subtópicos, notas e organizar tudo sem perder o que escreveu."
                  actionLabel="Criar primeiro tópico"
                  onAction={() => {
                    addParentRef.current = null;
                    setShowTypeSelector(true);
                  }}
                />
              </div>
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
                    onDragReorder={handleDragReorder}
                    dragDisabled={processing}
                  />
                )}

                {viewMode === 'text' && (
                  <ViewText blocks={orderedBlocks} detailLevel={detailLevel} onDragReorder={handleDragReorder} dragDisabled={processing} />
                )}

                {viewMode === 'cards' && (
                  <ViewCards blocks={orderedBlocks} blockTypes={blockTypes} detailLevel={detailLevel} onDragReorder={handleDragReorder} dragDisabled={processing} />
                )}

                {viewMode === 'script' && (
                  <ViewScript blocks={orderedBlocks} detailLevel={detailLevel} onDragReorder={handleDragReorder} dragDisabled={processing} />
                )}
              </div>
            )}
          </div>

          {orderedBlocks.length > 0 && (
            <div className="border-t px-4 py-4 sm:px-5">
              <Button
                variant="outline"
                className="w-full gap-2 rounded-xl sm:w-auto"
                onClick={() => {
                  addParentRef.current = null;
                  setShowTypeSelector(true);
                }}
                disabled={processing}
              >
                <Plus className="h-4 w-4" />
                Adicionar outro tópico
              </Button>
            </div>
          )}
        </section>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{orderedBlocks.length} tópicos</Badge>
          <Badge variant="outline"><Clock3 className="mr-1 h-3 w-3" />{formatDuration(totalDuration)} estimados</Badge>
          <Badge variant="outline"><Save className="mr-1 h-3 w-3" />Salvamento automático</Badge>
        </div>
      </main>

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