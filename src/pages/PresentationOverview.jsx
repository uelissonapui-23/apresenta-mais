import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Play, Pencil, Monitor, Clock, AlertTriangle, CheckCircle2, Star, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';

export default function PresentationOverview() {
  const { id } = useParams();
  const [presentation, setPresentation] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [p, b] = await Promise.all([
        base44.entities.Presentation.get(id),
        base44.entities.PresentationBlock.filter({ presentation_id: id }, 'order_index'),
      ]);
      setPresentation(p);
      setBlocks(b);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  const sections = blocks.filter(b => b.depth_level === 0);
  const topics = blocks.filter(b => b.depth_level === 1);
  const essential = blocks.filter(b => b.is_essential);
  const optional = blocks.filter(b => !b.is_essential && !b.is_hidden);
  const totalSeconds = blocks.reduce((s, b) => s + (b.estimated_duration_seconds || 0), 0);
  const emptyContent = blocks.filter(b => !b.content && !b.summary);
  const plannedMinutes = presentation?.estimated_duration_minutes || 0;
  const actualMinutes = Math.round(totalSeconds / 60);

  const checks = [
    { label: 'Possui introdução', ok: blocks.some(b => b.title?.toLowerCase().includes('introdução') || b.title?.toLowerCase().includes('abertura')) },
    { label: 'Possui desenvolvimento', ok: sections.length >= 2 },
    { label: 'Possui conclusão', ok: blocks.some(b => b.title?.toLowerCase().includes('conclusão') || b.title?.toLowerCase().includes('encerramento')) },
    { label: 'Possui objetivo', ok: !!presentation?.objective_id },
    { label: 'Tempo não excede o planejado', ok: plannedMinutes <= 0 || actualMinutes <= plannedMinutes },
    { label: 'Todos os blocos têm conteúdo', ok: emptyContent.length === 0 },
    { label: 'Menos de 8 tópicos principais', ok: sections.length <= 8 },
  ];

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to={`/presentations/${id}/editor`}><Button variant="ghost" size="icon"><ChevronLeft className="w-5 h-5" /></Button></Link>
          <h1 className="text-xl font-bold">{presentation?.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{sections.length}</p><p className="text-xs text-muted-foreground">Seções</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{topics.length}</p><p className="text-xs text-muted-foreground">Tópicos</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{actualMinutes}</p><p className="text-xs text-muted-foreground">Min. estimados</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{essential.length}</p><p className="text-xs text-muted-foreground">Essenciais</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Verificações</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              {c.ok ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />}
              <span className={`text-sm ${c.ok ? 'text-foreground' : 'text-yellow-700'}`}>{c.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Estrutura</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {blocks.filter(b => !b.is_hidden).sort((a, b) => a.order_index - b.order_index).map(b => (
            <div key={b.id} className="flex items-center gap-2 py-1" style={{ paddingLeft: `${b.depth_level * 16}px` }}>
              {b.is_essential && <Star className="w-3 h-3 text-primary fill-primary shrink-0" />}
              <span className={`text-sm ${b.depth_level === 0 ? 'font-semibold' : ''}`}>{b.title || '(Sem título)'}</span>
              <span className="text-xs text-muted-foreground ml-auto">{Math.round((b.estimated_duration_seconds || 0) / 60)}min</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to={`/presentations/${id}/editor`} className="flex-1">
          <Button variant="outline" className="w-full gap-2"><Pencil className="w-4 h-4" />Editar</Button>
        </Link>
        <Link to={`/rehearsal/${id}`} className="flex-1">
          <Button variant="outline" className="w-full gap-2"><Play className="w-4 h-4" />Ensaiar</Button>
        </Link>
        <Link to={`/present/${id}`} className="flex-1">
          <Button className="w-full gap-2"><Monitor className="w-4 h-4" />Apresentar</Button>
        </Link>
      </div>
    </div>
  );
}