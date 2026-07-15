import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Copy,
  FileText,
  LayoutGrid,
  LayoutTemplate,
  ListTree,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const DEFAULT_FORM = {
  title: '',
  subtitle: '',
  description: '',
  presentation_type_id: '',
  objective_id: '',
  communication_style_id: '',
  audience: '',
  audience_knowledge_level: 'mixed',
  main_theme: '',
  main_message: '',
  estimated_duration_minutes: 30,
  theme_id: '',
  default_view_mode: 'structure',
};

const KNOWLEDGE_LEVELS = [
  {
    value: 'beginner',
    label: 'Iniciante',
    description: 'O público conhece pouco ou nada sobre o assunto.',
  },
  {
    value: 'intermediate',
    label: 'Intermediário',
    description: 'O público já conhece os conceitos principais.',
  },
  {
    value: 'advanced',
    label: 'Avançado',
    description: 'O público domina o assunto e espera aprofundamento.',
  },
  {
    value: 'mixed',
    label: 'Misto',
    description: 'O público possui níveis diferentes de conhecimento.',
  },
];

const VIEW_MODES = [
  {
    value: 'structure',
    label: 'Estrutura',
    description: 'Tópicos e subtópicos organizados por níveis.',
    icon: ListTree,
  },
  {
    value: 'text',
    label: 'Texto',
    description: 'Conteúdo exibido como um documento linear.',
    icon: FileText,
  },
  {
    value: 'cards',
    label: 'Cartões',
    description: 'Blocos visuais fáceis de mover e reorganizar.',
    icon: LayoutGrid,
  },
  {
    value: 'script',
    label: 'Roteiro',
    description: 'Visão compacta para preparar a fala.',
    icon: MessageSquareText,
  },
];

const CREATION_OPTIONS = [
  {
    id: 'blank',
    icon: FileText,
    title: 'Criar do zero',
    description: 'Comece com uma apresentação vazia e organize tudo livremente.',
  },
  {
    id: 'guided',
    icon: Wand2,
    title: 'Criar com ajuda',
    description: 'Responda perguntas e receba uma estrutura orientada ao seu objetivo.',
  },
  {
    id: 'template',
    icon: LayoutTemplate,
    title: 'Usar um modelo',
    description: 'Escolha uma estrutura pronta para adaptar ao seu conteúdo.',
  },
  {
    id: 'duplicate',
    icon: Copy,
    title: 'Duplicar existente',
    description: 'Reaproveite uma apresentação já criada sem alterar a original.',
  },
];

function normalizeDuration(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 30;
  }

  return Math.min(1440, Math.max(1, Math.round(number)));
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <span className="text-sm">Preparando as opções de criação...</span>
      </div>
    </div>
  );
}

