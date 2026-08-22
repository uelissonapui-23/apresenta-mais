import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Flag,
  Fullscreen,
  List,
  Loader2,
  LogOut,
  Maximize2,
  Minus,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  SkipForward,
  Text,
  X,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import BlockAttachmentsDisplay from '@/components/shared/BlockAttachmentsDisplay';

const AUTO_HIDE_CONTROLS_MS = 4500;
const AUTO_SAVE_SECONDS = 12;
const MIN_FONT_SIZE = 18;
const MAX_FONT_SIZE = 58;
const DEFAULT_FONT_SIZE = 28;

const DETAIL_LEVELS = {
  compact: 1,
  normal: 2,
  detailed: 3,
  complete: 4,
};

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function uniqueById(rows) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    if (!row?.id || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
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

function sortNewestFirst(rows) {
  return uniqueById(rows).sort((left, right) => {
    const dateDifference = (
      getRecordTimestamp(right)
      - getRecordTimestamp(left)
    );

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return String(right.id).localeCompare(String(left.id));
  });
}

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(asNumber(totalSeconds)));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((part) => String(part).padStart(2, '0'))
      .join(':');
  }

  return [minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

function normalizeBlock(block) {
  return {
    ...block,
    title: block?.title || 'Tópico sem título',
    summary: block?.summary || '',
    content: block?.content || '',
    additional_content: block?.additional_content || '',
    presenter_notes: block?.presenter_notes || '',
    order_index: asNumber(block?.order_index),
    depth_level: asNumber(block?.depth_level, 1),
    estimated_duration_seconds: asNumber(
      block?.estimated_duration_seconds,
    ),
    is_hidden: block?.is_hidden === true,
    show_to_audience: block?.show_to_audience !== false,
  };
}

function sortBlocks(blocks) {
  const normalized = blocks.map(normalizeBlock);
  const childrenByParent = new Map();

  normalized.forEach((block) => {
    const parentKey = block.parent_id || '__root__';
    const siblings = childrenByParent.get(parentKey) || [];
    siblings.push(block);
    childrenByParent.set(parentKey, siblings);
  });

  childrenByParent.forEach((siblings) => {
    siblings.sort((a, b) => {
      if (a.order_index !== b.order_index) {
        return a.order_index - b.order_index;
      }
      return String(a.title).localeCompare(String(b.title), 'pt-BR');
    });
  });

  const result = [];
  const visited = new Set();

  function visit(parentId, depth = 0) {
    const key = parentId || '__root__';
    const children = childrenByParent.get(key) || [];

    children.forEach((block) => {
      if (visited.has(block.id)) return;
      visited.add(block.id);
      result.push({ ...block, visualDepth: depth });
      visit(block.id, depth + 1);
    });
  }

  visit(null);

  normalized
    .filter((block) => !visited.has(block.id))
    .sort((a, b) => a.order_index - b.order_index)
    .forEach((block) => result.push({ ...block, visualDepth: 0 }));

  return result;
}

function statusMeta(status) {
  switch (status) {
    case 'completed':
      return {
        label: 'Apresentado',
        className: 'bg-emerald-500 text-white border-emerald-500',
        icon: Check,
      };
    case 'current':
      return {
        label: 'Atual',
        className: 'bg-blue-600 text-white border-blue-600',
        icon: Play,
      };
    case 'skipped':
      return {
        label: 'Pulado',
        className: 'bg-slate-500 text-white border-slate-500',
        icon: SkipForward,
      };
    case 'revisit':
      return {
        label: 'Revisitar',
        className: 'bg-amber-500 text-white border-amber-500',
        icon: RotateCcw,
      };
    default:
      return {
        label: 'Pendente',
        className: 'bg-transparent text-current border-current/25',
        icon: null,
      };
  }
}

function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        <p className="text-sm text-white/70">Preparando a apresentação...</p>
      </div>
    </div>
  );
}

function EmptyPresentation({ onBack }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 px-5 text-white">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
          <Text className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Nenhum tópico disponível</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          Esta apresentação ainda não possui blocos visíveis para o público.
          Volte ao editor e adicione ou reative os tópicos.
        </p>
        <Button onClick={onBack} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao editor
        </Button>
      </div>
    </div>
  );
}

