import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Pause, Square, RotateCcw, SkipForward, Check, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { base44 } from '@/api/base44Client';
import PresentationTimer from '@/components/shared/PresentationTimer';
import ProgressIndicator from '@/components/shared/ProgressIndicator';
import useCurrentUser from '@/hooks/useCurrentUser';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function Rehearsal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [presentation, setPresentation] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [session, setSession] = useState(null);
  const [blockProgress, setBlockProgress] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [existingSession, setExistingSession] = useState(null);
  const [showTopicList, setShowTopicList] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [p, b] = await Promise.all([
        base44.entities.Presentation.get(id),
        base44.entities.PresentationBlock.filter({ presentation_id: id, is_hidden: false }, 'order_index'),
      ]);
      setPresentation(p);
      setBlocks(b);

      if (user) {
        const sessions = await base44.entities.PresentationSession.filter(
          { presentation_id: id, user_id: user.id, session_type: 'rehearsal' }, '-created_date', 1
        );
        const active = sessions.find(s => s.status === 'active' || s.status === 'paused');
        if (active) {
          setExistingSession(active);
          setShowContinueModal(true);
        }
      }
      setLoading(false);
    };
    load();
  }, [id, user]);

  const startNewSession = async () => {
    const totalSeconds = blocks.reduce((s, b) => s + (b.estimated_duration_seconds || 0), 0);
    const sess = await base44.entities.PresentationSession.create({
      presentation_id: id, user_id: user.id, session_type: 'rehearsal',
      status: 'active', started_at: new Date().toISOString(),
      planned_duration_seconds: totalSeconds,
    });
    const progressEntries = blocks.map((b, i) => ({
      session_id: sess.id, block_id: b.id, status: i === 0 ? 'current' : 'pending', order_used: i,
    }));
    const bp = await base44.entities.SessionBlockProgress.bulkCreate(progressEntries);
    setSession(sess);
    setBlockProgress(bp);
    setCurrentIndex(0);
    setIsRunning(true);
    setShowContinueModal(false);
  };

  const continueSession = async () => {
    const bp = await base44.entities.SessionBlockProgress.filter({ session_id: existingSession.id }, 'order_used');
    setSession(existingSession);
    setBlockProgress(bp);
    const currentBp = bp.find(p => p.status === 'current');
    const idx = currentBp ? blocks.findIndex(b => b.id === currentBp.block_id) : 0;
    setCurrentIndex(idx >= 0 ? idx : 0);
    setIsRunning(existingSession.status === 'active');
    setShowContinueModal(false);
  };

  const currentBlock = blocks[currentIndex];
  const nextBlock = blocks[currentIndex + 1];
  const currentBp = blockProgress.find(bp => bp.block_id === currentBlock?.id);

  const updateBlockStatus = async (blockId, status) => {
    const bp = blockProgress.find(p => p.block_id === blockId);
    if (!bp) return;
    const updates = { status };
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    await base44.entities.SessionBlockProgress.update(bp.id, updates);
    setBlockProgress(prev => prev.map(p => p.id === bp.id ? { ...p, ...updates } : p));
  };

  const goNext = async () => {
    if (currentBlock) {
      await updateBlockStatus(currentBlock.id, 'completed');
    }
    if (currentIndex < blocks.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      await updateBlockStatus(blocks[nextIdx].id, 'current');
      if (session) {
        await base44.entities.PresentationSession.update(session.id, {
          current_block_id: blocks[nextIdx].id,
          completed_count: blockProgress.filter(p => p.status === 'completed').length + 1,
        });
      }
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      updateBlockStatus(blocks[currentIndex - 1].id, 'current');
    }
  };

  const skipBlock = async () => {
    await updateBlockStatus(currentBlock.id, 'skipped');
    if (currentIndex < blocks.length - 1) {
      setCurrentIndex(currentIndex + 1);
      await updateBlockStatus(blocks[currentIndex + 1].id, 'current');
    }
    if (session) {
      await base44.entities.PresentationSession.update(session.id, {
        skipped_count: (session.skipped_count || 0) + 1,
      });
      setSession(prev => ({ ...prev, skipped_count: (prev.skipped_count || 0) + 1 }));
    }
  };

  const markRevisit = async () => {
    await updateBlockStatus(currentBlock.id, 'revisit');
  };

  const pauseSession = async () => {
    setIsRunning(false);
    if (session) {
      await base44.entities.PresentationSession.update(session.id, { status: 'paused', paused_at: new Date().toISOString() });
      setSession(prev => ({ ...prev, status: 'paused' }));
    }
  };

  const resumeSession = () => {
    setIsRunning(true);
    if (session) {
      base44.entities.PresentationSession.update(session.id, { status: 'active' });
      setSession(prev => ({ ...prev, status: 'active' }));
    }
  };

  const endSession = async () => {
    setIsRunning(false);
    if (session) {
      await base44.entities.PresentationSession.update(session.id, {
        status: 'completed', finished_at: new Date().toISOString(),
      });
    }
    navigate(`/session-history/${id}`);
  };

  const getBlockStatus = (blockId) => {
    const bp = blockProgress.find(p => p.block_id === blockId);
    return bp?.status || 'pending';
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  if (!session && !showContinueModal) {
    return (
      <div className="p-4 md:p-8 max-w-lg mx-auto text-center space-y-6 pt-20">
        <h1 className="text-2xl font-bold">Ensaiar: {presentation?.title}</h1>
        <p className="text-muted-foreground">{blocks.length} blocos · {Math.round(blocks.reduce((s, b) => s + (b.estimated_duration_seconds || 0), 0) / 60)} min</p>
        <Button size="lg" className="gap-2" onClick={startNewSession}><Play className="w-5 h-5" />Iniciar ensaio</Button>
        <div><Button variant="ghost" onClick={() => navigate(-1)}>Voltar</Button></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-3 py-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4 mr-1" />Sair</Button>
          <PresentationTimer
            plannedSeconds={blocks.reduce((s, b) => s + (b.estimated_duration_seconds || 0), 0)}
            isRunning={isRunning}
            initialElapsed={session?.elapsed_seconds || 0}
            onElapsedChange={(e) => setSession(prev => prev ? { ...prev, elapsed_seconds: e } : prev)}
          />
          <Sheet open={showTopicList} onOpenChange={setShowTopicList}>
            <SheetTrigger asChild><Button variant="ghost" size="icon"><List className="w-5 h-5" /></Button></SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader><SheetTitle>Tópicos</SheetTitle></SheetHeader>
              <div className="space-y-1 mt-4">
                {blocks.map((b, i) => (
                  <button key={b.id} className={`flex items-center gap-2 w-full p-2 rounded-lg text-left text-sm transition-colors ${i === currentIndex ? 'bg-primary/10' : 'hover:bg-muted'}`}
                    onClick={() => { setCurrentIndex(i); updateBlockStatus(b.id, 'current'); setShowTopicList(false); }}>
                    <ProgressIndicator status={getBlockStatus(b.id)} compact />
                    <span className="truncate">{b.title || '(Sem título)'}</span>
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex items-center gap-1 mt-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((currentIndex + 1) / blocks.length) * 100}%` }} />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{currentIndex + 1}/{blocks.length}</span>
        </div>
      </div>

      {/* Current block */}
      <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full overflow-y-auto">
        {currentBlock && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ProgressIndicator status={getBlockStatus(currentBlock.id)} />
            </div>
            <h2 className="text-2xl font-bold">{currentBlock.title}</h2>
            {currentBlock.summary && <p className="text-muted-foreground">{currentBlock.summary}</p>}
            {currentBlock.content && (
              <Card><CardContent className="p-4 whitespace-pre-wrap text-sm">{currentBlock.content}</CardContent></Card>
            )}
            {currentBlock.presenter_notes && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-yellow-800 mb-1">Notas pessoais</p>
                  <p className="text-sm text-yellow-900 whitespace-pre-wrap">{currentBlock.presenter_notes}</p>
                </CardContent>
              </Card>
            )}
            {nextBlock && (
              <div className="mt-6 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Próximo:</p>
                <p className="text-sm font-medium">{nextBlock.title}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="sticky bottom-0 bg-background border-t p-3 safe-area-bottom">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Button variant="outline" size="icon" onClick={goPrev} disabled={currentIndex === 0}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={skipBlock}><SkipForward className="w-4 h-4 mr-1" />Pular</Button>
            <Button variant="outline" size="sm" onClick={markRevisit}><RotateCcw className="w-4 h-4 mr-1" />Revisitar</Button>
            {isRunning ? (
              <Button variant="outline" size="sm" onClick={pauseSession}><Pause className="w-4 h-4 mr-1" />Pausar</Button>
            ) : (
              <Button variant="outline" size="sm" onClick={resumeSession}><Play className="w-4 h-4 mr-1" />Retomar</Button>
            )}
            <Button variant="destructive" size="sm" onClick={endSession}><Square className="w-4 h-4 mr-1" />Encerrar</Button>
          </div>
          <Button size="icon" onClick={goNext} disabled={currentIndex >= blocks.length - 1}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Continue modal */}
      <Dialog open={showContinueModal} onOpenChange={setShowContinueModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sessão em andamento</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Existe uma sessão de ensaio em andamento para esta apresentação.</p>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button onClick={continueSession} className="w-full">Continuar</Button>
            <Button variant="outline" onClick={startNewSession} className="w-full">Recomeçar</Button>
            <Button variant="ghost" onClick={() => { setShowContinueModal(false); navigate(-1); }} className="w-full">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}