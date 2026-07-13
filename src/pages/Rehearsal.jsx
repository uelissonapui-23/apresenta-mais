import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, List, Pause, Play, RotateCcw, Save, SkipForward, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import PresentationTimer from '@/components/shared/PresentationTimer';
import useCurrentUser from '@/hooks/useCurrentUser';
import useRehearsalSession from '@/hooks/useRehearsalSession';
import RehearsalContent from '@/components/rehearsal/RehearsalContent';
import RehearsalTopicList from '@/components/rehearsal/RehearsalTopicList';

export default function Rehearsal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [topicListOpen, setTopicListOpen] = useState(false);
  const [continueDialogOpen, setContinueDialogOpen] = useState(false);
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const [finishNotes, setFinishNotes] = useState('');

  const rehearsal = useRehearsalSession({ presentationId: id, userId: user?.id });
  const isRunning = rehearsal.session?.status === 'active';

  useEffect(() => {
    setContinueDialogOpen(Boolean(rehearsal.existingSession && !rehearsal.session));
  }, [rehearsal.existingSession, rehearsal.session]);

  const handleSelect = async (index) => {
    await rehearsal.setCurrent(index, 'pending');
    setTopicListOpen(false);
  };

  const handleFinish = async () => {
    await rehearsal.finish(finishNotes);
    navigate(`/session-history/${id}`);
  };

  if (rehearsal.loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  if (rehearsal.error) {
    return <div className="mx-auto max-w-lg p-6 text-center"><h1 className="text-xl font-bold">Não foi possível abrir o ensaio</h1><p className="mt-2 text-muted-foreground">{rehearsal.error}</p><div className="mt-5 flex justify-center gap-2"><Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button><Button onClick={rehearsal.load}>Tentar novamente</Button></div></div>;
  }

  if (!rehearsal.blocks.length) {
    return <div className="mx-auto max-w-lg p-6 pt-24 text-center"><h1 className="text-2xl font-bold">Nenhum tópico disponível</h1><p className="mt-2 text-muted-foreground">Adicione blocos visíveis antes de iniciar o ensaio.</p><Button className="mt-5" onClick={() => navigate(`/presentations/${id}/editor`)}>Voltar ao editor</Button></div>;
  }

  if (!rehearsal.session) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-xl items-center px-4 py-10">
        <Card className="w-full"><CardContent className="p-7 text-center sm:p-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><Play className="h-8 w-8 text-primary" /></div><h1 className="mt-5 text-2xl font-bold">Ensaiar: {rehearsal.presentation?.title}</h1><p className="mt-2 text-muted-foreground">{rehearsal.blocks.length} tópicos · aproximadamente {Math.max(1, Math.round(rehearsal.totalPlannedSeconds / 60))} minutos</p><Button size="lg" className="mt-6 w-full sm:w-auto" onClick={rehearsal.startNew} disabled={rehearsal.saving}><Play className="mr-2 h-5 w-5" />Iniciar ensaio</Button><div><Button variant="ghost" className="mt-3" onClick={() => navigate(-1)}>Voltar</Button></div></CardContent></Card>
        <Dialog open={continueDialogOpen} onOpenChange={setContinueDialogOpen}><DialogContent><DialogHeader><DialogTitle>Sessão em andamento</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Continue de onde parou ou recomece. O histórico anterior será preservado.</p><DialogFooter className="flex-col gap-2 sm:flex-col"><Button onClick={rehearsal.continueExisting} disabled={rehearsal.saving}>Continuar</Button><Button variant="outline" onClick={rehearsal.startNew} disabled={rehearsal.saving}>Recomeçar</Button><Button variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button></DialogFooter></DialogContent></Dialog>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 px-3 py-2 backdrop-blur sm:px-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><X className="mr-1 h-4 w-4" />Sair</Button>
          <PresentationTimer plannedSeconds={rehearsal.totalPlannedSeconds} isRunning={isRunning} initialElapsed={rehearsal.session.elapsed_seconds || 0} onElapsedChange={rehearsal.updateElapsed} />
          <Sheet open={topicListOpen} onOpenChange={setTopicListOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Abrir tópicos"><List className="h-5 w-5" /></Button></SheetTrigger><SheetContent side="right" className="w-[92vw] max-w-sm"><SheetHeader><SheetTitle>Tópicos do ensaio</SheetTitle></SheetHeader><div className="mt-5 max-h-[82vh]"><RehearsalTopicList blocks={rehearsal.blocks} currentIndex={rehearsal.currentIndex} statusFor={rehearsal.statusFor} onSelect={handleSelect} /></div></SheetContent></Sheet>
        </div>
        <div className="mx-auto mt-2 flex max-w-6xl items-center gap-3"><Progress value={rehearsal.progressPercent} className="h-1.5 flex-1" /><span className="text-xs tabular-nums text-muted-foreground">{rehearsal.completedCount}/{rehearsal.blocks.length}</span></div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-9"><RehearsalContent block={rehearsal.currentBlock} nextBlock={rehearsal.nextBlock} status={rehearsal.statusFor(rehearsal.currentBlock?.id)} /></main>

      <footer className="sticky bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur sm:p-4">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <Button variant="outline" size="sm" disabled={rehearsal.saving} onClick={() => rehearsal.markAndAdvance('skipped')}><SkipForward className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Pular</span></Button>
            <Button variant="outline" size="sm" disabled={rehearsal.saving} onClick={() => rehearsal.markAndAdvance('revisit')}><RotateCcw className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Revisitar</span></Button>
            {isRunning ? <Button variant="outline" size="sm" onClick={rehearsal.pause}><Pause className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Pausar</span></Button> : <Button variant="outline" size="sm" onClick={rehearsal.resume}><Play className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Retomar</span></Button>}
            <Button variant="destructive" size="sm" onClick={() => setFinishDialogOpen(true)}><Square className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Encerrar</span></Button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" size="icon" disabled={rehearsal.currentIndex === 0 || rehearsal.saving} onClick={() => rehearsal.setCurrent(rehearsal.currentIndex - 1, 'pending')}><ChevronLeft className="h-5 w-5" /></Button>
            <div className="text-center"><p className="text-sm font-medium">{rehearsal.currentIndex + 1} de {rehearsal.blocks.length}</p><p className="text-xs text-muted-foreground">{rehearsal.progressPercent}% concluído</p></div>
            <Button size="icon" disabled={rehearsal.saving} onClick={() => rehearsal.markAndAdvance('completed')}><Check className="h-5 w-5" /></Button>
          </div>
        </div>
      </footer>

      <Dialog open={finishDialogOpen} onOpenChange={setFinishDialogOpen}><DialogContent><DialogHeader><DialogTitle>Encerrar ensaio?</DialogTitle></DialogHeader><div className="space-y-3"><p className="text-sm text-muted-foreground">Seu progresso e tempo serão salvos no histórico.</p><Textarea value={finishNotes} onChange={(event) => setFinishNotes(event.target.value)} placeholder="Observações sobre este ensaio (opcional)" rows={4} /></div><DialogFooter><Button variant="outline" onClick={() => setFinishDialogOpen(false)}>Continuar ensaiando</Button><Button onClick={handleFinish}><Save className="mr-2 h-4 w-4" />Salvar e encerrar</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
