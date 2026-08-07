import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  GraduationCap,
  LayoutList,
  Lightbulb,
  Loader2,
  MessageSquareText,
  Moon,
  Presentation,
  Settings2,
  Sparkles,
  Sun,
  Target,
  UserRound,
  Wand2,
} from 'lucide-react';

import useCurrentUser from '@/hooks/useCurrentUser';
import { saveUserProfile } from '@/services/profileRepository';
import { getUserPreference, saveUserPreference } from '@/services/userPreferenceRepository';

import BrandLogo from '@/components/BrandLogo';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

import {
  Card,
  CardContent,
} from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';

import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const TOTAL_STEPS = 7;

const DEFAULT_ACCESSIBILITY = {
  high_contrast: false,
  reduce_motion: false,
  large_controls: false,
  left_aligned_text: true,
  increased_spacing: false,
};

const USAGE_OPTIONS = [
  {
    id: 'sermon',
    title: 'Pregações e estudos',
    description:
      'Organize mensagens, estudos bíblicos, devocionais e testemunhos.',
    icon: BookOpen,
  },
  {
    id: 'class',
    title: 'Aulas e treinamentos',
    description:
      'Crie conteúdos didáticos, exercícios, revisões e materiais de apoio.',
    icon: GraduationCap,
  },
  {
    id: 'talk',
    title: 'Palestras e eventos',
    description:
      'Estruture histórias, argumentos, exemplos e chamadas para ação.',
    icon: Presentation,
  },
  {
    id: 'business',
    title: 'Reuniões e projetos',
    description:
      'Apresente propostas, resultados, planos, projetos e ideias.',
    icon: BriefcaseBusiness,
  },
];

const EXPERIENCE_OPTIONS = [
  {
    id: 'first_time',
    title: 'Nunca montei uma apresentação',
    description:
      'Quero orientação completa desde a primeira ideia.',
    icon: CircleHelp,
  },
  {
    id: 'beginner',
    title: 'Estou começando',
    description:
      'Já apresentei algumas vezes, mas ainda preciso de ajuda.',
    icon: Lightbulb,
  },
  {
    id: 'intermediate',
    title: 'Tenho alguma experiência',
    description:
      'Quero organizar melhor, ganhar tempo e não me perder.',
    icon: Target,
  },
  {
    id: 'experienced',
    title: 'Apresento com frequência',
    description:
      'Quero um fluxo rápido, flexível e profissional.',
    icon: Sparkles,
  },
];

const NEED_OPTIONS = [
  {
    id: 'organize_ideas',
    title: 'Organizar minhas ideias',
    description:
      'Transformar pensamentos soltos em uma sequência clara.',
    icon: Settings2,
  },
  {
    id: 'guided_creation',
    title: 'Aprender a montar apresentações',
    description:
      'Receber perguntas e orientação conforme o tipo escolhido.',
    icon: Wand2,
  },
  {
    id: 'time_control',
    title: 'Controlar melhor o tempo',
    description:
      'Planejar a duração e identificar assuntos longos.',
    icon: Clock3,
  },
  {
    id: 'not_get_lost',
    title: 'Não me perder ao apresentar',
    description:
      'Ver tópico atual, próximos assuntos e o que já foi apresentado.',
    icon: MessageSquareText,
  },
];

const DETAIL_OPTIONS = [
  {
    value: 'compact',
    title: 'Compacto',
    description:
      'Mostra somente os títulos dos tópicos.',
  },
  {
    value: 'normal',
    title: 'Normal',
    description:
      'Mostra títulos e resumos. Recomendado para começar.',
  },
  {
    value: 'detailed',
    title: 'Detalhado',
    description:
      'Mostra título, resumo e conteúdo principal.',
  },
  {
    value: 'complete',
    title: 'Completo',
    description:
      'Mostra todo o conteúdo e notas quando permitido.',
  },
];

const VIEW_OPTIONS = [
  {
    value: 'structure',
    title: 'Estrutura',
    description:
      'Tópicos e subtópicos organizados em níveis.',
  },
  {
    value: 'text',
    title: 'Texto linear',
    description:
      'Conteúdo em formato semelhante a um documento.',
  },
  {
    value: 'cards',
    title: 'Cartões',
    description:
      'Cada ideia em um cartão fácil de reorganizar.',
  },
  {
    value: 'script',
    title: 'Roteiro',
    description:
      'Visão enxuta com os pontos principais e o tempo.',
  },
];