export default function PresentMode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: userLoading } = useCurrentUser();

  const stageRef = useRef(null);
  const scriptListRef = useRef(null);
  const controlTimerRef = useRef(null);
  const elapsedRef = useRef(0);
  const currentIndexRef = useRef(0);
  const sessionRef = useRef(null);
  const progressRef = useRef(new Map());
  const blockStartedAtRef = useRef(Date.now());
  const loadingRef = useRef(false);
  const operationRef = useRef(false);
  const persistLockRef = useRef(false);

  const [presentation, setPresentation] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [session, setSession] = useState(null);
  const [progressRows, setProgressRows] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [darkMode, setDarkMode] = useState(true);
  const [detailLevel, setDetailLevel] = useState('detailed');
  const [showControls, setShowControls] = useState(true);
  const [showTimer, setShowTimer] = useState(true);
  const [showProgress, setShowProgress] = useState(true);
  const [showNextBlock, setShowNextBlock] = useState(true);
  const [autoMarkCompleted, setAutoMarkCompleted] = useState(true);
  const [confirmBeforeRestart, setConfirmBeforeRestart] = useState(true);
  const [accessibility, setAccessibility] = useState({
    high_contrast: false,
    reduce_motion: false,
    large_controls: false,
    left_aligned_text: false,
    increased_spacing: false,
  });
  const [showNotes, setShowNotes] = useState(false);
  const [showAdditional, setShowAdditional] = useState(true);
  const [showTopicSheet, setShowTopicSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);

  const [pendingSession, setPendingSession] = useState(null);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [endNotes, setEndNotes] = useState('');

  const visibleBlocks = useMemo(
    () => blocks.filter(
      (block) => !block.is_hidden && block.show_to_audience,
    ),
    [blocks],
  );

  const currentBlock = visibleBlocks[currentIndex] || null;
  const previousBlock = visibleBlocks[currentIndex - 1] || null;
  const nextBlock = visibleBlocks[currentIndex + 1] || null;

  const progressMap = useMemo(
    () => new Map(progressRows.map((row) => [row.block_id, row])),
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

  const progressPercent = visibleBlocks.length > 0
    ? Math.round((completedCount / visibleBlocks.length) * 100)
    : 0;

  const plannedSeconds = useMemo(
    () => visibleBlocks.reduce(
      (total, block) => total + block.estimated_duration_seconds,
      0,
    ),
    [visibleBlocks],
  );

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const currentNode = scriptListRef.current?.querySelector('[data-current-topic="true"]');
    if (!currentNode) return;

    currentNode.scrollIntoView({
      behavior: accessibility.reduce_motion ? 'auto' : 'smooth',
      block: 'center',
    });
  }, [accessibility.reduce_motion, currentIndex]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    progressRef.current = progressMap;
  }, [progressMap]);

  const resetControlsTimer = useCallback(() => {
    window.clearTimeout(controlTimerRef.current);
    setShowControls(true);

    controlTimerRef.current = window.setTimeout(() => {
      if (!showTopicSheet && !showSettingsSheet && !endDialogOpen) {
        setShowControls(false);
      }
    }, AUTO_HIDE_CONTROLS_MS);
  }, [endDialogOpen, showSettingsSheet, showTopicSheet]);

  const requestFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch (fullscreenError) {
      console.warn('Tela cheia indisponível:', fullscreenError);
    }
  }, []);

  const persistSession = useCallback(async ({
    forceStatus,
    finishedAt,
    notes,
    silent = true,
  } = {}) => {
    const activeSession = sessionRef.current;

    if (!activeSession?.id || persistLockRef.current) {
      return false;
    }

    persistLockRef.current = true;

    const current = visibleBlocks[currentIndexRef.current];
    const rows = Array.from(progressRef.current.values());
    const completed = rows.filter((row) => row.status === 'completed').length;
    const skipped = rows.filter((row) => row.status === 'skipped').length;

    try {
      const updated = await base44.entities.PresentationSession.update(
        activeSession.id,
        {
          elapsed_seconds: elapsedRef.current,
          current_block_id: current?.id || '',
          completed_count: completed,
          skipped_count: skipped,
          status: forceStatus || (running ? 'active' : 'paused'),
          paused_at: forceStatus === 'paused'
            ? new Date().toISOString()
            : activeSession.paused_at || '',
          finished_at: finishedAt || activeSession.finished_at || '',
          notes: notes ?? activeSession.notes ?? '',
        },
      );

      if (updated?.id) {
        setSession((currentSession) => (
          currentSession?.id === updated.id
            ? { ...currentSession, ...updated }
            : currentSession
        ));
      }

      return true;
    } catch (saveError) {
      console.error('Erro ao salvar sessão:', saveError);

      if (!silent) {
        toast({
          title: 'Não foi possível salvar a sessão',
          description:
            'Confira sua conexão antes de sair da apresentação.',
          variant: 'destructive',
        });
      }

      return false;
    } finally {
      persistLockRef.current = false;
    }
  }, [running, toast, visibleBlocks]);

  const createProgressRows = useCallback(async (
    createdSession,
    orderedBlocks,
    startingBlockId,
  ) => {
    const now = new Date().toISOString();
    const createdRows = [];

    for (let index = 0; index < orderedBlocks.length; index += 1) {
      const block = orderedBlocks[index];
      const isCurrent = block.id === startingBlockId;

      const row = await base44.entities.SessionBlockProgress.create({
        session_id: createdSession.id,
        block_id: block.id,
        status: isCurrent ? 'current' : 'pending',
        started_at: isCurrent ? now : '',
        completed_at: '',
        elapsed_seconds: 0,
        visit_count: isCurrent ? 1 : 0,
        order_used: index,
        note: '',
      });

      createdRows.push(row);
    }

    return createdRows;
  }, []);

  const createNewSession = useCallback(async (orderedBlocks) => {
    if (!user?.id || orderedBlocks.length === 0) return null;

    const firstBlock = orderedBlocks[0];
    const now = new Date().toISOString();
    let createdSession = null;

    try {
      createdSession = await base44.entities.PresentationSession.create({
        presentation_id: id,
        user_id: user.id,
        session_type: 'presentation',
        status: 'active',
        started_at: now,
        paused_at: '',
        finished_at: '',
        elapsed_seconds: 0,
        planned_duration_seconds: orderedBlocks.reduce(
          (total, block) => total + block.estimated_duration_seconds,
          0,
        ),
        current_block_id: firstBlock.id,
        completed_count: 0,
        skipped_count: 0,
        notes: '',
      });

      const createdProgress = await createProgressRows(
        createdSession,
        orderedBlocks,
        firstBlock.id,
      );

      return {
        session: createdSession,
        progress: createdProgress,
        index: 0,
        elapsed: 0,
      };
    } catch (sessionError) {
      if (createdSession?.id) {
        try {
          await base44.entities.PresentationSession.delete(createdSession.id);
        } catch (cleanupError) {
          console.warn('Não foi possível remover a sessão incompleta:', cleanupError);
        }
      }
      throw sessionError;
    }
  }, [createProgressRows, id, user?.id]);

  const applySessionState = useCallback((state) => {
    if (!state) return;

    setSession(state.session);
    setProgressRows(state.progress || []);
    setCurrentIndex(clamp(state.index || 0, 0, Math.max(0, visibleBlocks.length - 1)));
    setElapsed(asNumber(state.elapsed));
    setRunning(state.session?.status !== 'paused');
    blockStartedAtRef.current = Date.now();
  }, [visibleBlocks.length]);

  const loadPage = useCallback(async () => {
    if (!id || !user?.id || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const [presentationRow, blockRows, preferenceRows, sessionRows] = await Promise.all([
        base44.entities.Presentation.get(id),
        base44.entities.PresentationBlock.filter(
          { presentation_id: id },
          'order_index',
        ),
        base44.entities.UserPreference.filter({ user_id: user.id }),
        base44.entities.PresentationSession.filter(
          {
            presentation_id: id,
            user_id: user.id,
            session_type: 'presentation',
          },
          '-created_date',
        ),
      ]);

      if (!presentationRow || presentationRow.user_id !== user.id) {
        setPresentation(null);
        setBlocks([]);
        setError('Esta apresentação não existe ou você não possui acesso a ela.');
        return;
      }

      const ordered = sortBlocks(
        uniqueById(blockRows).filter((block) => block.presentation_id === id),
      ).filter((block) => !block.is_hidden && block.show_to_audience);

      setPresentation(presentationRow);
      setBlocks(ordered);

      const preference = selectCurrentRecord(preferenceRows);

      if (preference) {
        setFontSize(clamp(
          asNumber(preference.presentation_font_size, DEFAULT_FONT_SIZE),
          MIN_FONT_SIZE,
          MAX_FONT_SIZE,
        ));
        setDarkMode(preference.use_dark_mode !== false);
        setShowTimer(preference.show_timer !== false);
        setShowNextBlock(preference.show_next_block !== false);
        setShowProgress(preference.show_progress !== false);
        setDetailLevel(preference.default_detail_level || 'detailed');
        setAutoMarkCompleted(preference.auto_mark_completed !== false);
        setConfirmBeforeRestart(preference.confirm_before_restart !== false);

        let parsedAccessibility = preference.accessibility_settings_json || {};
        if (typeof parsedAccessibility === 'string') {
          try {
            parsedAccessibility = JSON.parse(parsedAccessibility);
          } catch {
            parsedAccessibility = {};
          }
        }

        setAccessibility((current) => ({
          ...current,
          ...(parsedAccessibility && typeof parsedAccessibility === 'object'
            ? parsedAccessibility
            : {}),
        }));
      }

      if (ordered.length === 0) {
        setLoading(false);
        return;
      }

      const activeSession = sortNewestFirst(sessionRows)
        .find((row) => (
          row.presentation_id === id
          && row.user_id === user.id
          && row.session_type === 'presentation'
          && ['active', 'paused'].includes(row.status)
        ));

      if (activeSession) {
        const savedProgressRows = uniqueById(
          await base44.entities.SessionBlockProgress.filter(
            { session_id: activeSession.id },
            'order_used',
          ),
        ).filter((row) => row.session_id === activeSession.id);

        const validBlockIds = new Set(ordered.map((block) => block.id));

        const savedProgress = savedProgressRows
          .filter((row) => validBlockIds.has(row.block_id))
          .sort((left, right) => (
            asNumber(left.order_used)
            - asNumber(right.order_used)
            || String(left.id).localeCompare(String(right.id))
          ));
        const existingBlockIds = new Set(savedProgress.map((row) => row.block_id));
        const missingBlocks = ordered.filter((block) => !existingBlockIds.has(block.id));

        for (const block of missingBlocks) {
          const createdRow = await base44.entities.SessionBlockProgress.create({
            session_id: activeSession.id,
            block_id: block.id,
            status: 'pending',
            started_at: '',
            completed_at: '',
            elapsed_seconds: 0,
            visit_count: 0,
            order_used: ordered.findIndex((item) => item.id === block.id),
            note: '',
          });
          savedProgress.push(createdRow);
        }

        let currentId = activeSession.current_block_id
          || savedProgress.find((row) => row.status === 'current')?.block_id;

        if (!validBlockIds.has(currentId)) {
          currentId = ordered[0]?.id || '';
        }

        const now = new Date().toISOString();

        for (const row of savedProgress) {
          const shouldBeCurrent = row.block_id === currentId;

          if (shouldBeCurrent && row.status !== 'current') {
            const updated = await base44.entities.SessionBlockProgress.update(
              row.id,
              {
                status: 'current',
                started_at: row.started_at || now,
                completed_at: '',
                visit_count: Math.max(1, asNumber(row.visit_count)),
              },
            );

            Object.assign(row, updated || {
              status: 'current',
              started_at: row.started_at || now,
              completed_at: '',
              visit_count: Math.max(1, asNumber(row.visit_count)),
            });
          } else if (!shouldBeCurrent && row.status === 'current') {
            const updated = await base44.entities.SessionBlockProgress.update(
              row.id,
              {
                status: 'pending',
              },
            );

            Object.assign(row, updated || {
              status: 'pending',
            });
          }
        }

        const currentIdFromSession = currentId;
        const index = Math.max(
          0,
          ordered.findIndex(
            (block) => block.id === currentIdFromSession,
          ),
        );

        setPendingSession({
          session: activeSession,
          progress: savedProgress,
          index,
          elapsed: asNumber(activeSession.elapsed_seconds),
        });
        setResumeDialogOpen(true);
      } else {
        const created = await createNewSession(ordered);
        setSession(created?.session || null);
        setProgressRows(created?.progress || []);
        setCurrentIndex(0);
        setElapsed(0);
        setRunning(true);
      }
    } catch (loadError) {
      console.error('Erro ao carregar apresentação:', loadError);
      setError('Não foi possível abrir esta apresentação.');
      toast({
        title: 'Erro ao abrir apresentação',
        description: 'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [createNewSession, id, toast, user?.id]);

  useEffect(() => {
    if (!userLoading && user?.id) {
      loadPage();
    } else if (!userLoading && !user?.id) {
      setLoading(false);
      setError('Entre na sua conta para iniciar a apresentação.');
    }
  }, [loadPage, user?.id, userLoading]);

  useEffect(() => {
    if (!running || !session?.id || resumeDialogOpen) return undefined;

    const timer = window.setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resumeDialogOpen, running, session?.id]);

  useEffect(() => {
    if (!session?.id || resumeDialogOpen) return undefined;

    const autoSave = window.setInterval(() => {
      persistSession();
    }, AUTO_SAVE_SECONDS * 1000);

    return () => window.clearInterval(autoSave);
  }, [persistSession, resumeDialogOpen, session?.id]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistSession();
      }
    };

    const onBeforeUnload = () => {
      persistSession();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [persistSession]);

  useEffect(() => {
    resetControlsTimer();
    return () => window.clearTimeout(controlTimerRef.current);
  }, [resetControlsTimer]);

  const updateProgressStatus = useCallback(async (
    blockId,
    status,
    extra = {},
  ) => {
    const existing = progressRef.current.get(blockId);
    if (!existing?.id) return null;

    const updatedData = {
      status,
      ...extra,
    };

    setProgressRows((current) => current.map((row) => (
      row.id === existing.id
        ? { ...row, ...updatedData }
        : row
    )));

    try {
      const updated = await base44.entities.SessionBlockProgress.update(
        existing.id,
        updatedData,
      );

      return updated || {
        ...existing,
        ...updatedData,
      };
    } catch (updateError) {
      console.error('Erro ao atualizar progresso:', updateError);

      setProgressRows((current) => current.map((row) => (
        row.id === existing.id
          ? existing
          : row
      )));

      toast({
        title: 'Não foi possível salvar o progresso',
        description:
          'A alteração foi desfeita para manter a sessão consistente.',
        variant: 'destructive',
      });

      return null;
    }
  }, [toast]);

  const activateIndex = useCallback(async (
    targetIndex,
    { markPrevious = false, previousStatus = 'completed' } = {},
  ) => {
    if (operationRef.current) return;

    if (
      targetIndex < 0
      || targetIndex >= visibleBlocks.length
      || targetIndex === currentIndexRef.current
    ) {
      return;
    }

    operationRef.current = true;

    try {
      const oldIndex = currentIndexRef.current;
      const oldBlock = visibleBlocks[oldIndex];
      const newBlock = visibleBlocks[targetIndex];
      const now = new Date().toISOString();
      const spentSeconds = Math.max(
        0,
        Math.round((Date.now() - blockStartedAtRef.current) / 1000),
      );

    if (oldBlock) {
      const oldProgress = progressRef.current.get(oldBlock.id);
      const status = markPrevious
        ? previousStatus
        : oldProgress?.status === 'current'
          ? 'pending'
          : oldProgress?.status || 'pending';

      await updateProgressStatus(oldBlock.id, status, {
        completed_at: status === 'completed' ? now : oldProgress?.completed_at || '',
        elapsed_seconds: asNumber(oldProgress?.elapsed_seconds) + spentSeconds,
      });
    }

    for (const row of progressRef.current.values()) {
      if (row.block_id !== newBlock.id && row.status === 'current') {
        await updateProgressStatus(row.block_id, 'pending');
      }
    }

    const newProgress = progressRef.current.get(newBlock.id);
    await updateProgressStatus(newBlock.id, 'current', {
      started_at: now,
      completed_at: '',
      visit_count: asNumber(newProgress?.visit_count) + 1,
    });

    setCurrentIndex(targetIndex);
    currentIndexRef.current = targetIndex;
    blockStartedAtRef.current = Date.now();

    if (sessionRef.current?.id) {
      await base44.entities.PresentationSession.update(sessionRef.current.id, {
        current_block_id: newBlock.id,
        status: 'active',
        paused_at: '',
      });
    }

      setRunning(true);
      resetControlsTimer();
    } catch (navigationError) {
      console.error(
        'Erro ao trocar de tópico:',
        navigationError,
      );

      toast({
        title: 'Não foi possível trocar de tópico',
        description:
          'A sessão foi mantida no tópico atual.',
        variant: 'destructive',
      });
    } finally {
      operationRef.current = false;
    }
  }, [resetControlsTimer, updateProgressStatus, visibleBlocks]);

  const goNext = useCallback(async () => {
    if (currentIndexRef.current >= visibleBlocks.length - 1) {
      setEndDialogOpen(true);
      return;
    }

    await activateIndex(currentIndexRef.current + 1, {
      markPrevious: autoMarkCompleted,
      previousStatus: 'completed',
    });
  }, [activateIndex, autoMarkCompleted, visibleBlocks.length]);

  const goPrevious = useCallback(async () => {
    if (currentIndexRef.current <= 0) return;
    await activateIndex(currentIndexRef.current - 1);
  }, [activateIndex]);

  const markCurrent = useCallback(async (status) => {
    if (!currentBlock) return;

    await updateProgressStatus(currentBlock.id, status, {
      completed_at: status === 'completed'
        ? new Date().toISOString()
        : '',
    });

    if (currentIndexRef.current < visibleBlocks.length - 1) {
      await activateIndex(currentIndexRef.current + 1);
    } else {
      setEndDialogOpen(true);
    }
  }, [activateIndex, currentBlock, updateProgressStatus, visibleBlocks.length]);

  const togglePause = useCallback(async () => {
    if (operationRef.current) return;

    operationRef.current = true;
    const nextRunning = !running;

    try {
      if (sessionRef.current?.id) {
        await base44.entities.PresentationSession.update(
          sessionRef.current.id,
          {
            status: nextRunning ? 'active' : 'paused',
            paused_at: nextRunning ? '' : new Date().toISOString(),
            elapsed_seconds: elapsedRef.current,
          },
        );
      }

      setRunning(nextRunning);
      resetControlsTimer();
    } catch (pauseError) {
      console.error(
        'Erro ao pausar ou continuar a apresentação:',
        pauseError,
      );

      toast({
        title: 'Não foi possível atualizar a sessão',
        description:
          'Tente novamente antes de continuar.',
        variant: 'destructive',
      });
    } finally {
      operationRef.current = false;
    }
  }, [resetControlsTimer, running, toast]);

  const handleContinueSession = useCallback(() => {
    applySessionState(pendingSession);
    setPendingSession(null);
    setResumeDialogOpen(false);
  }, [applySessionState, pendingSession]);

  const handleRestartSession = useCallback(async () => {
    if (visibleBlocks.length === 0 || operationRef.current) return;
    operationRef.current = true;
    setSaving(true);

    try {
      const sessionToClose = pendingSession?.session || sessionRef.current;
      const elapsedToSave = pendingSession
        ? asNumber(pendingSession.elapsed)
        : elapsedRef.current;

      if (sessionToClose?.id) {
        await base44.entities.PresentationSession.update(
          sessionToClose.id,
          {
            status: 'completed',
            finished_at: new Date().toISOString(),
            elapsed_seconds: elapsedToSave,
            notes: sessionToClose.notes || 'Sessão reiniciada pelo usuário.',
          },
        );
      }

      const created = await createNewSession(visibleBlocks);
      setSession(created?.session || null);
      setProgressRows(created?.progress || []);
      setCurrentIndex(0);
      currentIndexRef.current = 0;
      setElapsed(0);
      elapsedRef.current = 0;
      setRunning(true);
      setPendingSession(null);
      setResumeDialogOpen(false);
      setRestartDialogOpen(false);
      setShowSettingsSheet(false);
      blockStartedAtRef.current = Date.now();
      toast({
        title: 'Apresentação recomeçada',
        description: 'O histórico anterior foi preservado.',
      });
    } catch (restartError) {
      console.error('Erro ao reiniciar sessão:', restartError);
      toast({
        title: 'Não foi possível recomeçar',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      operationRef.current = false;
      setSaving(false);
    }
  }, [createNewSession, pendingSession, toast, visibleBlocks]);

  const requestRestartSession = useCallback(() => {
    if (confirmBeforeRestart) {
      setRestartDialogOpen(true);
      return;
    }

    handleRestartSession();
  }, [confirmBeforeRestart, handleRestartSession]);

  const handleExitPresentation = useCallback(async () => {
    if (operationRef.current || saving) {
      return;
    }

    operationRef.current = true;
    setSaving(true);

    try {
      const saved = await persistSession({
        forceStatus: 'paused',
        silent: false,
      });

      if (!saved && sessionRef.current?.id) {
        throw new Error('A sessão não pôde ser salva.');
      }

      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (fullscreenError) {
          console.warn(
            'Não foi possível sair da tela cheia:',
            fullscreenError,
          );
        }
      }

      navigate(`/presentations/${id}/editor`);
    } catch (error) {
      console.error(
        'Erro ao sair da apresentação:',
        error,
      );

      toast({
        title: 'Não foi possível sair com segurança',
        description:
          'Tente novamente para garantir que o progresso seja salvo.',
        variant: 'destructive',
      });
    } finally {
      operationRef.current = false;
      setSaving(false);
    }
  }, [id, navigate, persistSession, saving, toast]);

  const handleEndPresentation = useCallback(async () => {
    if (operationRef.current) return;

    operationRef.current = true;

    if (!sessionRef.current?.id) {
      operationRef.current = false;
      navigate(`/session-history/${id}`);
      return;
    }

    setSaving(true);

    try {
      const current = visibleBlocks[currentIndexRef.current];
      const currentProgress = current
        ? progressRef.current.get(current.id)
        : null;

      if (current && currentProgress?.status === 'current') {
        await updateProgressStatus(current.id, 'completed', {
          completed_at: new Date().toISOString(),
        });
      }

      const sessionSaved = await persistSession({
        forceStatus: 'completed',
        finishedAt: new Date().toISOString(),
        notes: endNotes.trim(),
        silent: false,
      });

      if (!sessionSaved) {
        throw new Error('A sessão não pôde ser finalizada.');
      }

      try {
        await base44.entities.Presentation.update(id, {
          status: 'completed',
          progress_percentage: 100,
          last_opened_at: new Date().toISOString(),
        });
      } catch (presentationUpdateError) {
        console.warn('Não foi possível atualizar a apresentação:', presentationUpdateError);
      }

      setEndDialogOpen(false);
      navigate(`/session-history/${id}`);
    } catch (endError) {
      console.error('Erro ao encerrar apresentação:', endError);
      toast({
        title: 'Não foi possível encerrar',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      operationRef.current = false;
      setSaving(false);
    }
  }, [endNotes, id, navigate, persistSession, toast, updateProgressStatus, visibleBlocks]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (resumeDialogOpen || endDialogOpen) return;

      const targetTag = event.target?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      if (['ArrowRight', 'PageDown', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        goNext();
      } else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(event.key)) {
        event.preventDefault();
        goPrevious();
      } else if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        togglePause();
      } else if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        requestFullscreen();
      } else if (event.key.toLowerCase() === 'l') {
        event.preventDefault();
        setShowTopicSheet(true);
      } else if (event.key === 'Escape') {
        setShowControls(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [endDialogOpen, goNext, goPrevious, requestFullscreen, resumeDialogOpen, togglePause]);

  const handleStageClick = (event) => {
    if (showTopicSheet || showSettingsSheet || endDialogOpen || resumeDialogOpen) {
      return;
    }

    const target = event.target;
    if (target.closest('button, [role="dialog"], [data-no-stage-click]')) return;

    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const leftZone = rect.width * 0.28;
    const rightZone = rect.width * 0.72;

    if (x < leftZone) {
      goPrevious();
    } else if (x > rightZone) {
      goNext();
    } else {
      setShowControls((value) => !value);
      resetControlsTimer();
    }
  };

  const themeClasses = darkMode
    ? 'bg-slate-950 text-slate-50'
    : 'bg-white text-slate-950';

  const mutedClasses = darkMode
    ? 'text-slate-300'
    : 'text-slate-600';

  const panelClasses = darkMode
    ? 'border-white/10 bg-slate-900/95 text-white'
    : 'border-black/10 bg-white/95 text-slate-950';

  const detailValue = DETAIL_LEVELS[detailLevel] || DETAIL_LEVELS.detailed;
  const controlSizeClass = accessibility.large_controls ? 'min-h-12 min-w-12' : '';
  const motionClass = accessibility.reduce_motion ? '[&_*]:!transition-none [&_*]:!animate-none' : '';
  const contrastClass = accessibility.high_contrast
    ? darkMode
      ? 'contrast-125'
      : 'contrast-125'
    : '';

  if (userLoading || loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 px-5 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">Não foi possível abrir</h1>
          <p className="mt-3 text-sm text-white/65">{error}</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => navigate('/presentations')}>
              Voltar
            </Button>
            <Button onClick={loadPage}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (visibleBlocks.length === 0) {
    return (
      <EmptyPresentation
        onBack={() => navigate(`/presentations/${id}/editor`)}
      />
    );
  }

  return (
    <div
      ref={stageRef}
      className={`fixed inset-0 z-[90] flex min-h-[100dvh] select-none flex-col overflow-hidden ${themeClasses} ${motionClass} ${contrastClass}`}
      onClick={handleStageClick}
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
    >
      {showProgress && (
        <div className="absolute inset-x-0 top-0 z-30 h-1 bg-current/10">
          <div
            className="h-full bg-blue-500 transition-[width] duration-500"
            style={{
              width: `${visibleBlocks.length > 0
                ? ((currentIndex + 1) / visibleBlocks.length) * 100
                : 0}%`,
            }}
          />
        </div>
      )}

      <header
        data-no-stage-click
        className={`absolute inset-x-0 top-0 z-40 px-3 pt-3 transition-all duration-300 sm:px-5 sm:pt-5 ${showControls ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0'}`}
      >
        <div className={`mx-auto flex max-w-7xl items-center gap-3 rounded-2xl border px-3 py-2 shadow-xl backdrop-blur-xl sm:px-4 ${panelClasses}`}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] opacity-45">
              Apresentando agora
            </p>
            <p className="truncate text-sm font-semibold sm:text-base">
              {presentation?.title || 'Apresentação'}
            </p>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <Badge variant="outline" className="border-current/15 bg-transparent text-current">
              Tópico {currentIndex + 1}/{visibleBlocks.length}
            </Badge>
            {showTimer && (
              <div className={`rounded-xl px-3 py-1.5 font-mono text-xs ${darkMode ? 'bg-white/8' : 'bg-black/[0.04]'}`}>
                {formatTime(elapsed)}
              </div>
            )}
            {!running && (
              <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                Pausada
              </Badge>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleExitPresentation}
            disabled={saving}
            className="shrink-0 gap-2 text-red-500 hover:bg-red-500/10 hover:text-red-500"
            aria-label="Sair da apresentação e voltar ao editor"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <main
        ref={scriptListRef}
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-32 pt-20 sm:px-5 sm:pb-36 sm:pt-24 lg:px-8"
      >
        <div className="mx-auto w-full max-w-5xl py-4 sm:py-7">
          <div className={`mb-4 rounded-2xl border px-4 py-3 shadow-sm ${panelClasses}`}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-45">Roteiro ao vivo</p>
                <p className="mt-0.5 truncate text-sm font-semibold sm:text-base">
                  Acompanhe o fluxo inteiro sem perder o ponto atual.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs opacity-60">
                <span>{currentIndex + 1} de {visibleBlocks.length}</span>
                {showTimer && <span className="font-mono">{formatTime(elapsed)}</span>}
              </div>
            </div>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {visibleBlocks.map((block, index) => {
              const row = progressMap.get(block.id);
              const meta = statusMeta(row?.status || (index === currentIndex ? 'current' : 'pending'));
              const StatusIcon = meta.icon;
              const isCurrent = index === currentIndex;
              const wasCompleted = row?.status === 'completed';
              const blockSummary = block.summary || block.content || '';

              return (
                <button
                  key={block.id}
                  type="button"
                  data-no-stage-click
                  data-current-topic={isCurrent ? 'true' : 'false'}
                  onClick={() => {
                    if (!isCurrent) activateIndex(index);
                    resetControlsTimer();
                  }}
                  className={`group w-full overflow-hidden rounded-[22px] border text-left transition-all ${
                    isCurrent
                      ? darkMode
                        ? 'border-blue-400/70 bg-blue-500/10 shadow-[0_18px_55px_rgba(37,99,235,0.18)] ring-1 ring-blue-400/30'
                        : 'border-blue-500/55 bg-blue-50 shadow-[0_18px_55px_rgba(37,99,235,0.12)] ring-1 ring-blue-500/20'
                      : darkMode
                        ? 'border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.045]'
                        : 'border-black/10 bg-white hover:border-black/20 hover:bg-slate-50'
                  } ${wasCompleted && !isCurrent ? 'opacity-58' : ''}`}
                  style={{ marginLeft: `${Math.min(block.visualDepth || 0, 3) * 10}px`, width: `calc(100% - ${Math.min(block.visualDepth || 0, 3) * 10}px)` }}
                >
                  <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold ${meta.className}`}>
                      {StatusIcon ? <StatusIcon className="h-4 w-4" /> : index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isCurrent && (
                          <Badge className="bg-blue-600 text-white hover:bg-blue-600">Agora</Badge>
                        )}
                        {block.is_essential && (
                          <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                            <Flag className="mr-1 h-3 w-3" /> Essencial
                          </Badge>
                        )}
                        <span className="ml-auto flex items-center gap-1 text-[11px] opacity-50">
                          {block.estimated_duration_seconds > 0 ? formatTime(block.estimated_duration_seconds) : 'Sem tempo definido'}
                        </span>
                      </div>

                      <h2
                        className={`mt-2 break-words font-bold leading-tight ${isCurrent ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'}`}
                        style={isCurrent ? { fontSize: `${Math.max(22, fontSize - 2)}px` } : undefined}
                      >
                        {block.title}
                      </h2>

                      {blockSummary && (
                        <p
                          className={`mt-2 whitespace-pre-wrap leading-relaxed ${isCurrent ? mutedClasses : 'opacity-58'} ${isCurrent ? '' : 'line-clamp-3'}`}
                          style={{ fontSize: `${isCurrent ? Math.max(MIN_FONT_SIZE, fontSize - 7) : 14}px` }}
                        >
                          {blockSummary}
                        </p>
                      )}

                      {isCurrent && detailValue >= 3 && block.content && block.content !== block.summary && (
                        <div
                          className="mt-4 whitespace-pre-wrap border-t border-current/10 pt-4 leading-[1.65]"
                          style={{ fontSize: `${Math.max(MIN_FONT_SIZE, fontSize - 4)}px` }}
                        >
                          {block.content}
                        </div>
                      )}

                      {isCurrent && detailValue >= 4 && showAdditional && block.additional_content && (
                        <div
                          className={`mt-4 whitespace-pre-wrap rounded-2xl border border-current/10 p-4 leading-relaxed ${darkMode ? 'bg-white/5' : 'bg-black/[0.025]'}`}
                          style={{ fontSize: `${Math.max(MIN_FONT_SIZE, fontSize - 7)}px` }}
                        >
                          {block.additional_content}
                        </div>
                      )}

                      {isCurrent && block.id && (
                        <div className="mt-4" onClick={(event) => event.stopPropagation()}>
                          <BlockAttachmentsDisplay blockId={block.id} darkMode={darkMode} />
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] opacity-48">
                        <span>{meta.label}</span>
                        <span>Tópico {index + 1}</span>
                        {isCurrent && <span>{progressPercent}% da apresentação concluída</span>}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-current/15 p-4 text-center text-xs opacity-50">
            Toque em qualquer tópico para ir diretamente até ele. O tópico atual permanece destacado enquanto você apresenta.
          </div>
        </div>
      </main>
      {showNotes && currentBlock?.presenter_notes && (
        <aside
          data-no-stage-click
          className={`absolute bottom-28 left-3 right-3 z-50 max-h-[44vh] overflow-y-auto rounded-[22px] border p-4 shadow-2xl backdrop-blur-xl sm:bottom-32 sm:left-auto sm:right-5 sm:w-[440px] sm:p-5 ${darkMode ? 'border-amber-300/20 bg-slate-900/95 text-slate-100' : 'border-amber-700/15 bg-amber-50/95 text-amber-950'}`}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wide">Minhas notas</span>
              <p className="mt-1 text-xs opacity-55">Só você vê este conteúdo.</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowNotes(false)}
              aria-label="Fechar notas"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="select-text whitespace-pre-wrap text-sm leading-relaxed sm:text-base">
            {currentBlock.presenter_notes}
          </p>
        </aside>
      )}

      {showNextBlock && nextBlock && showControls && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[112px] z-20 px-4 text-center xl:hidden">
          <div className={`mx-auto max-w-xl rounded-full border px-4 py-2 text-xs shadow-sm backdrop-blur ${panelClasses}`}>
            <span className="opacity-50">A seguir: </span>
            <span className="font-medium">{nextBlock.title}</span>
          </div>
        </div>
      )}

      <div
        data-no-stage-click
        className={`absolute inset-x-0 bottom-0 z-40 p-2.5 transition-all duration-300 sm:p-4 ${showControls ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-5 opacity-0'}`}
      >
        <div className={`mx-auto max-w-5xl rounded-[22px] border p-2 shadow-2xl backdrop-blur-xl ${panelClasses}`}>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <Button
              variant="ghost"
              onClick={goPrevious}
              disabled={!previousBlock || saving}
              className={`gap-2 px-3 sm:px-4 ${controlSizeClass}`}
              aria-label="Tópico anterior"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="hidden md:inline">Anterior</span>
            </Button>

            <div className="flex min-w-0 items-center justify-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowTopicSheet(true)}
                className={`gap-2 px-3 ${controlSizeClass}`}
                aria-label="Abrir roteiro"
              >
                <List className="h-5 w-5" />
                <span className="hidden lg:inline">Roteiro</span>
              </Button>

              <Button
                onClick={togglePause}
                className={`min-w-[112px] gap-2 rounded-xl px-4 shadow-sm sm:min-w-[138px] ${controlSizeClass}`}
                aria-label={running ? 'Pausar apresentação' : 'Continuar apresentação'}
              >
                {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                <span>{running ? 'Pausar' : 'Continuar'}</span>
              </Button>

              {currentBlock?.presenter_notes && (
                <Button
                  variant={showNotes ? 'secondary' : 'ghost'}
                  onClick={() => setShowNotes((value) => !value)}
                  className={`gap-2 px-3 ${controlSizeClass}`}
                  aria-label={showNotes ? 'Ocultar notas' : 'Mostrar notas'}
                >
                  <Text className="h-5 w-5" />
                  <span className="hidden lg:inline">Notas</span>
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className={controlSizeClass} aria-label="Mais ações">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56">
                  <DropdownMenuItem onClick={() => markCurrent('completed')}>
                    <Check className="mr-2 h-4 w-4 text-emerald-500" />
                    Marcar como apresentado
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => markCurrent('revisit')}>
                    <RotateCcw className="mr-2 h-4 w-4 text-amber-500" />
                    Quero voltar neste tópico
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => markCurrent('skipped')}>
                    <SkipForward className="mr-2 h-4 w-4" />
                    Pular este tópico
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={requestFullscreen}>
                    <Maximize2 className="mr-2 h-4 w-4" />
                    Usar tela cheia
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={requestRestartSession}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Recomeçar apresentação
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowSettingsSheet(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Ajustar visualização
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEndDialogOpen(true)} className="text-destructive">
                    <X className="mr-2 h-4 w-4" />
                    Encerrar apresentação
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button
              variant="ghost"
              onClick={goNext}
              disabled={saving}
              className={`gap-2 px-3 sm:px-4 ${controlSizeClass}`}
              aria-label="Próximo tópico"
            >
              <span className="hidden md:inline">Próximo</span>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-2 flex items-center justify-center gap-3 border-t border-current/10 px-2 pt-2 text-[11px] opacity-50 sm:justify-between">
            <span className="hidden sm:inline">{completedCount} apresentados</span>
            <span>{progressPercent}% concluído</span>
            <span className="hidden sm:inline">Plano: {formatTime(plannedSeconds)}</span>
          </div>
        </div>
      </div>

      <Sheet open={showTopicSheet} onOpenChange={setShowTopicSheet}>
        <SheetContent
          side="left"
          className={`w-[92vw] max-w-md overflow-y-auto ${darkMode ? 'border-white/10 bg-slate-950 text-white' : ''}`}
        >
          <SheetHeader className="text-left">
            <SheetTitle className={darkMode ? 'text-white' : ''}>
              Roteiro da apresentação
            </SheetTitle>
            <SheetDescription>
              Toque em um tópico para ir diretamente até ele.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-2">
            {visibleBlocks.map((block, index) => {
              const row = progressMap.get(block.id);
              const meta = statusMeta(row?.status || 'pending');
              const StatusIcon = meta.icon;
              const isCurrent = index === currentIndex;

              return (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => {
                    setShowTopicSheet(false);
                    activateIndex(index);
                  }}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${isCurrent ? 'border-blue-500 bg-blue-500/10' : darkMode ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/[0.03]'}`}
                >
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${meta.className}`}>
                    {StatusIcon ? <StatusIcon className="h-3.5 w-3.5" /> : index + 1}
                  </span>

                  <span className="min-w-0 flex-1" style={{ paddingLeft: `${Math.min(block.visualDepth, 3) * 10}px` }}>
                    <span className="block break-words text-sm font-semibold">
                      {block.title}
                    </span>
                    <span className="mt-1 block text-xs opacity-55">
                      {meta.label}
                      {block.estimated_duration_seconds > 0
                        ? ` • ${formatTime(block.estimated_duration_seconds)}`
                        : ''}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showSettingsSheet} onOpenChange={setShowSettingsSheet}>
        <SheetContent
          side="right"
          className={`w-[92vw] max-w-md overflow-y-auto ${darkMode ? 'border-white/10 bg-slate-950 text-white' : ''}`}
        >
          <SheetHeader className="text-left">
            <SheetTitle className={darkMode ? 'text-white' : ''}>
              Configurações da apresentação
            </SheetTitle>
            <SheetDescription>
              Ajuste a leitura sem modificar o conteúdo original.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <section>
              <Label className="text-sm font-semibold">Tamanho do texto</Label>
              <div className="mt-3 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setFontSize((value) => clamp(value - 2, MIN_FONT_SIZE, MAX_FONT_SIZE))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 rounded-xl border border-current/10 px-4 py-2 text-center font-mono">
                  {fontSize}px
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setFontSize((value) => clamp(value + 2, MIN_FONT_SIZE, MAX_FONT_SIZE))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </section>

            <section>
              <Label className="text-sm font-semibold">Nível de informação</Label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ['compact', 'Compacto'],
                  ['normal', 'Normal'],
                  ['detailed', 'Detalhado'],
                  ['complete', 'Completo'],
                ].map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    variant={detailLevel === value ? 'default' : 'outline'}
                    onClick={() => setDetailLevel(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-current/10 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="dark-mode">Modo escuro</Label>
                  <p className="text-xs opacity-55">Reduz o brilho durante a apresentação.</p>
                </div>
                <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="show-timer">Cronômetro</Label>
                  <p className="text-xs opacity-55">Exibe o tempo decorrido no topo.</p>
                </div>
                <Switch id="show-timer" checked={showTimer} onCheckedChange={setShowTimer} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="show-progress">Progresso</Label>
                  <p className="text-xs opacity-55">Exibe a linha de avanço no topo.</p>
                </div>
                <Switch id="show-progress" checked={showProgress} onCheckedChange={setShowProgress} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="show-next">Próximo tópico</Label>
                  <p className="text-xs opacity-55">Mostra uma prévia quando os controles aparecem.</p>
                </div>
                <Switch id="show-next" checked={showNextBlock} onCheckedChange={setShowNextBlock} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="show-additional">Conteúdo adicional</Label>
                  <p className="text-xs opacity-55">Disponível no nível completo.</p>
                </div>
                <Switch id="show-additional" checked={showAdditional} onCheckedChange={setShowAdditional} />
              </div>
            </section>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={requestFullscreen}>
                <Fullscreen className="mr-2 h-4 w-4" />
                Tela cheia
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowNotes((value) => !value)}
                disabled={!currentBlock?.presenter_notes}
              >
                {showNotes ? (
                  <EyeOff className="mr-2 h-4 w-4" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                {showNotes ? 'Ocultar notas' : 'Mostrar notas'}
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={requestRestartSession}
              disabled={saving}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Recomeçar apresentação
            </Button>

            <div className="rounded-xl border border-current/10 p-4 text-xs leading-relaxed opacity-65">
              Atalhos: setas para navegar, espaço para avançar, P para pausar,
              F para tela cheia e L para abrir o roteiro.
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={resumeDialogOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onEscapeKeyDown={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Apresentação em andamento</DialogTitle>
            <DialogDescription>
              Existe uma sessão salva. Você pode continuar exatamente do ponto
              anterior ou iniciar uma nova apresentação preservando o histórico.
            </DialogDescription>
          </DialogHeader>

          {pendingSession && (
            <div className="rounded-xl bg-muted p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>Tempo salvo</span>
                <strong>{formatTime(pendingSession.elapsed)}</strong>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span>Progresso</span>
                <strong>
                  {pendingSession.progress.filter((row) => row.status === 'completed').length}
                  {' / '}
                  {visibleBlocks.length}
                </strong>
              </div>
            </div>
          )}

          <DialogFooter className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={requestRestartSession} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Recomeçar
            </Button>
            <Button onClick={handleContinueSession} disabled={saving}>
              <Play className="mr-2 h-4 w-4" />
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recomeçar apresentação?</DialogTitle>
            <DialogDescription>
              A sessão atual será encerrada e uma nova começará no primeiro tópico.
              O histórico anterior será preservado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRestartDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleRestartSession} disabled={saving}>
              {saving ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Recomeçar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Encerrar apresentação?</DialogTitle>
            <DialogDescription>
              O progresso, o tempo e o histórico desta apresentação serão salvos.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
            <div className="rounded-xl bg-muted p-3 text-center">
              <p className="text-xl font-bold">{completedCount}</p>
              <p className="text-[11px] text-muted-foreground">Concluídos</p>
            </div>
            <div className="rounded-xl bg-muted p-3 text-center">
              <p className="text-xl font-bold">{skippedCount}</p>
              <p className="text-[11px] text-muted-foreground">Pulados</p>
            </div>
            <div className="rounded-xl bg-muted p-3 text-center">
              <p className="text-xl font-bold">{revisitCount}</p>
              <p className="text-[11px] text-muted-foreground">Revisitar</p>
            </div>
          </div>

          <div>
            <Label htmlFor="end-notes">Observações da apresentação</Label>
            <Textarea
              id="end-notes"
              value={endNotes}
              onChange={(event) => setEndNotes(event.target.value)}
              placeholder="Registre o que funcionou bem ou o que deseja melhorar..."
              className="mt-2 min-h-28"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEndDialogOpen(false)} disabled={saving}>
              Continuar apresentando
            </Button>
            <Button onClick={handleEndPresentation} disabled={saving}>
              {saving ? 'Salvando...' : 'Encerrar e salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}