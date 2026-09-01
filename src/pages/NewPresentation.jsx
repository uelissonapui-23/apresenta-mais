import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  FileText,
  LayoutTemplate,
  Loader2,
  Wand2,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CREATION_OPTIONS = [
  {
    id: 'blank',
    icon: FileText,
    title: 'Criar do zero',
    description: 'Para quem já sabe o que quer criar. Dê um título e vá direto ao editor.',
  },
  {
    id: 'guided',
    icon: Wand2,
    title: 'Criação guiada',
    description: 'Receba ajuda passo a passo com perguntas para organizar sua apresentação.',
  },
  {
    id: 'template',
    icon: LayoutTemplate,
    title: 'Usar um modelo',
    description: 'Comece com uma estrutura pronta e adapte ao seu conteúdo.',
  },
  {
    id: 'duplicate',
    icon: Copy,
    title: 'Duplicar existente',
    description: 'Reaproveite uma apresentação já criada sem alterar a original.',
  },
];

function CreationOption({ option, onSelect }) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      className="h-full min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Card className="h-full border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{option.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{option.description}</p>
          </div>
          <div className="inline-flex items-center text-sm font-medium text-primary">
            Selecionar <ArrowRight className="ml-1.5 h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

export default function NewPresentation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading } = useCurrentUser();
  const initialMode = searchParams.get('mode');

  const [step, setStep] = useState(initialMode === 'guided' ? 'guided' : 'choose');
  const [title, setTitle] = useState('');
  const [types, setTypes] = useState([]);
  const [typeId, setTypeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (step !== 'guided') return;
    base44.entities.PresentationType
      .filter({ active: true }, 'order_index')
      .then((rows) => setTypes(Array.isArray(rows) ? rows : []))
      .catch(() => setTypes([]));
  }, [step]);

  const chooseMode = (mode) => {
    setError('');
    if (mode === 'template') return navigate('/templates');
    if (mode === 'duplicate') return navigate('/presentations');
    setStep(mode);
  };

  const createPresentation = async (guided = false) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Digite um título para continuar.');
      return;
    }
    if (!user?.id) {
      setError('Não foi possível identificar sua conta. Entre novamente e tente de novo.');
      return;
    }
    if (guided && !typeId) {
      setError('Escolha o tipo de apresentação para iniciar a criação guiada.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const presentation = await base44.entities.Presentation.create({
        user_id: user.id,
        title: cleanTitle,
        presentation_type_id: guided ? typeId : null,
        objective_id: null,
        communication_style_id: null,
        theme_id: null,
        subtitle: '',
        description: '',
        audience: '',
        audience_knowledge_level: 'mixed',
        main_theme: '',
        main_message: '',
        estimated_duration_minutes: 30,
        default_view_mode: 'structure',
        status: 'draft',
        progress_percentage: 0,
        is_favorite: false,
        is_archived: false,
        current_version: 1,
        last_opened_at: new Date().toISOString(),
      });

      if (!presentation?.id) throw new Error('Apresentação sem identificador.');

      toast({
        title: guided ? 'Criação guiada iniciada' : 'Apresentação criada',
        description: guided
          ? 'Agora vamos organizar sua apresentação passo a passo.'
          : 'Pronto. Você já pode começar a escrever.',
      });

      navigate(guided
        ? `/guided/${presentation.id}`
        : `/presentations/${presentation.id}/editor`);
    } catch (creationError) {
      console.error('Erro ao criar apresentação:', creationError);
      setError('Não foi possível criar agora. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === 'choose') {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-7 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header>
          <Button type="button" variant="ghost" size="sm" className="-ml-2 mb-3" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Como você quer começar?</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Escolha criação rápida se você já sabe o que quer fazer, ou criação guiada se quiser ajuda.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          {CREATION_OPTIONS.map((option) => (
            <CreationOption key={option.id} option={option} onSelect={chooseMode} />
          ))}
        </div>
      </div>
    );
  }

  if (step === 'blank') {
    return (
      <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-6 sm:py-10">
        <header>
          <Button type="button" variant="ghost" size="sm" className="-ml-2 mb-3" onClick={() => setStep('choose')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <h1 className="text-2xl font-bold">Criar do zero</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sem questionário. Informe apenas o título e vá direto para o editor.
          </p>
        </header>

        {error && <Alert variant="destructive"><AlertTitle>Não foi possível continuar</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

        <Card>
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="space-y-2">
              <Label htmlFor="quick-title">Título da apresentação</Label>
              <Input
                id="quick-title"
                value={title}
                onChange={(event) => { setTitle(event.target.value); setError(''); }}
                placeholder="Ex.: A fé que permanece"
                maxLength={160}
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && title.trim() && !saving) createPresentation(false);
                }}
              />
            </div>
            <Button className="w-full" size="lg" disabled={!title.trim() || saving} onClick={() => createPresentation(false)}>
              {saving ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Criando...</> : <>Criar e abrir editor <ArrowRight className="ml-2 h-5 w-5" /></>}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:py-10">
      <header>
        <Button type="button" variant="ghost" size="sm" className="-ml-2 mb-3" onClick={() => setStep('choose')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <div className="mb-3 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Criação guiada
        </div>
        <h1 className="text-2xl font-bold">Vamos criar juntos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aqui sim o aplicativo vai conduzir você com perguntas e sugestões passo a passo.
        </p>
      </header>

      {error && <Alert variant="destructive"><AlertTitle>Revise os dados</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      <Card>
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="guided-title">Título</Label>
            <Input id="guided-title" value={title} onChange={(event) => { setTitle(event.target.value); setError(''); }} placeholder="Dê um nome à apresentação" maxLength={160} autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Tipo de apresentação</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {types.map((type) => (
                <button
                  type="button"
                  key={type.id}
                  onClick={() => { setTypeId(type.id); setError(''); }}
                  className={`rounded-xl border p-3 text-left text-sm transition-colors ${typeId === type.id ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted/50'}`}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>
          <Button className="w-full" size="lg" disabled={!title.trim() || !typeId || saving} onClick={() => createPresentation(true)}>
            {saving ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Preparando...</> : <>Começar criação guiada <ArrowRight className="ml-2 h-5 w-5" /></>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
