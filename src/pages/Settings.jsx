import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accessibility,
  Check,
  Clock3,
  Eye,
  FileText,
  Gauge,
  Loader2,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Sun,
  Type,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

const DEFAULT_ACCESSIBILITY = {
  high_contrast: false,
  reduce_motion: false,
  large_controls: false,
  left_aligned_text: true,
  increased_spacing: false,
};

const DEFAULT_PREFERENCES = {
  default_theme_id: '',
  default_view_mode: 'structure',
  default_detail_level: 'normal',
  default_font_size: 16,
  presentation_font_size: 28,
  use_dark_mode: false,
  show_timer: true,
  show_next_block: true,
  show_progress: true,
  auto_mark_completed: true,
  confirm_before_restart: true,
  accessibility_settings_json: JSON.stringify(DEFAULT_ACCESSIBILITY),
};

const VIEW_OPTIONS = [
  {
    value: 'structure',
    label: 'Estrutura',
    description: 'Tópicos e subtópicos organizados em hierarquia.',
  },
  {
    value: 'text',
    label: 'Texto linear',
    description: 'Conteúdo corrido para leitura e revisão.',
  },
  {
    value: 'cards',
    label: 'Cartões',
    description: 'Blocos separados para reorganização rápida.',
  },
  {
    value: 'script',
    label: 'Roteiro',
    description: 'Títulos, resumos, importância e tempo.',
  },
];

const DETAIL_OPTIONS = [
  {
    value: 'compact',
    label: 'Compacto',
    description: 'Mostra somente os títulos.',
  },
  {
    value: 'normal',
    label: 'Normal',
    description: 'Mostra títulos e resumos.',
  },
  {
    value: 'detailed',
    label: 'Detalhado',
    description: 'Inclui o conteúdo principal.',
  },
  {
    value: 'complete',
    label: 'Completo',
    description: 'Inclui conteúdo adicional e notas permitidas.',
  },
];

