import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Clock, Play, Check, SkipForward, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/shared/EmptyState';
import ProgressIndicator from '@/components/shared/ProgressIndicator';
import useCurrentUser from '@/hooks/useCurrentUser';

export default function SessionHistory() {
  const { id } = useParams();
  const { user } = useCurrentUser();
  const [sessions, setSessions] = useState([]);
  const [presentation, setPresentation] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);
  const [sessionProgress, setSessionProgress] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [p, s, b] = await Promise.all([
        base44.entities.Presentation.get(id),
        base44.entities.PresentationSession.filter({ presentation_id: id, user_id: user.id }, '-created_date'),
        base44.entities.PresentationBlock.filter({ presentation_id: id }, 'order_index'),
      ]);
      setPresentation(p);
      setSessions(s);
      setBlocks(b);
      setLoading(false);
    };
    load();
  }, [id, user]);

  const handleExpand = async (sessionId) => {
    if (expandedSession === sessionId) { setExpandedSession(null); return; }
    const bp = await base44.entities.SessionBlockProgress.filter({ session_id: sessionId }, 'order_used');
    setSessionProgress(bp);
    setExpandedSession(sessionId);
  };

  const fmt = (s) => {
    if (!s) return '0:00';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const blockMap = Object.fromEntries(blocks.map(b => [b.id, b.title]));
  const typeLabels = { rehearsal: 'Ensaio', presentation: 'Apresentação' };
  const statusLabels = { active: 'Ativa', paused: 'Pausada', completed: 'Concluída' };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Link to={`/presentations/${id}/editor`}><Button variant="ghost" size="icon"><ChevronLeft className="w-5 h-5" /></Button></Link>
        <h1 className="text-xl font-bold">Histórico: {presentation?.title}</h1>
      </div>
      {sessions.length === 0 ? (
        <EmptyState icon={Clock} title="Nenhuma sessão" description="Suas sessões de ensaio e apresentação aparecerão aqui." />
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <Card key={s.id} className="cursor-pointer" onClick={() => handleExpand(s.id)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{typeLabels[s.session_type]}</Badge>
                    <Badge variant={s.status === 'completed' ? 'default' : 'secondary'}>{statusLabels[s.status]}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{s.started_at ? new Date(s.started_at).toLocaleDateString('pt-BR') : ''}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmt(s.elapsed_seconds)}</span>
                  <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-green-600" />{s.completed_count || 0}</span>
                  <span className="flex items-center gap-1"><SkipForward className="w-3.5 h-3.5" />{s.skipped_count || 0}</span>
                </div>
                {expandedSession === s.id && sessionProgress.length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-1" onClick={e => e.stopPropagation()}>
                    {sessionProgress.map(bp => (
                      <div key={bp.id} className="flex items-center gap-2 text-sm">
                        <ProgressIndicator status={bp.status} compact />
                        <span className="truncate">{blockMap[bp.block_id] || '(Bloco)'}</span>
                        {bp.elapsed_seconds > 0 && <span className="text-xs text-muted-foreground ml-auto">{fmt(bp.elapsed_seconds)}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}