import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Settings, X, Sun, Moon, Plus, Minus, List, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import ProgressIndicator from '@/components/shared/ProgressIndicator';
import useCurrentUser from '@/hooks/useCurrentUser';

export default function PresentMode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [blocks, setBlocks] = useState([]);
  const [presentation, setPresentation] = useState(null);
  const [session, setSession] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fontSize, setFontSize] = useState(24);
  const [darkMode, setDarkMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [isRunning, setIsRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const controlsTimeout = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const [p, b] = await Promise.all([
        base44.entities.Presentation.get(id),
        base44.entities.PresentationBlock.filter({ presentation_id: id, is_hidden: false, show_to_audience: true }, 'order_index'),
      ]);
      setPresentation(p);
      setBlocks(b);
      if (user) {
        const totalSeconds = b.reduce((s, bl) => s + (bl.estimated_duration_seconds || 0), 0);
        const sess = await base44.entities.PresentationSession.create({
          presentation_id: id, user_id: user.id, session_type: 'presentation',
          status: 'active', started_at: new Date().toISOString(), planned_duration_seconds: totalSeconds,
        });
        setSession(sess);
      }
      setLoading(false);
    };
    load();
  }, [id, user]);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const hideControlsAfterDelay = useCallback(() => {
    clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    if (showControls) hideControlsAfterDelay();
    return () => clearTimeout(controlsTimeout.current);
  }, [showControls, hideControlsAfterDelay]);

  const goNext = () => { if (currentIndex < blocks.length - 1) setCurrentIndex(i => i + 1); };
  const goPrev = () => { if (currentIndex > 0) setCurrentIndex(i => i - 1); };

  const handleTap = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x < third) goPrev();
    else if (x > third * 2) goNext();
    else setShowControls(true);
  };

  const handleEnd = async () => {
    if (session) {
      await base44.entities.PresentationSession.update(session.id, {
        status: 'completed', finished_at: new Date().toISOString(), elapsed_seconds: elapsed,
      });
    }
    navigate(`/session-history/${id}`);
  };

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-black"><div className="w-8 h-8 border-4 border-gray-700 border-t-white rounded-full animate-spin" /></div>;

  const currentBlock = blocks[currentIndex];
  const nextBlock = blocks[currentIndex + 1];
  const bg = darkMode ? 'bg-gray-950 text-gray-100' : 'bg-white text-gray-900';

  return (
    <div ref={containerRef} className={`fixed inset-0 ${bg} flex flex-col select-none cursor-default`} onClick={handleTap}>
      {/* Minimal progress */}
      <div className="w-full h-1 bg-gray-200 dark:bg-gray-800">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${((currentIndex + 1) / blocks.length) * 100}%` }} />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-16 overflow-y-auto">
        {currentBlock && (
          <div className="max-w-3xl w-full text-center space-y-6">
            <h1 className="font-bold leading-tight" style={{ fontSize: `${fontSize + 8}px` }}>{currentBlock.title}</h1>
            {currentBlock.summary && (
              <p className="opacity-70" style={{ fontSize: `${fontSize - 2}px` }}>{currentBlock.summary}</p>
            )}
            {currentBlock.content && (
              <p className="whitespace-pre-wrap opacity-90" style={{ fontSize: `${fontSize}px` }}>{currentBlock.content}</p>
            )}
          </div>
        )}
      </div>

      {/* Notes panel */}
      {showNotes && currentBlock?.presenter_notes && (
        <div className={`fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 p-4 rounded-xl shadow-xl ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-yellow-50 text-yellow-900'} border z-50`}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">Notas do apresentador</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowNotes(false)}><X className="w-4 h-4" /></Button>
          </div>
          <p className="text-sm whitespace-pre-wrap">{currentBlock.presenter_notes}</p>
        </div>
      )}

      {/* Next block preview */}
      {nextBlock && (
        <div className={`text-center py-2 text-xs opacity-50 ${showControls ? '' : 'hidden'}`}>
          Próximo: {nextBlock.title}
        </div>
      )}

      {/* Controls overlay */}
      {showControls && (
        <div className="fixed bottom-0 left-0 right-0 p-4 safe-area-bottom z-50" onClick={e => e.stopPropagation()}>
          <div className={`flex items-center justify-between max-w-xl mx-auto p-3 rounded-2xl shadow-xl backdrop-blur ${darkMode ? 'bg-gray-800/90' : 'bg-white/90'} border`}>
            <Button variant="ghost" size="icon" onClick={goPrev} disabled={currentIndex === 0}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFontSize(f => Math.max(14, f - 2))}>
                <Minus className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFontSize(f => Math.min(48, f + 2))}>
                <Plus className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDarkMode(!darkMode)}>
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowNotes(!showNotes)}>
                <Settings className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-0.5 px-2 text-xs font-mono">
                <Clock className="w-3 h-3" />{fmt(elapsed)}
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={handleEnd}>Encerrar</Button>
            </div>
            <Button variant="ghost" size="icon" onClick={goNext} disabled={currentIndex >= blocks.length - 1}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="text-center text-xs mt-2 opacity-50">{currentIndex + 1} / {blocks.length}</div>
        </div>
      )}
    </div>
  );
}