function parseAccessibility(value) {
  let parsed = {};

  if (value && typeof value === 'object') {
    parsed = value;
  } else if (value) {
    try {
      const candidate = JSON.parse(value);

      parsed = (
        candidate
        && typeof candidate === 'object'
      )
        ? candidate
        : {};
    } catch {
      parsed = {};
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Compatibilidade
  |--------------------------------------------------------------------------
  |
  | Versões anteriores da página Settings usaram "larger_controls",
  | enquanto Rehearsal e PresentMode utilizam "large_controls".
  | Normalizamos para a chave realmente consumida pelo aplicativo e
  | preservamos também os dados de personalização salvos no onboarding.
  |
  */

  const largeControls = Boolean(
    parsed.large_controls
    || parsed.larger_controls
    || parsed.controls_larger
  );

  return {
    ...DEFAULT_ACCESSIBILITY,
    ...parsed,
    large_controls: largeControls,
  };
}

function normalizePreferences(raw, userId) {
  const merged = {
    ...DEFAULT_PREFERENCES,
    ...(raw || {}),
    user_id: userId,
  };

  return {
    ...merged,
    default_font_size: Number(merged.default_font_size) || 16,
    presentation_font_size: Number(merged.presentation_font_size) || 28,
    accessibility_settings_json: JSON.stringify(
      parseAccessibility(merged.accessibility_settings_json),
    ),
  };
}

function getComparablePreferences(prefs) {
  if (!prefs) {
    return '';
  }

  const accessibility = parseAccessibility(
    prefs.accessibility_settings_json,
  );

  return JSON.stringify({
    default_theme_id: prefs.default_theme_id || '',
    default_view_mode: prefs.default_view_mode || 'structure',
    default_detail_level: prefs.default_detail_level || 'normal',
    default_font_size: Number(prefs.default_font_size) || 16,
    presentation_font_size: Number(prefs.presentation_font_size) || 28,
    use_dark_mode: Boolean(prefs.use_dark_mode),
    show_timer: Boolean(prefs.show_timer),
    show_next_block: Boolean(prefs.show_next_block),
    show_progress: Boolean(prefs.show_progress),
    auto_mark_completed: Boolean(prefs.auto_mark_completed),
    confirm_before_restart: Boolean(prefs.confirm_before_restart),
    accessibility,
  });
}

function applyInterfacePreferences(prefs) {
  if (
    typeof document === 'undefined'
    || !prefs
  ) {
    return;
  }

  const accessibility = parseAccessibility(
    prefs.accessibility_settings_json,
  );

  document.documentElement.classList.toggle(
    'dark',
    Boolean(prefs.use_dark_mode),
  );

  document.documentElement.classList.toggle(
    'a11y-high-contrast',
    Boolean(accessibility.high_contrast),
  );

  document.documentElement.classList.toggle(
    'a11y-reduce-motion',
    Boolean(accessibility.reduce_motion),
  );

  document.documentElement.classList.toggle(
    'a11y-large-controls',
    Boolean(accessibility.large_controls),
  );

  document.documentElement.classList.toggle(
    'a11y-increased-spacing',
    Boolean(accessibility.increased_spacing),
  );

  document.documentElement.dataset.textAlignment = (
    accessibility.left_aligned_text
      ? 'left'
      : 'center'
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <span className="text-sm">Carregando suas preferências...</span>
      </div>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-4 w-4 text-foreground/75" />
        </div>

        <div className="min-w-0">
          <Label className="text-sm font-medium leading-tight">
            {title}
          </Label>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <Switch
        checked={Boolean(checked)}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={title}
        className="mt-1 shrink-0"
      />
    </div>
  );
}

function PreviewCard({ prefs, theme }) {
  const accessibility = parseAccessibility(
    prefs.accessibility_settings_json,
  );

  const background = theme?.background_color
    || (prefs.use_dark_mode ? '#111827' : '#ffffff');
  const textColor = theme?.text_color
    || (prefs.use_dark_mode ? '#f9fafb' : '#111827');
  const titleColor = theme?.title_color || textColor;
  const accent = theme?.accent_color || '#6366f1';
  const titleFont = theme?.title_font || 'inherit';
  const bodyFont = theme?.body_font || 'inherit';

  return (
    <Card className="overflow-hidden border-border/70">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Prévia rápida</CardTitle>
            <CardDescription>
              Exemplo aproximado do modo apresentação.
            </CardDescription>
          </div>
          <Badge variant="outline">Ao vivo</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div
          className={`relative min-h-[310px] overflow-hidden rounded-2xl border p-5 transition-all ${
            accessibility.increased_spacing ? 'space-y-6' : 'space-y-4'
          }`}
          style={{
            backgroundColor: background,
            color: textColor,
            textAlign: accessibility.left_aligned_text ? 'left' : 'center',
            filter: accessibility.high_contrast ? 'contrast(1.2)' : undefined,
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ backgroundColor: accent }}
          />

          <div className="flex items-center justify-between gap-3 text-xs opacity-75">
            <span>2 de 6 tópicos</span>
            {prefs.show_timer && <span>08:42</span>}
          </div>

          <div className="space-y-3">
            <p
              className="font-semibold uppercase tracking-[0.18em] opacity-70"
              style={{ fontFamily: bodyFont }}
            >
              Primeiro princípio
            </p>

            <h3
              className="font-bold leading-tight"
              style={{
                color: titleColor,
                fontFamily: titleFont,
                fontSize: `${Math.min(
                  Math.max(Number(prefs.presentation_font_size) || 28, 22),
                  48,
                )}px`,
              }}
            >
              Organize a mensagem antes de pensar no visual
            </h3>

            {prefs.default_detail_level !== 'compact' && (
              <p
                className="leading-relaxed opacity-90"
                style={{
                  fontFamily: bodyFont,
                  fontSize: `${Math.min(
                    Math.max((Number(prefs.presentation_font_size) || 28) * 0.58, 16),
                    28,
                  )}px`,
                }}
              >
                Uma apresentação forte começa com uma sequência clara de ideias,
                exemplos e aplicações.
              </p>
            )}
          </div>

          {prefs.show_next_block && (
            <div
              className="rounded-xl border p-3 text-sm"
              style={{ borderColor: `${accent}66` }}
            >
              <span className="block text-xs opacity-65">Próximo tópico</span>
              <strong>Como transformar ideias em blocos</strong>
            </div>
          )}

          {prefs.show_progress && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs opacity-70">
                <span>Progresso</span>
                <span>33%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full w-1/3 rounded-full"
                  style={{ backgroundColor: accent }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { user, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();

  const [prefs, setPrefs] = useState(null);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadSettings = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    }
    setError('');

    try {
      const [preferenceRows, themeRows] = await Promise.all([
        base44.entities.UserPreference.filter({ user_id: user.id }),
        base44.entities.PresentationTheme.filter(
          { active: true },
          'name',
        ),
      ]);

      const normalized = normalizePreferences(
        Array.isArray(preferenceRows) ? preferenceRows[0] : null,
        user.id,
      );

      setPrefs(normalized);
      setSavedSnapshot(getComparablePreferences(normalized));
      setThemes(Array.isArray(themeRows) ? themeRows : []);

      applyInterfacePreferences(normalized);
    } catch (loadError) {
      console.error('Erro ao carregar configurações:', loadError);
      setError('Não foi possível carregar suas configurações agora.');
      toast({
        title: 'Erro ao carregar configurações',
        description: 'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast, user?.id]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const selectedTheme = useMemo(
    () => themes.find((theme) => theme.id === prefs?.default_theme_id),
    [prefs?.default_theme_id, themes],
  );

  const hasChanges = useMemo(() => {
    if (!prefs) {
      return false;
    }

    return getComparablePreferences(prefs) !== savedSnapshot;
  }, [prefs, savedSnapshot]);

  useEffect(() => {
    if (!hasChanges) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const updatePreference = (field, value) => {
    setPrefs((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateAccessibility = (field, value) => {
    setPrefs((current) => {
      const accessibility = parseAccessibility(
        current.accessibility_settings_json,
      );

      return {
        ...current,
        accessibility_settings_json: JSON.stringify({
          ...accessibility,
          [field]: value,
        }),
      };
    });
  };

  const handleRefresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    await loadSettings({
      silent: true,
    });
  };

  const handleSave = async () => {
    if (!prefs || !user?.id || saving) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        user_id: user.id,
        default_theme_id: prefs.default_theme_id || '',
        default_view_mode: prefs.default_view_mode || 'structure',
        default_detail_level: prefs.default_detail_level || 'normal',
        default_font_size: Number(prefs.default_font_size) || 16,
        presentation_font_size: Number(prefs.presentation_font_size) || 28,
        use_dark_mode: Boolean(prefs.use_dark_mode),
        show_timer: Boolean(prefs.show_timer),
        show_next_block: Boolean(prefs.show_next_block),
        show_progress: Boolean(prefs.show_progress),
        auto_mark_completed: Boolean(prefs.auto_mark_completed),
        confirm_before_restart: Boolean(prefs.confirm_before_restart),
        accessibility_settings_json: JSON.stringify((() => {
          const accessibility = parseAccessibility(
            prefs.accessibility_settings_json,
          );

          const {
            larger_controls: _legacyLargerControls,
            controls_larger: _legacyControlsLarger,
            ...normalizedAccessibility
          } = accessibility;

          return normalizedAccessibility;
        })()),
      };

      let saved;

      if (prefs.id) {
        saved = await base44.entities.UserPreference.update(
          prefs.id,
          payload,
        );
      } else {
        saved = await base44.entities.UserPreference.create(payload);
      }

      const normalized = normalizePreferences(
        { ...prefs, ...saved, ...payload },
        user.id,
      );

      setPrefs(normalized);
      setSavedSnapshot(getComparablePreferences(normalized));

      applyInterfacePreferences(normalized);

      toast({
        title: 'Configurações salvas',
        description: 'Suas preferências serão usadas nas próximas telas.',
      });
    } catch (saveError) {
      console.error('Erro ao salvar configurações:', saveError);
      toast({
        title: 'Não foi possível salvar',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!user?.id || resetting) {
      return;
    }

    setResetting(true);

    try {
      const resetPrefs = normalizePreferences(
        {
          ...DEFAULT_PREFERENCES,
          id: prefs?.id,
          user_id: user.id,
        },
        user.id,
      );

      setPrefs(resetPrefs);
      applyInterfacePreferences(resetPrefs);

      toast({
        title: 'Padrões restaurados',
        description: 'Revise as opções e clique em Salvar configurações.',
      });
    } finally {
      setResetting(false);
    }
  };

  if (userLoading || loading) {
    return <LoadingState />;
  }

  if (!prefs) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="destructive">
          <Settings2 className="h-4 w-4" />
          <AlertTitle>Configurações indisponíveis</AlertTitle>
          <AlertDescription>
            Não foi possível preparar suas preferências.
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={loadSettings}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  const accessibility = parseAccessibility(
    prefs.accessibility_settings_json,
  );

  const currentView = VIEW_OPTIONS.find(
    (option) => option.value === prefs.default_view_mode,
  );

  const currentDetail = DETAIL_OPTIONS.find(
    (option) => option.value === prefs.default_detail_level,
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Preferências pessoais</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            Configurações
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Defina como o editor, os ensaios e o modo apresentação devem
            funcionar por padrão.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={saving || resetting || refreshing}
            className="w-full sm:w-auto"
          >
            <RefreshCw
              className={[
                'mr-2 h-4 w-4',
                refreshing ? 'animate-spin' : '',
              ].join(' ')}
            />
            Atualizar
          </Button>

          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving || resetting || refreshing}
            className="w-full sm:w-auto"
          >
            {resetting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Restaurar padrões
          </Button>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : hasChanges ? (
              <Save className="mr-2 h-4 w-4" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {saving
              ? 'Salvando...'
              : hasChanges
                ? 'Salvar configurações'
                : 'Tudo salvo'}
          </Button>
        </div>
      </header>

      {error && (
        <Alert variant="destructive">
          <RefreshCw className="h-4 w-4" />
          <AlertTitle>Falha ao atualizar os dados</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {hasChanges && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Existem alterações não salvas</AlertTitle>
          <AlertDescription>
            Clique em “Salvar configurações” para aplicar estas preferências.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="min-w-0 space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Visualização padrão</CardTitle>
                  <CardDescription>
                    Preferências utilizadas quando uma apresentação for aberta.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="default-theme">Tema visual padrão</Label>
                <Select
                  value={prefs.default_theme_id || 'none'}
                  onValueChange={(value) => updatePreference(
                    'default_theme_id',
                    value === 'none' ? '' : value,
                  )}
                >
                  <SelectTrigger id="default-theme">
                    <SelectValue placeholder="Selecione um tema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Usar o tema da apresentação</SelectItem>
                    {themes.map((theme) => (
                      <SelectItem key={theme.id} value={theme.id}>
                        {theme.name}
                        {theme.is_premium ? ' • Premium' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  O tema escolhido poderá ser alterado individualmente em cada apresentação.
                </p>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="default-view">Visualização inicial</Label>
                  <Select
                    value={prefs.default_view_mode || 'structure'}
                    onValueChange={(value) => updatePreference(
                      'default_view_mode',
                      value,
                    )}
                  >
                    <SelectTrigger id="default-view">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIEW_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {currentView?.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detail-level">Nível de informação</Label>
                  <Select
                    value={prefs.default_detail_level || 'normal'}
                    onValueChange={(value) => updatePreference(
                      'default_detail_level',
                      value,
                    )}
                  >
                    <SelectTrigger id="detail-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DETAIL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {currentDetail?.description}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Label>Tamanho da fonte no editor</Label>
                    <p className="text-xs text-muted-foreground">
                      Afeta a leitura durante a construção e revisão.
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {prefs.default_font_size}px
                  </Badge>
                </div>

                <Slider
                  value={[Number(prefs.default_font_size) || 16]}
                  onValueChange={([value]) => updatePreference(
                    'default_font_size',
                    value,
                  )}
                  min={12}
                  max={28}
                  step={1}
                  aria-label="Tamanho da fonte no editor"
                />

                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>12px</span>
                  <span>28px</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Label>Tamanho da fonte na apresentação</Label>
                    <p className="text-xs text-muted-foreground">
                      Pode ser ajustado novamente durante a apresentação.
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {prefs.presentation_font_size}px
                  </Badge>
                </div>

                <Slider
                  value={[Number(prefs.presentation_font_size) || 28]}
                  onValueChange={([value]) => updatePreference(
                    'presentation_font_size',
                    value,
                  )}
                  min={18}
                  max={64}
                  step={2}
                  aria-label="Tamanho da fonte na apresentação"
                />

                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>18px</span>
                  <span>64px</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Monitor className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Modo apresentação</CardTitle>
                  <CardDescription>
                    Escolha as informações e os controles exibidos por padrão.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <SettingRow
                icon={prefs.use_dark_mode ? Moon : Sun}
                title="Abrir em modo escuro"
                description="Usa fundo escuro quando o modo apresentação for iniciado."
                checked={prefs.use_dark_mode}
                onCheckedChange={(value) => updatePreference('use_dark_mode', value)}
              />

              <Separator />

              <SettingRow
                icon={Clock3}
                title="Mostrar cronômetro"
                description="Exibe o tempo decorrido enquanto a apresentação ou ensaio estiver ativo."
                checked={prefs.show_timer}
                onCheckedChange={(value) => updatePreference('show_timer', value)}
              />

              <Separator />

              <SettingRow
                icon={FileText}
                title="Mostrar próximo tópico"
                description="Exibe uma prévia discreta do próximo assunto."
                checked={prefs.show_next_block}
                onCheckedChange={(value) => updatePreference('show_next_block', value)}
              />

              <Separator />

              <SettingRow
                icon={Gauge}
                title="Mostrar progresso"
                description="Exibe porcentagem, posição atual e avanço da apresentação."
                checked={prefs.show_progress}
                onCheckedChange={(value) => updatePreference('show_progress', value)}
              />

              <Separator />

              <SettingRow
                icon={Check}
                title="Concluir automaticamente ao avançar"
                description="Ao ir para o próximo tópico, marca o anterior como apresentado."
                checked={prefs.auto_mark_completed}
                onCheckedChange={(value) => updatePreference(
                  'auto_mark_completed',
                  value,
                )}
              />

              <Separator />

              <SettingRow
                icon={RotateCcw}
                title="Confirmar antes de recomeçar"
                description="Evita iniciar uma nova sessão acidentalmente."
                checked={prefs.confirm_before_restart}
                onCheckedChange={(value) => updatePreference(
                  'confirm_before_restart',
                  value,
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Accessibility className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Acessibilidade</CardTitle>
                  <CardDescription>
                    Ajustes visuais para facilitar leitura, toque e concentração.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <SettingRow
                icon={Eye}
                title="Alto contraste"
                description="Aumenta a diferença visual entre fundo, texto e controles."
                checked={accessibility.high_contrast}
                onCheckedChange={(value) => updateAccessibility(
                  'high_contrast',
                  value,
                )}
              />

              <Separator />

              <SettingRow
                icon={Sparkles}
                title="Reduzir movimentos"
                description="Evita animações e transições que possam distrair."
                checked={accessibility.reduce_motion}
                onCheckedChange={(value) => updateAccessibility(
                  'reduce_motion',
                  value,
                )}
              />

              <Separator />

              <SettingRow
                icon={Settings2}
                title="Controles maiores"
                description="Aumenta áreas de toque e botões nas telas de ensaio e apresentação."
                checked={accessibility.large_controls}
                onCheckedChange={(value) => updateAccessibility(
                  'large_controls',
                  value,
                )}
              />

              <Separator />

              <SettingRow
                icon={Type}
                title="Texto alinhado à esquerda"
                description="Mantém parágrafos e tópicos alinhados à esquerda para leitura mais natural."
                checked={accessibility.left_aligned_text}
                onCheckedChange={(value) => updateAccessibility(
                  'left_aligned_text',
                  value,
                )}
              />

              <Separator />

              <SettingRow
                icon={FileText}
                title="Espaçamento ampliado"
                description="Aumenta o espaço entre títulos, parágrafos e controles."
                checked={accessibility.increased_spacing}
                onCheckedChange={(value) => updateAccessibility(
                  'increased_spacing',
                  value,
                )}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <PreviewCard prefs={prefs} theme={selectedTheme} />

          <Card className="border-border/70">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Settings2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Resumo atual</p>
                  <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Tema:</strong>{' '}
                      {selectedTheme?.name || 'Definido pela apresentação'}
                    </p>
                    <p>
                      <strong className="text-foreground">Visualização:</strong>{' '}
                      {currentView?.label}
                    </p>
                    <p>
                      <strong className="text-foreground">Detalhe:</strong>{' '}
                      {currentDetail?.label}
                    </p>
                    <p>
                      <strong className="text-foreground">Fonte:</strong>{' '}
                      {prefs.presentation_font_size}px na apresentação
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="sticky bottom-3 z-20 rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:hidden">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="w-full"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : hasChanges ? (
            <Save className="mr-2 h-4 w-4" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          {saving
            ? 'Salvando...'
            : hasChanges
              ? 'Salvar configurações'
              : 'Tudo salvo'}
        </Button>
      </div>
    </div>
  );
}