const FINISH_OPTIONS = [
  {
    id: 'guided',
    title: 'Criar minha primeira apresentação com ajuda',
    description:
      'O aplicativo fará perguntas e montará uma estrutura para você.',
    icon: Wand2,
    className:
      'bg-primary/10 text-primary',
  },
  {
    id: 'template',
    title: 'Explorar modelos prontos',
    description:
      'Escolha uma estrutura pronta e adapte ao seu conteúdo.',
    icon: LayoutList,
    className:
      'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  },
  {
    id: 'dashboard',
    title: 'Ir para o painel',
    description:
      'Conheça o aplicativo antes de começar uma apresentação.',
    icon: Sparkles,
    className:
      'bg-muted text-foreground',
  },
];

function normalizePhone(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 11);
}

function formatPhone(value) {
  const digits = normalizePhone(value);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function parseAccessibility(value) {
  if (!value) {
    return {
      ...DEFAULT_ACCESSIBILITY,
    };
  }

  if (typeof value === 'object') {
    return {
      ...DEFAULT_ACCESSIBILITY,
      ...value,
    };
  }

  try {
    return {
      ...DEFAULT_ACCESSIBILITY,
      ...JSON.parse(value),
    };
  } catch {
    return {
      ...DEFAULT_ACCESSIBILITY,
    };
  }
}

function uniqueById(rows) {
  const map = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.id) {
      map.set(row.id, row);
    }
  }

  return [...map.values()];
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

function OnboardingLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />

        <p className="text-sm">
          Preparando sua configuração...
        </p>
      </div>
    </div>
  );
}

function StepHeader({
  step,
  title,
  description,
}) {
  const progress = (
    ((step + 1) / TOTAL_STEPS) * 100
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          Etapa {step + 1} de {TOTAL_STEPS}
        </span>

        <span>
          {Math.round(progress)}%
        </span>
      </div>

      <Progress
        value={progress}
        className="h-2"
      />

      <div className="mt-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
    </div>
  );
}

function SelectableCard({
  selected,
  icon: Icon,
  title,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all',
        selected
          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/25'
          : 'border-border bg-background hover:border-primary/35 hover:bg-muted/30',
      ].join(' ')}
    >
      <div
        className={[
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
          selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground/75',
        ].join(' ')}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold leading-tight">
            {title}
          </p>

          <div
            className={[
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted-foreground/30',
            ].join(' ')}
          >
            {selected && (
              <Check className="h-3.5 w-3.5" />
            )}
          </div>
        </div>

        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </button>
  );
}

