import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  Flag,
  List,
  Loader2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCcw,
  RotateCcw,
  Save,
  SkipForward,
  Square,
  StickyNote,
  Target,
  TimerReset,
  X,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

const SAVE_INTERVAL_MS = 15000;

const STATUS_META = {
  pending: {
    label: 'Pendente',
    icon: Target,
    className: 'bg-muted text-muted-foreground border-border',
  },
  current: {
    label: 'Atual',
    icon: Play,
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  },
  completed: {
    label: 'Concluído',
    icon: Check,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  },
  skipped: {
    label: 'Pulado',
    icon: SkipForward,
    className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800',
  },
  revisit: {
    label: 'Revisitar',
    icon: RotateCcw,
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  },
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(toNumber(totalSeconds)));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function sortBlocks(items) {
  const safeItems = Array.isArray(items) ? items : [];
  const byParent = new Map();

  safeItems.forEach((item) => {
    const parentKey = item.parent_id || '__root__';
    const list = byParent.get(parentKey) || [];
    list.push(item);
    byParent.set(parentKey, list);
  });

  byParent.forEach((list) => {
    list.sort((a, b) => {
      const orderDiff = toNumber(a.order_index) - toNumber(b.order_index);
      if (orderDiff !== 0) return orderDiff;
      return String(a.created_date || '').localeCompare(String(b.created_date || ''));
    });
  });

  const output = [];
  const visit = (parentId, depth = 0) => {
    const key = parentId || '__root__';
    const children = byParent.get(key) || [];

    children.forEach((child) => {
      output.push({ ...child, computed_depth: depth });
      visit(child.id, depth + 1);
    });
  };

  visit(null, 0);
  return output;
}

