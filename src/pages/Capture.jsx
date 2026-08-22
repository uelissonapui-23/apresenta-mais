import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpenCheck,
  Check,
  ChevronRight,
  CircleHelp,
  FileQuestion,
  Highlighter,
  Lightbulb,
  Loader2,
  MessageSquareQuote,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NOTE_TYPES = [
  { value: 'main_point', label: 'Ponto principal', icon: Highlighter, tone: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900' },
  { value: 'idea', label: 'Ideia', icon: Lightbulb, tone: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900' },
  { value: 'quote', label: 'Citação', icon: MessageSquareQuote, tone: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900' },
  { value: 'example', label: 'Exemplo', icon: BookOpenCheck, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900' },
  { value: 'question', label: 'Pergunta', icon: CircleHelp, tone: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900' },
  { value: 'research', label: 'Pesquisar depois', icon: FileQuestion, tone: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800' },
];

function typeMeta(value) {
  return NOTE_TYPES.find((item) => item.value === value) || NOTE_TYPES[0];
}

function sortNewest(rows) {
  return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const left = new Date(a.created_at || a.created_date || 0).getTime();
    const right = new Date(b.created_at || b.created_date || 0).getTime();
    return left - right;
  });
}

export default function Capture() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: userLoading } = useCurrentUser();
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState('main_point');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());

  const activeSession = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) || null,
    [activeSessionId, sessions],
  );

  const filteredNotes = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return notes;
    return notes.filter((note) => `${note.content || ''} ${note.source || ''}`.toLocaleLowerCase('pt-BR').includes(term));
  }, [notes, search]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const sessionRows = await base44.entities.CaptureSession.filter({ user_id: user.id }, '-updated_at');
      const nextSessions = Array.isArray(sessionRows) ? sessionRows : [];
      setSessions(nextSessions);
      const preferredId = activeSessionId || nextSessions[0]?.id || '';
      setActiveSessionId(preferredId);
      if (preferredId) {
        const noteRows = await base44.entities.CaptureNote.filter({ session_id: preferredId }, 'order_index');
        setNotes(sortNewest(noteRows));
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error('Erro ao carregar coleta:', error);
      toast({ title: 'Não foi possível carregar suas anotações', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [activeSessionId, toast, user?.id]);

  useEffect(() => {
    if (!userLoading && user?.id) load();
  }, [load, user?.id, userLoading]);

  useEffect(() => {
    if (!activeSessionId) return;
    let cancelled = false;
    base44.entities.CaptureNote.filter({ session_id: activeSessionId }, 'order_index')
      .then((rows) => { if (!cancelled) setNotes(sortNewest(rows)); })
      .catch((error) => console.error('Erro ao trocar coleta:', error));
    return () => { cancelled = true; };
  }, [activeSessionId]);

  const createSession = async () => {
    if (!user?.id || saving) return;
    setSaving(true);
    try {
      const created = await base44.entities.CaptureSession.create({
        user_id: user.id,
        title: `Nova coleta ${new Date().toLocaleDateString('pt-BR')}`,
        source_type: 'palestra',
        source_name: '',
        speaker_name: '',
        status: 'active',
      });
      setSessions((current) => [created, ...current]);
      setActiveSessionId(created.id);
      setNotes([]);
      setSelected(new Set());
    } catch (error) {
      console.error(error);
      toast({ title: 'Não foi possível criar a coleta', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateSessionField = async (field, value) => {
    if (!activeSession?.id) return;
    setSessions((current) => current.map((item) => item.id === activeSession.id ? { ...item, [field]: value } : item));
    try {
      await base44.entities.CaptureSession.update(activeSession.id, { [field]: value });
    } catch (error) {
      console.error(error);
      toast({ title: 'Não foi possível salvar esta informação', variant: 'destructive' });
    }
  };

  const addNote = async () => {
    const content = newText.trim();
    if (!activeSession?.id || !content || saving) return;
    setSaving(true);
    try {
      const created = await base44.entities.CaptureNote.create({
        session_id: activeSession.id,
        user_id: user.id,
        note_type: newType,
        content,
        source: activeSession.source_name || '',
        order_index: notes.length,
        is_highlighted: newType === 'main_point',
        used_in_presentation: false,
      });
      setNotes((current) => [...current, created]);
      setNewText('');
    } catch (error) {
      console.error(error);
      toast({ title: 'Não foi possível salvar a anotação', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (note) => {
    try {
      await base44.entities.CaptureNote.delete(note.id);
      setNotes((current) => current.filter((item) => item.id !== note.id));
      setSelected((current) => {
        const next = new Set(current);
        next.delete(note.id);
        return next;
      });
    } catch (error) {
      console.error(error);
      toast({ title: 'Não foi possível excluir a anotação', variant: 'destructive' });
    }
  };

  const toggleSelected = (id) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const createPresentationFromNotes = async () => {
    const chosen = notes.filter((note) => selected.has(note.id));
    if (!user?.id || chosen.length === 0 || saving) return;
    setSaving(true);
    try {
      const blockTypes = await base44.entities.BlockType.filter({ active: true }, 'order_index');
      const fallbackBlockType = blockTypes[0]?.id || null;
      const presentation = await base44.entities.Presentation.create({
        user_id: user.id,
        title: activeSession?.title || 'Apresentação a partir de anotações',
        subtitle: activeSession?.source_name || '',
        description: activeSession?.speaker_name ? `Conteúdo coletado com ${activeSession.speaker_name}` : 'Conteúdo criado a partir da área de Coleta.',
        audience: '',
        audience_knowledge_level: 'mixed',
        main_theme: activeSession?.title || '',
        main_message: '',
        estimated_duration_minutes: Math.max(5, chosen.length * 2),
        default_view_mode: 'structure',
        status: 'draft',
        progress_percentage: 0,
        is_favorite: false,
        is_archived: false,
        current_version: 1,
        last_opened_at: new Date().toISOString(),
      });
      for (let index = 0; index < chosen.length; index += 1) {
        const note = chosen[index];
        const meta = typeMeta(note.note_type);
        await base44.entities.PresentationBlock.create({
          presentation_id: presentation.id,
          parent_id: null,
          block_type_id: fallbackBlockType,
          title: note.content.slice(0, 90),
          summary: meta.label,
          content: note.content,
          additional_content: note.source ? `Fonte: ${note.source}` : '',
          presenter_notes: '',
          order_index: index,
          depth_level: 0,
          importance_level: note.note_type === 'main_point' ? 5 : 3,
          estimated_duration_seconds: 90,
          is_essential: note.note_type === 'main_point',
          is_hidden: false,
          is_collapsed: false,
          show_to_audience: true,
        });
        await base44.entities.CaptureNote.update(note.id, { used_in_presentation: true, presentation_id: presentation.id });
      }
      toast({ title: 'Rascunho criado', description: `${chosen.length} anotações viraram tópicos editáveis.` });
      navigate(`/presentations/${presentation.id}/editor`);
    } catch (error) {
      console.error('Erro ao criar apresentação da coleta:', error);
      toast({ title: 'Não foi possível criar a apresentação', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (userLoading || loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-2 gap-1"><NotebookPen className="h-3.5 w-3.5" /> Coleta</Badge>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Capture agora. Organize depois.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Anote os pontos de uma palestra, aula, reunião ou estudo sem interromper seu raciocínio. Depois transforme o que importa em apresentação.</p>
        </div>
        <Button onClick={createSession} disabled={saving}><Plus className="mr-2 h-4 w-4" /> Nova coleta</Button>
      </header>

      {sessions.length === 0 ? (
        <Card className="border-dashed"><CardContent className="flex flex-col items-center p-10 text-center"><NotebookPen className="h-10 w-10 text-primary" /><h2 className="mt-4 text-xl font-semibold">Comece sua primeira coleta</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">Crie um caderno temporário para registrar ideias enquanto elas acontecem.</p><Button className="mt-5" onClick={createSession}>Criar coleta</Button></CardContent></Card>
      ) : (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-2xl border bg-card p-3 xl:sticky xl:top-20 xl:self-start">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suas coletas</p>
            <div className="space-y-1">
              {sessions.map((session) => (
                <button key={session.id} type="button" onClick={() => { setActiveSessionId(session.id); setSelected(new Set()); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${session.id === activeSessionId ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  <NotebookPen className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{session.title}</span><span className={`block truncate text-xs ${session.id === activeSessionId ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{session.source_name || session.source_type || 'Coleta livre'}</span></span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
                </button>
              ))}
            </div>
          </aside>

          <section className="min-w-0 space-y-4">
            <Card className="overflow-hidden border-border/70 shadow-sm">
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input value={activeSession?.title || ''} onChange={(e) => updateSessionField('title', e.target.value)} placeholder="Título da coleta" className="text-base font-semibold" />
                  <Input value={activeSession?.source_name || ''} onChange={(e) => updateSessionField('source_name', e.target.value)} placeholder="Palestra, curso, livro ou origem" />
                  <Input value={activeSession?.speaker_name || ''} onChange={(e) => updateSessionField('speaker_name', e.target.value)} placeholder="Palestrante / autor (opcional)" className="md:col-span-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent shadow-sm">
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Plus className="h-5 w-5" /></div><div><h2 className="font-semibold">Anotação rápida</h2><p className="text-sm text-muted-foreground">Escreva primeiro. Classifique com um toque.</p></div></div>
                <Textarea value={newText} onChange={(e) => setNewText(e.target.value)} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') addNote(); }} placeholder="O que vale a pena lembrar daqui?" className="min-h-28 resize-y bg-background text-base leading-relaxed" />
                <div className="flex flex-wrap gap-2">
                  {NOTE_TYPES.map((type) => { const Icon = type.icon; const active = type.value === newType; return <button key={type.value} type="button" onClick={() => setNewType(type.value)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition ${active ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:border-primary/40'}`}><Icon className="h-3.5 w-3.5" />{type.label}</button>; })}
                </div>
                <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Ctrl + Enter salva sem tirar sua atenção.</span><Button onClick={addNote} disabled={!newText.trim() || saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Adicionar</Button></div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nas anotações" className="pl-9" /></div>
              {selected.size > 0 && <Button onClick={createPresentationFromNotes} disabled={saving} className="shrink-0"><Sparkles className="mr-2 h-4 w-4" />Transformar {selected.size} em apresentação</Button>}
            </div>

            <div className="space-y-3">
              {filteredNotes.map((note, index) => {
                const meta = typeMeta(note.note_type); const Icon = meta.icon; const checked = selected.has(note.id);
                return (
                  <Card key={note.id} className={`overflow-hidden transition ${checked ? 'border-primary ring-2 ring-primary/10' : 'border-border/70'}`}>
                    <CardContent className="p-0"><div className="flex items-start gap-3 p-4 sm:p-5"><button type="button" onClick={() => toggleSelected(note.id)} className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${checked ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'}`} aria-label="Selecionar anotação">{checked && <Check className="h-4 w-4" />}</button><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant="outline" className={meta.tone}><Icon className="mr-1 h-3 w-3" />{meta.label}</Badge>{note.used_in_presentation && <Badge variant="secondary">Já usado</Badge>}<span className="text-xs text-muted-foreground">#{index + 1}</span></div><p className="whitespace-pre-wrap text-sm leading-relaxed sm:text-base">{note.content}</p></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => deleteNote(note)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></CardContent>
                  </Card>
                );
              })}
              {filteredNotes.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma anotação encontrada.</div>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