function PreferenceSwitch({
  title,
  description,
  checked,
  onCheckedChange,
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t pt-3 first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <p className="font-medium">
          {title}
        </p>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    user,
    profile,
    loading: userLoading,
    refreshProfile,
  } = useCurrentUser();

  const [step, setStep] = useState(0);
  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const initializeLockRef = useRef(false);
  const saveLockRef = useRef(false);
  const skipLockRef = useRef(false);

  const [preferenceId, setPreferenceId] = useState(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [about, setAbout] = useState('');

  const [primaryUsage, setPrimaryUsage] = useState('sermon');
  const [experienceLevel, setExperienceLevel] = useState('first_time');
  const [primaryNeed, setPrimaryNeed] = useState('guided_creation');

  const [defaultViewMode, setDefaultViewMode] = useState('structure');
  const [defaultDetailLevel, setDefaultDetailLevel] = useState('normal');

  const [useDarkMode, setUseDarkMode] = useState(false);
  const [showTimer, setShowTimer] = useState(true);
  const [showProgress, setShowProgress] = useState(true);
  const [showNextBlock, setShowNextBlock] = useState(true);
  const [autoMarkCompleted, setAutoMarkCompleted] = useState(true);
  const [confirmBeforeRestart, setConfirmBeforeRestart] = useState(true);

  const [finishAction, setFinishAction] = useState('guided');

  const initializeOnboarding = useCallback(async () => {
    if (
      userLoading
      || initializeLockRef.current
    ) {
      return;
    }

    if (!user?.id) {
      navigate('/login', {
        replace: true,
      });

      return;
    }

    initializeLockRef.current = true;
    setInitializing(true);

    try {
      const preference = await getUserPreference(user.id);
      const accessibility = parseAccessibility(
        preference?.accessibility_settings_json,
      );

      setPreferenceId(preference?.id || null);

      setName(
        profile?.name
        || user?.full_name
        || user?.name
        || '',
      );

      setPhone(profile?.phone || '');
      setAbout(accessibility.profile_note || '');

      setPrimaryUsage(
        accessibility.primary_usage || 'sermon',
      );

      setExperienceLevel(
        accessibility.experience_level || 'first_time',
      );

      setPrimaryNeed(
        accessibility.primary_need || 'guided_creation',
      );

      setDefaultViewMode(
        preference?.default_view_mode || 'structure',
      );

      setDefaultDetailLevel(
        preference?.default_detail_level || 'normal',
      );

      setUseDarkMode(
        preference?.use_dark_mode === true,
      );

      setShowTimer(
        preference?.show_timer !== false,
      );

      setShowProgress(
        preference?.show_progress !== false,
      );

      setShowNextBlock(
        preference?.show_next_block !== false,
      );

      setAutoMarkCompleted(
        preference?.auto_mark_completed !== false,
      );

      setConfirmBeforeRestart(
        preference?.confirm_before_restart !== false,
      );
    } catch (error) {
      console.error(
        'Erro ao carregar preferências do onboarding:',
        error,
      );

      toast({
        title: 'Algumas preferências não foram carregadas',
        description:
          'Você pode continuar. Usaremos valores iniciais seguros.',
      });
    } finally {
      initializeLockRef.current = false;
      setInitializing(false);
    }
  }, [
    navigate,
    profile?.name,
    profile?.phone,
    toast,
    user?.full_name,
    user?.id,
    user?.name,
    userLoading,
  ]);

  useEffect(() => {
    initializeOnboarding();
  }, [initializeOnboarding]);

  const selectedUsage = useMemo(
    () => USAGE_OPTIONS.find(
      (option) => option.id === primaryUsage,
    ),
    [primaryUsage],
  );

  const selectedExperience = useMemo(
    () => EXPERIENCE_OPTIONS.find(
      (option) => option.id === experienceLevel,
    ),
    [experienceLevel],
  );

  const selectedNeed = useMemo(
    () => NEED_OPTIONS.find(
      (option) => option.id === primaryNeed,
    ),
    [primaryNeed],
  );

  const selectedView = useMemo(
    () => VIEW_OPTIONS.find(
      (option) => option.value === defaultViewMode,
    ),
    [defaultViewMode],
  );

  const selectedDetail = useMemo(
    () => DETAIL_OPTIONS.find(
      (option) => option.value === defaultDetailLevel,
    ),
    [defaultDetailLevel],
  );

  const canContinue = useMemo(() => {
    if (step === 1) {
      return name.trim().length >= 2;
    }

    return true;
  }, [
    name,
    step,
  ]);

  const goNext = () => {
    if (!canContinue) {
      toast({
        title: 'Informe seu nome',
        description:
          'Digite pelo menos dois caracteres para continuar.',
        variant: 'destructive',
      });

      return;
    }

    setStep((current) => (
      Math.min(TOTAL_STEPS - 1, current + 1)
    ));
  };

  const goBack = () => {
    setStep((current) => (
      Math.max(0, current - 1)
    ));
  };

  const skipOnboarding = async () => {
    if (
      !user?.id
      || saving
      || skipping
      || skipLockRef.current
    ) {
      return;
    }

    skipLockRef.current = true;
    setSkipping(true);

    try {
      const fallbackName = String(
        profile?.name
        || user?.full_name
        || user?.name
        || user?.email?.split('@')?.[0]
        || 'Usuário',
      ).trim();

      const profilePayload = {
        user_id: user.id,
        name: fallbackName || 'Usuário',
        phone: profile?.phone || '',
        onboarding_completed: true,
        active: true,
      };

      const savedProfile = await saveUserProfile(
        user.id,
        profilePayload,
      );

      if (!savedProfile?.id) {
        throw new Error(
          'O perfil não retornou um ID válido.',
        );
      }

      try {
        await refreshProfile?.();
      } catch (refreshError) {
        console.warn(
          'O onboarding foi concluído, mas o perfil não foi atualizado imediatamente:',
          refreshError,
        );
      }

      toast({
        title: 'Configuração adiada',
        description:
          'Você poderá ajustar essas preferências depois em Configurações.',
      });

      navigate('/', {
        replace: true,
      });
    } catch (error) {
      console.error(
        'Erro ao adiar o onboarding:',
        error,
      );

      toast({
        title: 'Não foi possível continuar',
        description:
          error.message
          || 'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      skipLockRef.current = false;
      setSkipping(false);
    }
  };

  const saveOnboarding = async () => {
    if (
      !user?.id
      || saving
      || skipping
      || saveLockRef.current
    ) {
      return;
    }

    if (name.trim().length < 2) {
      setStep(1);

      toast({
        title: 'Nome obrigatório',
        description:
          'Informe como você deseja ser chamado.',
        variant: 'destructive',
      });

      return;
    }

    saveLockRef.current = true;
    setSaving(true);

    try {
      const profilePayload = {
        user_id: user.id,
        name: name.trim(),
        phone: phone.trim(),
        onboarding_completed: true,
        active: true,
      };

      const savedProfile = await saveUserProfile(
        user.id,
        profilePayload,
      );

      if (!savedProfile?.id) {
        throw new Error(
          'O perfil não retornou um ID válido.',
        );
      }

      const currentPreference = await getUserPreference(user.id);

      const previousAccessibility = parseAccessibility(
        currentPreference?.accessibility_settings_json,
      );

      const accessibilitySettings = {
        ...previousAccessibility,
        primary_usage: primaryUsage,
        experience_level: experienceLevel,
        primary_need: primaryNeed,
        profile_note: about.trim(),
      };

      const preferencePayload = {
        user_id: user.id,
        default_view_mode: defaultViewMode,
        default_detail_level: defaultDetailLevel,
        default_font_size: 16,
        presentation_font_size: (
          experienceLevel === 'first_time'
            ? 30
            : 28
        ),
        use_dark_mode: useDarkMode,
        show_timer: showTimer,
        show_next_block: showNextBlock,
        show_progress: showProgress,
        auto_mark_completed: autoMarkCompleted,
        confirm_before_restart: confirmBeforeRestart,
        accessibility_settings_json: JSON.stringify(
          accessibilitySettings,
        ),
      };

      const targetPreferenceId = (
        preferenceId
        || currentPreference?.id
        || null
      );

      const savedPreference = await saveUserPreference(
        user.id,
        {
          ...preferencePayload,
          id: targetPreferenceId,
        },
      );

      if (!savedPreference?.id) {
        throw new Error(
          'As preferências não retornaram um ID válido.',
        );
      }

      setPreferenceId(savedPreference.id);

      try {
        await refreshProfile?.();
      } catch (refreshError) {
        console.warn(
          'O onboarding foi salvo, mas o perfil não foi atualizado imediatamente:',
          refreshError,
        );
      }

      toast({
        title: 'Configuração concluída',
        description:
          'Seu espaço está pronto para receber a primeira apresentação.',
      });

      if (finishAction === 'guided') {
        navigate(
          '/new-presentation?mode=guided',
          {
            replace: true,
          },
        );

        return;
      }

      if (finishAction === 'template') {
        navigate('/templates', {
          replace: true,
        });

        return;
      }

      navigate('/', {
        replace: true,
      });
    } catch (error) {
      console.error(
        'Erro ao concluir onboarding:',
        error,
      );

      toast({
        title: 'Não foi possível concluir',
        description:
          'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  };

  if (
    userLoading
    || initializing
  ) {
    return <OnboardingLoading />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-muted/25 px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <BrandLogo
            markClassName="h-10 w-10"
            nameClassName="text-base"
            showTagline={false}
          />

          {step > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={skipOnboarding}
              disabled={saving || skipping}
            >
              {skipping && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}

              {skipping
                ? 'Continuando...'
                : 'Configurar depois'}
            </Button>
          )}
        </div>

        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardContent className="p-5 sm:p-8">
            {step === 0 && (
              <div>
                <StepHeader
                  step={step}
                  title="Bem-vindo ao seu assistente de apresentações"
                  description="Vamos configurar o aplicativo para ajudar você a construir, organizar, ensaiar e apresentar com mais segurança."
                />

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border bg-background p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Wand2 className="h-5 w-5" />
                    </div>

                    <h2 className="mt-3 font-semibold">
                      Construir
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Receba orientação desde a primeira ideia até a conclusão.
                    </p>
                  </div>

                  <div className="rounded-2xl border bg-background p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                      <Settings2 className="h-5 w-5" />
                    </div>

                    <h2 className="mt-3 font-semibold">
                      Organizar
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Mude a ordem, o nível e o tamanho das informações facilmente.
                    </p>
                  </div>

                  <div className="rounded-2xl border bg-background p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <MessageSquareText className="h-5 w-5" />
                    </div>

                    <h2 className="mt-3 font-semibold">
                      Apresentar
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Acompanhe tópicos, tempo e progresso sem se perder.
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-primary/5 p-4 text-sm leading-relaxed text-muted-foreground">
                  Você poderá alterar todas essas configurações depois.
                  Esta etapa apenas define os padrões iniciais.
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <StepHeader
                  step={step}
                  title="Como devemos chamar você?"
                  description="Esses dados serão usados no seu perfil e podem ser alterados depois."
                />

                <div className="mt-7 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Nome *
                    </Label>

                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                      <Input
                        id="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Seu nome"
                        className="pl-9"
                        maxLength={80}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Telefone ou WhatsApp
                    </Label>

                    <Input
                      id="phone"
                      value={formatPhone(phone)}
                      onChange={(event) => {
                        setPhone(
                          normalizePhone(event.target.value),
                        );
                      }}
                      placeholder="(00) 00000-0000"
                      inputMode="tel"
                    />

                    <p className="text-xs text-muted-foreground">
                      Campo opcional. Não será exibido nas apresentações.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="about">
                      O que você costuma apresentar?
                    </Label>

                    <Textarea
                      id="about"
                      value={about}
                      onChange={(event) => setAbout(event.target.value)}
                      placeholder="Exemplo: pregações, estudos, aulas para jovens e reuniões..."
                      rows={4}
                      maxLength={300}
                    />

                    <p className="text-right text-xs text-muted-foreground">
                      {about.length}/300
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <StepHeader
                  step={step}
                  title="Qual será seu uso principal?"
                  description="Essa escolha ajuda o aplicativo a recomendar modelos e fluxos mais úteis."
                />

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {USAGE_OPTIONS.map((option) => (
                    <SelectableCard
                      key={option.id}
                      selected={primaryUsage === option.id}
                      icon={option.icon}
                      title={option.title}
                      description={option.description}
                      onClick={() => setPrimaryUsage(option.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <StepHeader
                  step={step}
                  title="Qual é sua experiência atual?"
                  description="O aplicativo usará essa informação para escolher um nível de orientação mais adequado."
                />

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <SelectableCard
                      key={option.id}
                      selected={experienceLevel === option.id}
                      icon={option.icon}
                      title={option.title}
                      description={option.description}
                      onClick={() => setExperienceLevel(option.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <StepHeader
                  step={step}
                  title="Qual é sua maior necessidade?"
                  description="Escolha o ponto em que o Apresenta+ deve ajudar você primeiro."
                />

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {NEED_OPTIONS.map((option) => (
                    <SelectableCard
                      key={option.id}
                      selected={primaryNeed === option.id}
                      icon={option.icon}
                      title={option.title}
                      description={option.description}
                      onClick={() => setPrimaryNeed(option.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 5 && (
              <div>
                <StepHeader
                  step={step}
                  title="Escolha como prefere trabalhar"
                  description="Defina a visualização e a quantidade de informação mostrada por padrão."
                />

                <div className="mt-7 grid gap-6 lg:grid-cols-2">
                  <div>
                    <Label className="text-base font-semibold">
                      Visualização inicial
                    </Label>

                    <RadioGroup
                      value={defaultViewMode}
                      onValueChange={setDefaultViewMode}
                      className="mt-3 gap-2"
                    >
                      {VIEW_OPTIONS.map((option) => (
                        <Label
                          key={option.value}
                          htmlFor={`view-${option.value}`}
                          className={[
                            'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                            defaultViewMode === option.value
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted/40',
                          ].join(' ')}
                        >
                          <RadioGroupItem
                            id={`view-${option.value}`}
                            value={option.value}
                            className="mt-0.5"
                          />

                          <span>
                            <span className="block font-medium">
                              {option.title}
                            </span>

                            <span className="mt-0.5 block text-xs font-normal leading-relaxed text-muted-foreground">
                              {option.description}
                            </span>
                          </span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">
                      Nível de informação
                    </Label>

                    <RadioGroup
                      value={defaultDetailLevel}
                      onValueChange={setDefaultDetailLevel}
                      className="mt-3 gap-2"
                    >
                      {DETAIL_OPTIONS.map((option) => (
                        <Label
                          key={option.value}
                          htmlFor={`detail-${option.value}`}
                          className={[
                            'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                            defaultDetailLevel === option.value
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted/40',
                          ].join(' ')}
                        >
                          <RadioGroupItem
                            id={`detail-${option.value}`}
                            value={option.value}
                            className="mt-0.5"
                          />

                          <span>
                            <span className="block font-medium">
                              {option.title}
                            </span>

                            <span className="mt-0.5 block text-xs font-normal leading-relaxed text-muted-foreground">
                              {option.description}
                            </span>
                          </span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>

                <div className="mt-6 space-y-3 rounded-2xl border bg-background p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                        {useDarkMode ? (
                          <Moon className="h-4 w-4" />
                        ) : (
                          <Sun className="h-4 w-4" />
                        )}
                      </div>

                      <div>
                        <p className="font-medium">
                          Usar modo escuro
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Pode ser alterado nas configurações a qualquer momento.
                        </p>
                      </div>
                    </div>

                    <Switch
                      checked={useDarkMode}
                      onCheckedChange={setUseDarkMode}
                    />
                  </div>

                  <PreferenceSwitch
                    title="Mostrar cronômetro"
                    description="Acompanhe o tempo durante ensaios e apresentações."
                    checked={showTimer}
                    onCheckedChange={setShowTimer}
                  />

                  <PreferenceSwitch
                    title="Mostrar progresso"
                    description="Veja visualmente o que já foi apresentado."
                    checked={showProgress}
                    onCheckedChange={setShowProgress}
                  />

                  <PreferenceSwitch
                    title="Mostrar próximo tópico"
                    description="Ajuda a manter a sequência sem se perder."
                    checked={showNextBlock}
                    onCheckedChange={setShowNextBlock}
                  />

                  <PreferenceSwitch
                    title="Concluir automaticamente"
                    description="Ao avançar, marca o tópico anterior como apresentado."
                    checked={autoMarkCompleted}
                    onCheckedChange={setAutoMarkCompleted}
                  />

                  <PreferenceSwitch
                    title="Confirmar antes de recomeçar"
                    description="Evita reiniciar o progresso atual por engano."
                    checked={confirmBeforeRestart}
                    onCheckedChange={setConfirmBeforeRestart}
                  />
                </div>
              </div>
            )}

            {step === 6 && (
              <div>
                <StepHeader
                  step={step}
                  title="Tudo pronto para começar"
                  description="Revise suas escolhas e selecione o melhor próximo passo."
                />

                <div className="mt-7 rounded-2xl border bg-muted/25 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <h2 className="font-semibold">
                        Configuração preparada
                      </h2>

                      <p className="text-sm text-muted-foreground">
                        Perfil:{' '}
                        <strong className="text-foreground">
                          {name.trim()}
                        </strong>
                      </p>

                      <p className="text-sm text-muted-foreground">
                        Uso principal:{' '}
                        <strong className="text-foreground">
                          {selectedUsage?.title}
                        </strong>
                      </p>

                      <p className="text-sm text-muted-foreground">
                        Experiência:{' '}
                        <strong className="text-foreground">
                          {selectedExperience?.title}
                        </strong>
                      </p>

                      <p className="text-sm text-muted-foreground">
                        Maior necessidade:{' '}
                        <strong className="text-foreground">
                          {selectedNeed?.title}
                        </strong>
                      </p>

                      <p className="text-sm text-muted-foreground">
                        Visualização:{' '}
                        <strong className="text-foreground">
                          {selectedView?.title}
                        </strong>
                      </p>

                      <p className="text-sm text-muted-foreground">
                        Detalhes:{' '}
                        <strong className="text-foreground">
                          {selectedDetail?.title}
                        </strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {FINISH_OPTIONS.map((option) => {
                    const Icon = option.icon;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setFinishAction(option.id)}
                        className={[
                          'flex items-center gap-3 rounded-2xl border p-4 text-left transition-all',
                          finishAction === option.id
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
                            : 'hover:border-primary/35',
                        ].join(' ')}
                      >
                        <div
                          className={[
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                            option.className,
                          ].join(' ')}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            {option.title}
                          </p>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {option.description}
                          </p>
                        </div>

                        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {step > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    disabled={saving || skipping}
                    className="w-full sm:w-auto"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                )}
              </div>

              {step < TOTAL_STEPS - 1 ? (
                <Button
                  type="button"
                  onClick={goNext}
                  disabled={!canContinue || saving}
                  className="w-full sm:w-auto"
                >
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={saveOnboarding}
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      Concluir e continuar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}