function StatusBadge({ status = 'pending', compact = false }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;

  if (compact) {
    return (
      <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${meta.className}`} title={meta.label}>
        <Icon className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <Badge variant="outline" className={`gap-1.5 ${meta.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <p className="text-sm">Preparando o ensaio...</p>
      </div>
    </div>
  );
}

export default function Rehearsal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: userLoading } = useCurrentUser();

  const [presentation, setPresentation] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [session, setSession] = useState(null);
  const [progressRows, setProgressRows] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [existingSession, setExistingSession] = useState(null);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showTopicList, setShowTopicList] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [showAdditionalContent, setShowAdditionalContent] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [finalNotes, setFinalNotes] = useState('');

  const mountedRef = useRef(true);
  const saveInFlightRef = useRef(false);

  const visibleBlocks = useMemo(
    () => sortBlocks(blocks.filter((block) => block.is_hidden !== true)),
    [blocks],
  );

  const plannedSeconds = useMemo(
    () => visibleBlocks.reduce(
      (total, block) => total + Math.max(0, toNumber(block.estimated_duration_seconds)),
      0,
    ),
    [visibleBlocks],
  );

  const currentBlock = visibleBlocks[currentIndex] || null;
  const previousBlock = currentIndex > 0 ? visibleBlocks[currentIndex - 1] : null;
  const nextBlock = currentIndex < visibleBlocks.length - 1 ? visibleBlocks[currentIndex + 1] : null;

  const progressMap = useMemo(
    () => Object.fromEntries(progressRows.map((row) => [row.block_id, row])),
    [progressRows],
  );

  const completedCount = useMemo(
    () => progressRows.filter((row) => row.status === 'completed').length,
    [progressRows],
  );

  const skippedCount = useMemo(
    () => progressRows.filter((row) => row.status === 'skipped').length,
    [progressRows],
  );

  const revisitCount = useMemo(
    () => progressRows.filter((row) => row.status === 'revisit').length,
    [progressRows],
  );

  const progressPercentage = visibleBlocks.length > 0
    ? Math.round((completedCount / visibleBlocks.length) * 100)
    : 0;

  const currentStatus = currentBlock
    ? progressMap[currentBlock.id]?.status || 'pending'
    : 'pending';

  const loadPage = useCallback(async () => {
    if (!id || !user?.id) return;

    setLoading(true);
    setLoadError('');

    try {
      const [presentationData, blockRows, sessionRows] = await Promise.all([
        base44.entities.Presentation.get(id),
        base44.entities.PresentationBlock.filter({ presentation_id: id }, 'order_index'),
        base44.entities.PresentationSession.filter(
          {
            presentation_id: id,
            user_id: user.id,
            session_type: 'rehearsal',
          },
          '-created_date',
          20,
        ),
      ]);

      if (!mountedRef.current) return;

      const safeBlocks = Array.isArray(blockRows) ? blockRows : [];
      const safeSessions = Array.isArray(sessionRows) ? sessionRows : [];
      const active = safeSessions.find(
        (item) => item.status === 'active' || item.status === 'paused',
      );

      setPresentation(presentationData || null);
      setBlocks(safeBlocks);
      setExistingSession(active || null);
      setShowContinueDialog(Boolean(active));
    } catch (error) {
      console.error('Erro ao carregar ensaio:', error);
      setLoadError('Não foi possível carregar esta apresentação para ensaio.');
      toast({
        title: 'Falha ao carregar o ensaio',
        description: 'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id, toast, user?.id]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!userLoading && user?.id) {
      loadPage();
    }
  }, [loadPage, user?.id, userLoading]);

  useEffect(() => {
    if (!isRunning || !session?.id) return undefined;

    const interval = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, session?.id]);

  const saveSessionSnapshot = useCallback(async ({ force = false } = {}) => {
    if (!session?.id || saveInFlightRef.current) return;
    if (!force && !isRunning) return;

    saveInFlightRef.current = true;
    setSaving(true);

    try {
      await base44.entities.PresentationSession.update(session.id, {
        elapsed_seconds: elapsedSeconds,
        current_block_id: currentBlock?.id || null,
        completed_count: completedCount,
        skipped_count: skippedCount,
        status: isRunning ? 'active' : 'paused',
        paused_at: isRunning ? null : new Date().toISOString(),
      });

      setSession((previous) => previous ? {
        ...previous,
        elapsed_seconds: elapsedSeconds,
        current_block_id: currentBlock?.id || null,
        completed_count: completedCount,
        skipped_count: skippedCount,
        status: isRunning ? 'active' : 'paused',
      } : previous);
    } catch (error) {
      console.error('Erro ao salvar sessão:', error);
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  }, [completedCount, currentBlock?.id, elapsedSeconds, isRunning, session?.id, skippedCount]);

  useEffect(() => {
    if (!session?.id || !isRunning) return undefined;

    const interval = window.setInterval(() => {
      saveSessionSnapshot();
    }, SAVE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isRunning, saveSessionSnapshot, session?.id]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && session?.id) {
        saveSessionSnapshot({ force: true });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [saveSessionSnapshot, session?.id]);

  const createProgressRows = useCallback(async (newSessionId) => {
    const payload = visibleBlocks.map((block, index) => ({
      session_id: newSessionId,
      block_id: block.id,
      status: index === 0 ? 'current' : 'pending',
      order_used: index,
      visit_count: index === 0 ? 1 : 0,
      started_at: index === 0 ? new Date().toISOString() : null,
    }));

    if (payload.length === 0) return [];

    if (typeof base44.entities.SessionBlockProgress.bulkCreate === 'function') {
      return base44.entities.SessionBlockProgress.bulkCreate(payload);
    }

    return Promise.all(
      payload.map((item) => base44.entities.SessionBlockProgress.create(item)),
    );
  }, [visibleBlocks]);

  const finishExistingSession = useCallback(async () => {
    if (!existingSession?.id) return;

    await base44.entities.PresentationSession.update(existingSession.id, {
      status: 'completed',
      finished_at: new Date().toISOString(),
    });
  }, [existingSession?.id]);

  const startNewSession = useCallback(async ({ restart = false } = {}) => {
    if (!user?.id) return;

    if (visibleBlocks.length === 0) {
      toast({
        title: 'Nada para ensaiar',
        description: 'Adicione pelo menos um bloco visível à apresentação.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      if (restart) {
        await finishExistingSession();
      }

      const now = new Date().toISOString();
      const newSession = await base44.entities.PresentationSession.create({
        presentation_id: id,
        user_id: user.id,
        session_type: 'rehearsal',
        status: 'active',
        started_at: now,
        paused_at: null,
        finished_at: null,
        elapsed_seconds: 0,
        planned_duration_seconds: plannedSeconds,
        current_block_id: visibleBlocks[0]?.id || null,
        completed_count: 0,
        skipped_count: 0,
        notes: '',
      });

      const rows = await createProgressRows(newSession.id);

      setSession(newSession);
      setProgressRows(Array.isArray(rows) ? rows : []);
      setCurrentIndex(0);
      setElapsedSeconds(0);
      setIsRunning(true);
      setExistingSession(null);
      setShowContinueDialog(false);
      setShowRestartDialog(false);

      await base44.entities.Presentation.update(id, {
        status: 'in_progress',
        last_opened_at: now,
      });
    } catch (error) {
      console.error('Erro ao iniciar ensaio:', error);
      toast({
        title: 'Não foi possível iniciar',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [createProgressRows, finishExistingSession, id, plannedSeconds, toast, user?.id, visibleBlocks]);

  const continueExistingSession = useCallback(async () => {
    if (!existingSession?.id) return;

    setSaving(true);

    try {
      const rows = await base44.entities.SessionBlockProgress.filter(
        { session_id: existingSession.id },
        'order_used',
      );
      const safeRows = Array.isArray(rows) ? rows : [];
      const currentRow = safeRows.find((row) => row.status === 'current');
      const currentId = currentRow?.block_id || existingSession.current_block_id;
      const index = Math.max(
        0,
        visibleBlocks.findIndex((block) => block.id === currentId),
      );

      setSession(existingSession);
      setProgressRows(safeRows);
      setCurrentIndex(index);
      setElapsedSeconds(toNumber(existingSession.elapsed_seconds));
      setIsRunning(existingSession.status === 'active');
      setShowContinueDialog(false);
    } catch (error) {
      console.error('Erro ao continuar ensaio:', error);
      toast({
        title: 'Não foi possível continuar',
        description: 'A sessão será preservada. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [existingSession, toast, visibleBlocks]);

  const updateProgressRow = useCallback(async (blockId, status, extra = {}) => {
    const row = progressMap[blockId];
    if (!row?.id) return;

    const now = new Date().toISOString();
    const payload = {
      status,
      ...extra,
    };

    if (status === 'current') {
      payload.started_at = row.started_at || now;
      payload.visit_count = toNumber(row.visit_count) + 1;
    }

    if (status === 'completed') {
      payload.completed_at = now;
    }

    await base44.entities.SessionBlockProgress.update(row.id, payload);

    setProgressRows((current) => current.map((item) => (
      item.id === row.id ? { ...item, ...payload } : item
    )));
  }, [progressMap]);

  const setOnlyCurrentBlock = useCallback(async (targetIndex) => {
    if (targetIndex < 0 || targetIndex >= visibleBlocks.length) return;

    const target = visibleBlocks[targetIndex];
    const otherCurrentRows = progressRows.filter(
      (row) => row.status === 'current' && row.block_id !== target.id,
    );

    await Promise.all(
      otherCurrentRows.map((row) => base44.entities.SessionBlockProgress.update(row.id, {
        status: 'pending',
      })),
    );

    setProgressRows((current) => current.map((row) => {
      if (row.status === 'current' && row.block_id !== target.id) {
        return { ...row, status: 'pending' };
      }
      return row;
    }));

    await updateProgressRow(target.id, 'current');
    setCurrentIndex(targetIndex);

    if (session?.id) {
      await base44.entities.PresentationSession.update(session.id, {
        current_block_id: target.id,
      });
    }
  }, [progressRows, session?.id, updateProgressRow, visibleBlocks]);

  const moveToNext = useCallback(async ({ status = 'completed' } = {}) => {
    if (!currentBlock) return;

    await updateProgressRow(currentBlock.id, status);

    if (currentIndex < visibleBlocks.length - 1) {
      await setOnlyCurrentBlock(currentIndex + 1);
      return;
    }

    await saveSessionSnapshot({ force: true });
    setShowEndDialog(true);
  }, [currentBlock, currentIndex, saveSessionSnapshot, setOnlyCurrentBlock, updateProgressRow, visibleBlocks.length]);

  const moveToPrevious = useCallback(async () => {
    if (currentIndex <= 0) return;
    await setOnlyCurrentBlock(currentIndex - 1);
  }, [currentIndex, setOnlyCurrentBlock]);

  const markCurrent = useCallback(async (status) => {
    if (!currentBlock) return;
    await updateProgressRow(currentBlock.id, status);
  }, [currentBlock, updateProgressRow]);

  const pauseSession = useCallback(async () => {
    setIsRunning(false);

    if (!session?.id) return;

    const now = new Date().toISOString();
    await base44.entities.PresentationSession.update(session.id, {
      status: 'paused',
      paused_at: now,
      elapsed_seconds: elapsedSeconds,
      current_block_id: currentBlock?.id || null,
      completed_count: completedCount,
      skipped_count: skippedCount,
    });

    setSession((previous) => previous ? {
      ...previous,
      status: 'paused',
      paused_at: now,
      elapsed_seconds: elapsedSeconds,
    } : previous);
  }, [completedCount, currentBlock?.id, elapsedSeconds, session?.id, skippedCount]);

  const resumeSession = useCallback(async () => {
    if (!session?.id) return;

    await base44.entities.PresentationSession.update(session.id, {
      status: 'active',
      paused_at: null,
    });

    setSession((previous) => previous ? {
      ...previous,
      status: 'active',
      paused_at: null,
    } : previous);
    setIsRunning(true);
  }, [session?.id]);

  const endSession = useCallback(async () => {
    if (!session?.id) return;

    setSaving(true);

    try {
      const now = new Date().toISOString();

      await base44.entities.PresentationSession.update(session.id, {
        status: 'completed',
        finished_at: now,
        elapsed_seconds: elapsedSeconds,
        current_block_id: currentBlock?.id || null,
        completed_count: completedCount,
        skipped_count: skippedCount,
        notes: finalNotes.trim(),
      });

      await base44.entities.Presentation.update(id, {
        progress_percentage: progressPercentage,
        last_opened_at: now,
      });

      setIsRunning(false);
      setShowEndDialog(false);
      navigate(`/session-history/${id}`);
    } catch (error) {
      console.error('Erro ao encerrar ensaio:', error);
      toast({
        title: 'Não foi possível encerrar',
        description: 'Seu progresso continua salvo. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [completedCount, currentBlock?.id, elapsedSeconds, finalNotes, id, navigate, progressPercentage, session?.id, skippedCount, toast]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Erro ao alterar tela cheia:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!session?.id || showEndDialog || showRestartDialog || showContinueDialog) return;

      const targetTag = event.target?.tagName?.toLowerCase();
      if (targetTag === 'textarea' || targetTag === 'input') return;

      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        moveToNext();
      }

      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        moveToPrevious();
      }

      if (event.key === ' ') {
        event.preventDefault();
        if (isRunning) pauseSession();
        else resumeSession();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, moveToNext, moveToPrevious, pauseSession, resumeSession, session?.id, showContinueDialog, showEndDialog, showRestartDialog]);

  if (userLoading || loading) return <LoadingScreen />;

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-lg border-destructive/30">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 text-xl font-bold">Não foi possível abrir o ensaio</h1>
            <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={loadPage}>Tentar novamente</Button>
              <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session && !showContinueDialog) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:py-14">
        <div className="mx-auto max-w-2xl">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <Card className="overflow-hidden border-primary/20">
            <CardContent className="p-6 text-center sm:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Play className="h-8 w-8 text-primary" />
              </div>

              <Badge variant="secondary" className="mt-5">Modo ensaio</Badge>

              <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
                {presentation?.title || 'Apresentação'}
              </h1>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                Pratique sua apresentação, acompanhe o tempo e marque visualmente os tópicos concluídos, pulados ou que precisam ser revisitados.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xl font-bold">{visibleBlocks.length}</p>
                  <p className="text-xs text-muted-foreground">Blocos</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xl font-bold">{formatTime(plannedSeconds)}</p>
                  <p className="text-xs text-muted-foreground">Tempo previsto</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xl font-bold">{visibleBlocks.filter((item) => item.is_essential).length}</p>
                  <p className="text-xs text-muted-foreground">Essenciais</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xl font-bold">{visibleBlocks.filter((item) => item.presenter_notes).length}</p>
                  <p className="text-xs text-muted-foreground">Com notas</p>
                </div>
              </div>

              <Button size="lg" className="mt-7 w-full sm:w-auto" onClick={() => startNewSession()} disabled={saving || visibleBlocks.length === 0}>
                {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Play className="mr-2 h-5 w-5" />}
                Iniciar ensaio
              </Button>

              {visibleBlocks.length === 0 && (
                <p className="mt-3 text-sm text-destructive">Adicione pelo menos um bloco visível antes de ensaiar.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-5">
          <Button variant="ghost" size="sm" onClick={() => setShowEndDialog(true)}>
            <X className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>

          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold">{presentation?.title}</p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              <span className={plannedSeconds > 0 && elapsedSeconds > plannedSeconds ? 'font-semibold text-destructive' : ''}>
                {formatTime(elapsedSeconds)}
              </span>
              {plannedSeconds > 0 && (
                <span>/ {formatTime(plannedSeconds)}</span>
              )}
              {saving && <Save className="h-3.5 w-3.5 animate-pulse" />}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} title="Tela cheia">
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            <Sheet open={showTopicList} onOpenChange={setShowTopicList}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" title="Lista de tópicos">
                  <List className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[92vw] max-w-sm p-0">
                <SheetHeader className="border-b p-5">
                  <SheetTitle>Roteiro do ensaio</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-82px)]">
                  <div className="space-y-1 p-3">
                    {visibleBlocks.map((block, index) => {
                      const rowStatus = progressMap[block.id]?.status || 'pending';
                      const isCurrent = index === currentIndex;

                      return (
                        <button
                          key={block.id}
                          type="button"
                          onClick={async () => {
                            await setOnlyCurrentBlock(index);
                            setShowTopicList(false);
                          }}
                          className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${isCurrent ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/70'}`}
                        >
                          <StatusBadge status={rowStatus} compact />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-medium" style={{ paddingLeft: `${Math.min(toNumber(block.computed_depth), 4) * 8}px` }}>
                              {block.title || '(Sem título)'}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatTime(block.estimated_duration_seconds || 0)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setShowNotes((value) => !value)}>
                  {showNotes ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                  {showNotes ? 'Ocultar notas' : 'Mostrar notas'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAdditionalContent((value) => !value)}>
                  {showAdditionalContent ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                  {showAdditionalContent ? 'Ocultar conteúdo extra' : 'Mostrar conteúdo extra'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowRestartDialog(true)}>
                  <TimerReset className="mr-2 h-4 w-4" />
                  Recomeçar ensaio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowEndDialog(true)} className="text-destructive focus:text-destructive">
                  <Square className="mr-2 h-4 w-4" />
                  Encerrar ensaio
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-3 pb-2 sm:px-5">
          <div className="flex items-center gap-3">
            <Progress value={progressPercentage} className="h-2 flex-1" />
            <span className="w-16 text-right text-xs font-medium text-muted-foreground">
              {completedCount}/{visibleBlocks.length}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        {currentBlock ? (
          <div className="mx-auto w-full max-w-3xl space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={currentStatus} />
              {currentBlock.is_essential && (
                <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                  <Flag className="h-3.5 w-3.5" />
                  Essencial
                </Badge>
              )}
              <Badge variant="secondary">
                {currentIndex + 1} de {visibleBlocks.length}
              </Badge>
              {toNumber(currentBlock.estimated_duration_seconds) > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatTime(currentBlock.estimated_duration_seconds)}
                </Badge>
              )}
            </div>

            <div>
              <h1 className="break-words text-3xl font-bold leading-tight sm:text-4xl">
                {currentBlock.title || '(Sem título)'}
              </h1>

              {currentBlock.summary && (
                <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed text-muted-foreground">
                  {currentBlock.summary}
                </p>
              )}
            </div>

            {currentBlock.content && (
              <Card>
                <CardContent className="p-5 sm:p-6">
                  <div className="whitespace-pre-wrap text-base leading-7 sm:text-lg sm:leading-8">
                    {currentBlock.content}
                  </div>
                </CardContent>
              </Card>
            )}

            {showAdditionalContent && currentBlock.additional_content && (
              <Card className="border-dashed">
                <CardContent className="p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Conteúdo adicional
                  </p>
                  <div className="whitespace-pre-wrap text-sm leading-6">
                    {currentBlock.additional_content}
                  </div>
                </CardContent>
              </Card>
            )}

            {showNotes && currentBlock.presenter_notes && (
              <Card className="border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/20">
                <CardContent className="p-5">
                  <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <StickyNote className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-wide">Notas pessoais</p>
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-6 text-amber-950 dark:text-amber-100">
                    {currentBlock.presenter_notes}
                  </div>
                </CardContent>
              </Card>
            )}

            {!currentBlock.summary && !currentBlock.content && !currentBlock.additional_content && !currentBlock.presenter_notes && (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  Este bloco ainda não possui conteúdo detalhado.
                </CardContent>
              </Card>
            )}

            {nextBlock && (
              <div className="rounded-2xl border bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próximo tópico</p>
                <p className="mt-1 line-clamp-2 font-medium">{nextBlock.title || '(Sem título)'}</p>
              </div>
            )}
          </div>
        ) : (
          <Card className="mx-auto w-full max-w-xl border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhum bloco disponível para este ensaio.
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="sticky bottom-0 z-40 border-t bg-background/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:px-5">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2">
          <Button variant="outline" size="icon" onClick={moveToPrevious} disabled={!previousBlock || saving} title="Tópico anterior">
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => moveToNext({ status: 'skipped' })} disabled={!currentBlock || saving} className="hidden sm:inline-flex">
              <SkipForward className="mr-2 h-4 w-4" />
              Pular
            </Button>

            <Button variant="outline" size="icon" onClick={() => moveToNext({ status: 'skipped' })} disabled={!currentBlock || saving} className="sm:hidden" title="Pular">
              <SkipForward className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={() => markCurrent('revisit')} disabled={!currentBlock || saving} className="hidden md:inline-flex">
              <RotateCcw className="mr-2 h-4 w-4" />
              Revisitar
            </Button>

            {isRunning ? (
              <Button variant="secondary" size="sm" onClick={pauseSession} disabled={saving}>
                <Pause className="mr-2 h-4 w-4" />
                Pausar
              </Button>
            ) : (
              <Button size="sm" onClick={resumeSession} disabled={saving}>
                <Play className="mr-2 h-4 w-4" />
                Retomar
              </Button>
            )}

            <Button onClick={() => moveToNext({ status: 'completed' })} disabled={!currentBlock || saving} className="min-w-0 flex-1 sm:flex-none">
              <Check className="mr-2 h-4 w-4" />
              <span className="truncate">Concluir e avançar</span>
            </Button>
          </div>

          <Button size="icon" onClick={() => moveToNext({ status: currentStatus === 'completed' ? 'completed' : 'pending' })} disabled={!nextBlock || saving} title="Próximo tópico">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </footer>

      <Dialog open={showContinueDialog} onOpenChange={(open) => {
        if (!open) navigate(-1);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sessão de ensaio encontrada</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Esta apresentação possui um ensaio em andamento. Você pode continuar exatamente de onde parou ou recomeçar com uma nova sessão sem apagar o histórico anterior.
          </p>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={continueExistingSession} disabled={saving} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Continuar ensaio
            </Button>
            <Button variant="outline" onClick={() => startNewSession({ restart: true })} disabled={saving} className="w-full">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Recomeçar
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)} className="w-full">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recomeçar este ensaio?</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-muted-foreground">
            A sessão atual será encerrada e guardada no histórico. Uma nova sessão começará do primeiro tópico.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestartDialog(false)}>Cancelar</Button>
            <Button onClick={() => startNewSession({ restart: true })} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Recomeçar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Encerrar ensaio</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-muted p-3 text-center">
              <p className="text-lg font-bold">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Concluídos</p>
            </div>
            <div className="rounded-xl bg-muted p-3 text-center">
              <p className="text-lg font-bold">{skippedCount}</p>
              <p className="text-xs text-muted-foreground">Pulados</p>
            </div>
            <div className="rounded-xl bg-muted p-3 text-center">
              <p className="text-lg font-bold">{revisitCount}</p>
              <p className="text-xs text-muted-foreground">Revisitar</p>
            </div>
          </div>

          <div>
            <label htmlFor="final-notes" className="mb-2 block text-sm font-medium">Observações do ensaio</label>
            <Textarea
              id="final-notes"
              value={finalNotes}
              onChange={(event) => setFinalNotes(event.target.value)}
              placeholder="O que funcionou bem? O que precisa melhorar?"
              rows={4}
            />
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setShowEndDialog(false)} className="w-full sm:w-auto">
              Continuar ensaiando
            </Button>
            <Button onClick={endSession} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
              Encerrar e salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}