function StepHeader({
  title,
  description,
  onBack,
  badge,
}) {
  return (
    <header className="space-y-4">
      {onBack && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="-ml-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      )}

      <div>
        {badge && (
          <Badge variant="secondary" className="mb-2">
            {badge}
          </Badge>
        )}

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
      </div>
    </header>
  );
}

function CreationOptionCard({ option, onSelect }) {
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
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {option.description}
            </p>
          </div>

          <div className="inline-flex items-center text-sm font-medium text-primary">
            Selecionar
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function TypeCard({ type, selected, onSelect }) {
  const fallbackColor = '#6366f1';
  const color = type.color || fallbackColor;

  return (
    <button
      type="button"
      onClick={() => onSelect(type.id)}
      className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Card
        className={`h-full transition-all ${
          selected
            ? 'border-primary ring-2 ring-primary/20 shadow-md'
            : 'border-border/70 hover:border-primary/30 hover:shadow-sm'
        }`}
      >
        <CardContent className="flex h-full items-start gap-3 p-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}1A` }}
          >
            <BookOpen className="h-5 w-5" style={{ color }} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight">{type.name}</h3>
              {selected && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </div>

            {type.description && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {type.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function ViewModeCard({ mode, selected, onSelect }) {
  const Icon = mode.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(mode.value)}
      className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Card
        className={`h-full transition-all ${
          selected
            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
            : 'border-border/70 hover:border-primary/30'
        }`}
      >
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="font-medium">{mode.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {mode.description}
            </p>
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
  const { user, loading: userLoading } = useCurrentUser();

  const initialMode = searchParams.get('mode');

  const [step, setStep] = useState(
    initialMode === 'guided' ? 'type-select' : 'choose',
  );

  const [creationMode, setCreationMode] = useState(
    initialMode === 'guided' ? 'guided' : 'blank',
  );

  const [types, setTypes] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [styles, setStyles] = useState([]);
  const [themes, setThemes] = useState([]);
  const [preference, setPreference] = useState(null);
  const [plan, setPlan] = useState(null);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [validationError, setValidationError] = useState('');

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const [
        typeRows,
        objectiveRows,
        styleRows,
        themeRows,
        preferenceRows,
        profileRows,
      ] = await Promise.all([
        base44.entities.PresentationType.filter(
          { active: true },
          'order_index',
        ),
        base44.entities.PresentationObjective.filter(
          { active: true },
          'order_index',
        ),
        base44.entities.CommunicationStyle.filter(
          { active: true },
          'order_index',
        ),
        base44.entities.PresentationTheme.filter(
          { active: true },
          'name',
        ),
        user?.id
          ? base44.entities.UserPreference.filter({ user_id: user.id })
          : Promise.resolve([]),
        user?.id
          ? base44.entities.UserProfile.filter({ user_id: user.id })
          : Promise.resolve([]),
      ]);

      const safeTypes = Array.isArray(typeRows) ? typeRows : [];
      const safeObjectives = Array.isArray(objectiveRows) ? objectiveRows : [];
      const safeStyles = Array.isArray(styleRows) ? styleRows : [];
      const safeThemes = Array.isArray(themeRows) ? themeRows : [];
      const currentPreference = Array.isArray(preferenceRows)
        ? preferenceRows[0] || null
        : null;
      const currentProfile = Array.isArray(profileRows)
        ? profileRows[0] || null
        : null;

      setTypes(safeTypes);
      setObjectives(safeObjectives);
      setStyles(safeStyles);
      setThemes(safeThemes);
      setPreference(currentPreference);

      if (currentProfile?.plan_id) {
        try {
          const planRows = await base44.entities.Plan.filter({
            id: currentProfile.plan_id,
            active: true,
          });
          setPlan(Array.isArray(planRows) ? planRows[0] || null : null);
        } catch (planError) {
          console.warn('Não foi possível carregar o plano atual:', planError);
          setPlan(null);
        }
      } else {
        setPlan(null);
      }

      setForm((current) => {
        const preferredThemeExists = safeThemes.some(
          (theme) => theme.id === currentPreference?.default_theme_id,
        );
        const preferredViewExists = VIEW_MODES.some(
          (mode) => mode.value === currentPreference?.default_view_mode,
        );

        return {
          ...current,
          theme_id:
            current.theme_id
            || (preferredThemeExists ? currentPreference.default_theme_id : ''),
          default_view_mode:
            current.default_view_mode !== DEFAULT_FORM.default_view_mode
              ? current.default_view_mode
              : preferredViewExists
                ? currentPreference.default_view_mode
                : DEFAULT_FORM.default_view_mode,
        };
      });
    } catch (error) {
      console.error('Erro ao carregar opções da apresentação:', error);
      setLoadError('Não foi possível carregar as opções de criação.');

      toast({
        title: 'Falha ao preparar a nova apresentação',
        description: 'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user?.id]);

  useEffect(() => {
    if (userLoading) {
      return;
    }

    loadOptions();
  }, [loadOptions, userLoading]);

  const selectedType = useMemo(
    () => types.find((item) => item.id === form.presentation_type_id),
    [form.presentation_type_id, types],
  );

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (validationError) {
      setValidationError('');
    }
  };

  const handleSelectCreationMode = (mode) => {
    if (mode === 'template') {
      navigate('/templates');
      return;
    }

    if (mode === 'duplicate') {
      navigate('/presentations');
      return;
    }

    setCreationMode(mode);

    if (mode === 'guided') {
      setStep('type-select');
      return;
    }

    setStep('form');
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      return 'Informe um título para a apresentação.';
    }

    if (creationMode === 'guided' && !form.presentation_type_id) {
      return 'Escolha o tipo de apresentação para continuar com o guia.';
    }

    if (normalizeDuration(form.estimated_duration_minutes) < 1) {
      return 'A duração deve ser maior que zero.';
    }

    return '';
  };

  const handleCreate = async () => {
    if (saving) {
      return;
    }

    const errorMessage = validateForm();

    if (errorMessage) {
      setValidationError(errorMessage);
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Usuário não identificado',
        description: 'Entre novamente na sua conta e tente criar a apresentação.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    setValidationError('');

    try {
      const maxPresentations = Number(plan?.max_presentations);

      if (Number.isFinite(maxPresentations) && maxPresentations >= 0) {
        const currentPresentations = await base44.entities.Presentation.filter({
          user_id: user.id,
          is_archived: false,
        });

        if (Array.isArray(currentPresentations)
          && currentPresentations.length >= maxPresentations) {
          throw new Error('PLAN_LIMIT_REACHED');
        }
      }

      const payload = {
        user_id: user.id,
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        presentation_type_id: form.presentation_type_id || '',
        objective_id: form.objective_id || '',
        communication_style_id: form.communication_style_id || '',
        audience: form.audience.trim(),
        audience_knowledge_level: form.audience_knowledge_level,
        main_theme: form.main_theme.trim(),
        main_message: form.main_message.trim(),
        estimated_duration_minutes: normalizeDuration(
          form.estimated_duration_minutes,
        ),
        theme_id: form.theme_id || '',
        default_view_mode: form.default_view_mode,
        status: 'draft',
        progress_percentage: 0,
        is_favorite: false,
        is_archived: false,
        current_version: 1,
        last_opened_at: new Date().toISOString(),
      };

      const presentation = await base44.entities.Presentation.create(payload);

      if (!presentation?.id) {
        throw new Error('A Base44 não retornou o identificador da apresentação.');
      }

      toast({
        title: 'Apresentação criada',
        description:
          creationMode === 'guided'
            ? 'Agora vamos montar sua estrutura passo a passo.'
            : 'Sua apresentação está pronta para receber os primeiros tópicos.',
      });

      if (creationMode === 'guided') {
        navigate(`/guided/${presentation.id}`);
        return;
      }

      navigate(`/presentations/${presentation.id}/editor`);
    } catch (error) {
      console.error('Erro ao criar apresentação:', error);

      if (error?.message === 'PLAN_LIMIT_REACHED') {
        toast({
          title: 'Limite de apresentações atingido',
          description: 'Seu plano atual não permite criar outra apresentação ativa. Arquive uma apresentação ou altere seu plano.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Não foi possível criar a apresentação',
        description: 'Nenhum conteúdo foi perdido. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (userLoading || loading) {
    return <LoadingState />;
  }

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4 py-10">
        <Card className="w-full">
          <CardContent className="space-y-5 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
              <RefreshCw className="h-6 w-6 text-destructive" />
            </div>

            <div>
              <h1 className="text-xl font-semibold">Não foi possível iniciar</h1>
              <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="outline" onClick={() => navigate('/')}> 
                Voltar ao início
              </Button>
              <Button onClick={loadOptions}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'choose') {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-7 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <StepHeader
          title="Como você quer começar?"
          description="Escolha o caminho mais confortável. Você poderá editar livremente tudo o que for criado."
          onBack={() => navigate('/')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {CREATION_OPTIONS.map((option) => (
            <CreationOptionCard
              key={option.id}
              option={option}
              onSelect={handleSelectCreationMode}
            />
          ))}
        </div>

        <Alert className="border-primary/20 bg-primary/5">
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Primeira apresentação?</AlertTitle>
          <AlertDescription>
            A opção “Criar com ajuda” faz perguntas simples e organiza suas respostas em uma estrutura inicial.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (step === 'type-select') {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-7 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <StepHeader
          title="Que tipo de apresentação você vai criar?"
          description="O tipo escolhido define as perguntas e a estrutura sugerida pelo assistente."
          badge="Criação guiada"
          onBack={() => {
            setStep('choose');
            setCreationMode('blank');
          }}
        />

        {types.length === 0 ? (
          <Alert>
            <BookOpen className="h-4 w-4" />
            <AlertTitle>Nenhum tipo disponível</AlertTitle>
            <AlertDescription>
              Cadastre ou ative tipos de apresentação na área administrativa antes de usar a criação guiada.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {types.map((type) => (
              <TypeCard
                key={type.id}
                type={type}
                selected={form.presentation_type_id === type.id}
                onSelect={(value) => updateForm('presentation_type_id', value)}
              />
            ))}
          </div>
        )}

        <div className="sticky bottom-3 z-10 rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <Button
            type="button"
            size="lg"
            className="w-full sm:ml-auto sm:flex sm:w-auto"
            disabled={!form.presentation_type_id}
            onClick={() => setStep('form')}
          >
            Continuar
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  const isGuided = creationMode === 'guided';

  return (
    <div className="mx-auto w-full max-w-4xl space-y-7 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <StepHeader
        title={isGuided ? 'Prepare sua apresentação guiada' : 'Crie sua apresentação'}
        description={
          isGuided
            ? 'Informe o contexto principal. O assistente usará esses dados para fazer perguntas mais adequadas.'
            : 'Defina a base da apresentação. Você poderá alterar todas essas informações depois.'
        }
        badge={isGuided ? selectedType?.name || 'Criação guiada' : 'Criação livre'}
        onBack={() => setStep(isGuided ? 'type-select' : 'choose')}
      />

      {validationError && (
        <Alert variant="destructive">
          <AlertTitle>Revise os dados</AlertTitle>
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="space-y-7 p-5 sm:p-7">
          <section className="space-y-4" aria-labelledby="identification-section">
            <div>
              <h2 id="identification-section" className="font-semibold">
                Identificação
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Comece pelo nome e pela ideia central da apresentação.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(event) => updateForm('title', event.target.value)}
                  placeholder="Ex.: A fé que permanece"
                  maxLength={160}
                  autoFocus
                />
                <p className="text-right text-xs text-muted-foreground">
                  {form.title.length}/160
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="subtitle">Subtítulo</Label>
                <Input
                  id="subtitle"
                  value={form.subtitle}
                  onChange={(event) => updateForm('subtitle', event.target.value)}
                  placeholder="Uma frase curta para complementar o título"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="main-theme">Tema principal</Label>
                <Input
                  id="main-theme"
                  value={form.main_theme}
                  onChange={(event) => updateForm('main_theme', event.target.value)}
                  placeholder="Ex.: Perseverança, liderança, vendas, educação..."
                  maxLength={160}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="main-message">Mensagem principal</Label>
                <Textarea
                  id="main-message"
                  value={form.main_message}
                  onChange={(event) => updateForm('main_message', event.target.value)}
                  placeholder="O que você deseja que o público entenda ou leve consigo ao final?"
                  className="min-h-24 resize-y"
                  maxLength={1000}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descrição ou observações iniciais</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) => updateForm('description', event.target.value)}
                  placeholder="Contexto, ocasião, restrições ou qualquer informação importante para preparar a apresentação."
                  className="min-h-24 resize-y"
                  maxLength={2000}
                />
              </div>
            </div>
          </section>

          <div className="border-t" />

          <section className="space-y-4" aria-labelledby="strategy-section">
            <div>
              <h2 id="strategy-section" className="font-semibold">
                Estratégia de comunicação
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Essas escolhas ajudam a manter a apresentação coerente com o público e o objetivo.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {!isGuided && (
                <div className="space-y-2">
                  <Label>Tipo de apresentação</Label>
                  <Select
                    value={form.presentation_type_id}
                    onValueChange={(value) => updateForm('presentation_type_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Objetivo</Label>
                <Select
                  value={form.objective_id}
                  onValueChange={(value) => updateForm('objective_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="O que deseja alcançar?" />
                  </SelectTrigger>
                  <SelectContent>
                    {objectives.map((objective) => (
                      <SelectItem key={objective.id} value={objective.id}>
                        {objective.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estilo de comunicação</Label>
                <Select
                  value={form.communication_style_id}
                  onValueChange={(value) => updateForm('communication_style_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Como deseja comunicar?" />
                  </SelectTrigger>
                  <SelectContent>
                    {styles.map((style) => (
                      <SelectItem key={style.id} value={style.id}>
                        {style.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="audience">Público-alvo</Label>
                <div className="relative">
                  <Users className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="audience"
                    value={form.audience}
                    onChange={(event) => updateForm('audience', event.target.value)}
                    placeholder="Ex.: Jovens, clientes, alunos..."
                    className="pl-9"
                    maxLength={200}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nível de conhecimento do público</Label>
                <Select
                  value={form.audience_knowledge_level}
                  onValueChange={(value) => updateForm('audience_knowledge_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWLEDGE_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {KNOWLEDGE_LEVELS.find(
                    (level) => level.value === form.audience_knowledge_level,
                  )?.description}
                </p>
              </div>
            </div>
          </section>

          <div className="border-t" />

          <section className="space-y-4" aria-labelledby="format-section">
            <div>
              <h2 id="format-section" className="font-semibold">
                Tempo e visual
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Escolha a duração planejada e como deseja abrir o editor.
              </p>
            </div>

            {preference && (
              <Alert className="border-primary/20 bg-primary/5">
                <Sparkles className="h-4 w-4" />
                <AlertTitle>Preferências aplicadas</AlertTitle>
                <AlertDescription>
                  O tema e a visualização inicial foram preenchidos com suas configurações padrão. Você pode alterá-los apenas para esta apresentação.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration">Duração estimada</Label>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="1440"
                    inputMode="numeric"
                    value={form.estimated_duration_minutes}
                    onChange={(event) =>
                      updateForm('estimated_duration_minutes', event.target.value)
                    }
                    className="pl-9 pr-16"
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-muted-foreground">
                    minutos
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tema visual</Label>
                <Select
                  value={form.theme_id}
                  onValueChange={(value) => updateForm('theme_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Usar tema padrão" />
                  </SelectTrigger>
                  <SelectContent>
                    {themes.map((theme) => (
                      <SelectItem key={theme.id} value={theme.id}>
                        {theme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Visualização inicial do editor</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {VIEW_MODES.map((mode) => (
                  <ViewModeCard
                    key={mode.value}
                    mode={mode}
                    selected={form.default_view_mode === mode.value}
                    onSelect={(value) => updateForm('default_view_mode', value)}
                  />
                ))}
              </div>
            </div>
          </section>
        </CardContent>
      </Card>

      <div className="sticky bottom-3 z-10 rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:static sm:flex sm:items-center sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <p className="hidden text-xs text-muted-foreground sm:block">
          Você poderá editar todas essas informações depois.
        </p>

        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none"
            disabled={saving}
            onClick={() => setStep(isGuided ? 'type-select' : 'choose')}
          >
            Voltar
          </Button>

          <Button
            type="button"
            size="lg"
            className="flex-[2] sm:flex-none"
            disabled={saving || !form.title.trim()}
            onClick={handleCreate}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Criando...
              </>
            ) : isGuided ? (
              <>
                Continuar com o guia
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            ) : (
              <>
                Criar apresentação
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="pb-4 text-center">
        <Button asChild variant="link" size="sm" className="text-muted-foreground">
          <Link to="/presentations">Cancelar e voltar para minhas apresentações</Link>
        </Button>
      </div>
    </div>
  );
}