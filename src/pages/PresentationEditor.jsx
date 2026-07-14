import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, List, FileText, LayoutGrid, ScrollText, Play, Eye, ChevronLeft, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

const views = [
  { key: 'structure', icon: List, label: 'Estrutura' },
  { key: 'text', icon: FileText, label: 'Texto' },
  { key: 'cards', icon: LayoutGrid, label: 'Cartões' },
  { key: 'script', icon: ScrollText, label: 'Roteiro' },
];

export default function PresentationEditor() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [presentation, setPresentation] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [blockTypes, setBlockTypes] = useState([]);
  const [viewMode, setViewMode] = useState('structure');
  const [detailLevel, setDetailLevel] = useState('normal');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [loading, setLoading] = useState(true);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const addParentRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, b, bt] = await Promise.all([
          base44.entities.Presentation.get(id),
          base44.entities.PresentationBlock.filter({ presentation_id: id }, 'order_index'),
          base44.entities.BlockType.filter({ active: true }, 'order_index'),
        ]);
        setPresentation(p);
        setBlocks(b);
        setBlockTypes(bt);

        // Apply user preferences as fallback
        if (user?.id) {
          try {
            const prefs = await base44.entities.UserPreference.filter({ user_id: user.id });
            const pref = Array.isArray(prefs) && prefs.length > 0 ? prefs[0] : null;
            if (pref) {
              setViewMode(p.default_view_mode || pref.default_view_mode || 'structure');
              setDetailLevel(pref.default_detail_level || 'normal');
            } else {
              setViewMode(p.default_view_mode || 'structure');
            }
          } catch {
            setViewMode(p.default_view_mode || 'structure');
          }
        } else {
          setViewMode(p.default_view_mode || 'structure');
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [id, user]);

  const handleUpdateBlock = useCallback(async (blockId, updates) => {
    setSaveStatus('saving');
    try {
      await base44.entities.PresentationBlock.update(blockId, updates);
      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, ...updates } : b));
      setSaveStatus('saved');
    } catch (e) {
      setSaveStatus('error');
    }
  }, []);

  const handleAddBlock = async (blockType, parentId = null) => {
    setSaveStatus('saving');
    const parentBlock = parentId ? blocks.find(b => b.id === parentId) : null;
    const depth = parentBlock ? parentBlock.depth_level + 1 : 0;
    const siblings = blocks.filter(b => b.parent_id === parentId);
    const orderIndex = siblings.length > 0 ? Math.max(...siblings.map(s => s.order_index)) + 1 : blocks.length;

    const newBlock = await base44.entities.PresentationBlock.create({
      presentation_id: id,
      parent_id: parentId || null,
      block_type_id: blockType.id,
      title: '',
      summary: '',
      content: '',
      additional_content: '',
      presenter_notes: '',
      order_index: orderIndex,
      depth_level: depth,
      importance_level: 3,
      estimated_duration_seconds: 60,
      is_essential: false,
      is_hidden: false,
      is_collapsed: false,
      show_to_audience: true,
    });
    setBlocks(prev => [...prev, newBlock]);
    setSaveStatus('saved');
  };

  const handleDeleteBlock = async () => {
    if (!deleteTarget) return;
    const hasChildren = blocks.some(b => b.parent_id === deleteTarget.id);
    await base44.entities.PresentationBlock.delete(deleteTarget.id);
    if (hasChildren) {
      const children = blocks.filter(b => b.parent_id === deleteTarget.id);
      for (const child of children) {
        await base44.entities.PresentationBlock.update(child.id, { parent_id: deleteTarget.parent_id, depth_level: Math.max(0, child.depth_level - 1) });
      }
      setBlocks(prev => prev.filter(b => b.id !== deleteTarget.id).map(b =>
        b.parent_id === deleteTarget.id ? { ...b, parent_id: deleteTarget.parent_id, depth_level: Math.max(0, b.depth_level - 1) } : b
      ));
    } else {
      setBlocks(prev => prev.filter(b => b.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
    toast({ title: 'Bloco excluído' });
  };

  const handleDuplicate = async (blockId) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const newBlock = await base44.entities.PresentationBlock.create({
      ...block, id: undefined, created_date: undefined, updated_date: undefined, created_by_id: undefined,
      title: `${block.title} (cópia)`,
      order_index: block.order_index + 0.5,
    });
    setBlocks(prev => [...prev, newBlock].sort((a, b) => a.order_index - b.order_index));
  };

  const handleMoveUp = async (blockId) => {
    const currentBlock = blocks.find(b => b.id === blockId);
    if (!currentBlock) return;
    const sorted = blocks
      .filter(b => (b.parent_id || null) === (currentBlock.parent_id || null))
      .sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex(b => b.id === blockId);
    if (idx <= 0) return;
    const current = sorted[idx];
    const prev = sorted[idx - 1];
    await Promise.all([
      base44.entities.PresentationBlock.update(current.id, { order_index: prev.order_index }),
      base44.entities.PresentationBlock.update(prev.id, { order_index: current.order_index }),
    ]);
    setBlocks(prev => prev.map(b => {
      if (b.id === current.id) return { ...b, order_index: prev.order_index };
      if (b.id === prev.id) return { ...b, order_index: current.order_index };
      return b;
    }));
  };

  const handleMoveDown = async (blockId) => {
    const currentBlock = blocks.find(b => b.id === blockId);
    if (!currentBlock) return;
    const sorted = blocks
      .filter(b => (b.parent_id || null) === (currentBlock.parent_id || null))
      .sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex(b => b.id === blockId);
    if (idx >= sorted.length - 1) return;
    const current = sorted[idx];
    const next = sorted[idx + 1];
    await Promise.all([
      base44.entities.PresentationBlock.update(current.id, { order_index: next.order_index }),
      base44.entities.PresentationBlock.update(next.id, { order_index: current.order_index }),
    ]);
    setBlocks(prev => prev.map(b => {
      if (b.id === current.id) return { ...b, order_index: next.order_index };
      if (b.id === next.id) return { ...b, order_index: current.order_index };
      return b;
    }));
  };

  const handleIndent = async (blockId) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const sorted = blocks
      .filter(b => (b.parent_id || null) === (block.parent_id || null))
      .sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex(b => b.id === blockId);
    const prevBlock = idx > 0 ? sorted[idx - 1] : null;
    if (!prevBlock) return;
    await base44.entities.PresentationBlock.update(blockId, { depth_level: block.depth_level + 1, parent_id: prevBlock.id });
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, depth_level: b.depth_level + 1, parent_id: prevBlock.id } : b));
  };

  const handleOutdent = async (blockId) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block || block.depth_level <= 0) return;
    const parent = block.parent_id ? blocks.find(b => b.id === block.parent_id) : null;
    await base44.entities.PresentationBlock.update(blockId, { depth_level: block.depth_level - 1, parent_id: parent?.parent_id || null });
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, depth_level: b.depth_level - 1, parent_id: parent?.parent_id || null } : b));
  };

  const handleAddChild = (parentId) => {
    addParentRef.current = parentId;
    setShowTypeSelector(true);
  };

  const expandAll = () => {
    setBlocks(prev => prev.map(b => ({ ...b, is_collapsed: false })));
    blocks.forEach(b => base44.entities.PresentationBlock.update(b.id, { is_collapsed: false }));
  };

  const collapseAll = () => {
    setBlocks(prev => prev.map(b => ({ ...b, is_collapsed: true })));
    blocks.forEach(b => base44.entities.PresentationBlock.update(b.id, { is_collapsed: true }));
  };

  const totalDuration = blocks.reduce((sum, b) => sum + (b.estimated_duration_seconds || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!presentation) {
    return <EmptyState title="Apresentação não encontrada" />;
  }

  return (
    <div className="flex flex-col h-screen md:h-auto">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/presentations"><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><ChevronLeft className="w-5 h-5" /></Button></Link>
            <h1 className="text-sm font-semibold truncate">{presentation.title}</h1>
            <AutosaveIndicator status={saveStatus} />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Link to={`/presentations/${id}/overview`}><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button></Link>
            <Link to={`/rehearsal/${id}`}><Button variant="ghost" size="icon" className="h-8 w-8"><Play className="w-4 h-4" /></Button></Link>
          </div>
        </div>

        {/* View mode tabs */}
        <div className="flex items-center gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
          {views.map(v => (
            <Button key={v.key} variant={viewMode === v.key ? 'default' : 'ghost'} size="sm" className="text-xs h-7 shrink-0"
              onClick={() => setViewMode(v.key)}>
              <v.icon className="w-3.5 h-3.5 mr-1" />{v.label}
            </Button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={expandAll} title="Expandir todos">
              <ChevronsUpDown className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={collapseAll} title="Recolher todos">
              <ChevronsDownUp className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Detail level - scrollable on mobile */}
        <div className="px-3 pb-2 overflow-x-auto no-scrollbar">
          <DetailLevelControl value={detailLevel} onChange={setDetailLevel} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 md:max-w-4xl md:mx-auto md:w-full">
        {blocks.length === 0 ? (
          <EmptyState
            title="Nenhum bloco ainda"
            description="Adicione o primeiro bloco para começar a construir sua apresentação."
            actionLabel="Adicionar bloco"
            onAction={() => { addParentRef.current = null; setShowTypeSelector(true); }}
          />
        ) : (
          <>
            {viewMode === 'structure' && (
              <ViewStructure blocks={blocks} blockTypes={blockTypes} detailLevel={detailLevel}
                onUpdate={handleUpdateBlock} onDelete={setDeleteTarget} onDuplicate={handleDuplicate}
                onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} onIndent={handleIndent}
                onOutdent={handleOutdent} onAddChild={handleAddChild} />
            )}
            {viewMode === 'text' && <ViewText blocks={blocks} detailLevel={detailLevel} />}
            {viewMode === 'cards' && <ViewCards blocks={blocks} blockTypes={blockTypes} detailLevel={detailLevel} />}
            {viewMode === 'script' && <ViewScript blocks={blocks} detailLevel={detailLevel} />}
          </>
        )}

        {/* Add block button */}
        <div className="flex justify-center py-6">
          <Button variant="outline" className="gap-2" onClick={() => { addParentRef.current = null; setShowTypeSelector(true); }}>
            <Plus className="w-4 h-4" /> Adicionar bloco
          </Button>
        </div>

        {/* Duration summary */}
        <div className="text-center text-xs text-muted-foreground pb-4">
          {blocks.length} blocos · {Math.round(totalDuration / 60)} min estimados
        </div>
      </div>

      <BlockTypeSelector
        open={showTypeSelector}
        onOpenChange={setShowTypeSelector}
        blockTypes={blockTypes}
        onSelect={(bt) => handleAddBlock(bt, addParentRef.current)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir bloco"
        description={deleteTarget && blocks.some(b => b.parent_id === deleteTarget.id)
          ? `"${deleteTarget?.title}" possui sub-blocos. Ao excluir, os sub-blocos serão movidos para o nível acima.`
          : `Tem certeza que deseja excluir "${deleteTarget?.title}"?`}
        confirmLabel="Excluir"
        onConfirm={handleDeleteBlock}
        variant="destructive"
      />
    </div>
  );
}