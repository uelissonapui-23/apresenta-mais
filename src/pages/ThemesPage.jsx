import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Eye,
  Filter,
  Layers3,
  Lock,
  MonitorPlay,
  Palette,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import { backendConfig } from '@/lib/backendConfig';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DEFAULT_PREFERENCES = {
  default_view_mode: 'structure',
  default_detail_level: 'normal',
  default_font_size: 16,
  presentation_font_size: 24,
  use_dark_mode: false,
  show_timer: true,
  show_next_block: true,
  show_progress: true,
  auto_mark_completed: true,
  confirm_before_restart: true,
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'Todos os temas' },
  { value: 'official', label: 'Oficiais' },
  { value: 'free', label: 'Gratuitos' },
  { value: 'premium', label: 'Premium' },
];

function normalizeColor(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  return value.trim();
}

function safeFont(fontName, fallback = 'Inter') {
  if (typeof fontName !== 'string' || !fontName.trim()) return fallback;
  return fontName.trim();
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

function normalizeDate(value, { endOfDay = false } = {}) {
  if (!value) {
    return null;
  }

  const raw = String(value).trim();

  if (!raw) {
    return null;
  }

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);

  const date = new Date(
    dateOnly
      ? `${raw}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`
      : raw,
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function isProfilePlanActive(profile) {
  if (!profile?.plan_id) {
    return false;
  }

  const status = String(profile.plan_status || 'none')
    .trim()
    .toLowerCase();

  if (status === 'permanent') {
    return true;
  }

  if (status !== 'active') {
    return false;
  }

  const expiration = normalizeDate(
    profile.plan_expires_at,
    { endOfDay: true },
  );

  return !expiration || expiration.getTime() >= Date.now();
}

function ThemePreview({ theme, compact = false }) {
  const backgroundColor = normalizeColor(theme.background_color, '#ffffff');
  const textColor = normalizeColor(theme.text_color, '#1f2937');
  const titleColor = normalizeColor(theme.title_color, '#111827');
  const accentColor = normalizeColor(theme.accent_color, '#2563eb');
  const titleFont = safeFont(theme.title_font);
  const bodyFont = safeFont(theme.body_font);
  const titleSize = Math.max(20, Number(theme.default_title_size) || 32);
  const bodySize = Math.max(12, Number(theme.default_body_size) || 18);
  const alignment = ['left', 'center', 'right'].includes(theme.default_alignment)
    ? theme.default_alignment
    : 'left';

  return (
    <div
      className={`relative overflow-hidden ${compact ? 'h-44' : 'min-h-[340px]'}`}
      style={{ backgroundColor, color: textColor }}
    >
      {theme.thumbnail_url ? (
        <img
          src={theme.thumbnail_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-15"
        />
      ) : null}

      <div
        className={`relative z-10 flex h-full flex-col ${compact ? 'p-5' : 'p-8 sm:p-10'}`}
        style={{ textAlign: alignment }}
      >
        <div
          className="mb-auto h-1.5 w-16 rounded-full"
          style={{
            backgroundColor: accentColor,
            alignSelf:
              alignment === 'center'
                ? 'center'
                : alignment === 'right'
                  ? 'flex-end'
                  : 'flex-start',
          }}
        />

        <div>
          <p
            className={compact ? 'text-[11px] opacity-70' : 'text-sm opacity-70'}
            style={{ fontFamily: bodyFont }}
          >
            Organize suas ideias
          </p>

          <h3
            className={`mt-2 font-bold leading-tight ${compact ? 'line-clamp-2 text-xl' : 'text-3xl sm:text-4xl'}`}
            style={{
              color: titleColor,
              fontFamily: titleFont,
              fontSize: compact ? undefined : `${titleSize}px`,
            }}
          >
            Uma apresentação clara e marcante
          </h3>

          <p
            className={`mt-3 leading-relaxed opacity-90 ${compact ? 'line-clamp-2 text-xs' : 'max-w-2xl'}`}
            style={{
              fontFamily: bodyFont,
              fontSize: compact ? undefined : `${bodySize}px`,
              marginLeft: alignment === 'center' ? 'auto' : undefined,
              marginRight: alignment === 'center' ? 'auto' : undefined,
            }}
          >
            Construa uma sequência fácil de acompanhar e apresente com confiança.
          </p>
        </div>
      </div>
    </div>
  );
}

function ColorDot({ color, label }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className="h-4 w-4 rounded-full border border-border shadow-sm"
        style={{ backgroundColor: normalizeColor(color, '#ffffff') }}
      />
      <span>{label}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <span className="text-sm">Carregando temas visuais...</span>
      </div>
    </div>
  );
}

function EmptyThemes({ hasFilters, onClear }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center px-5 py-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Palette className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mt-5 text-lg font-semibold">
          {hasFilters ? 'Nenhum tema encontrado' : 'Nenhum tema disponível'}
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {hasFilters
            ? 'Altere os filtros ou a busca para encontrar outros temas.'
            : 'Os temas ativos cadastrados no aplicativo aparecerão aqui.'}
        </p>
        {hasFilters ? (
          <Button variant="outline" className="mt-5" onClick={onClear}>
            Limpar filtros
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function ThemesPage() {
  const {
    user,
    profile,
    isAdmin,
    loading: userLoading,
  } = useCurrentUser();
  const { toast } = useToast();

  const [themes, setThemes] = useState([]);
  const [presentations, setPresentations] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [applyingTheme, setApplyingTheme] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('name');

  const [previewTheme, setPreviewTheme] = useState(null);
  const [applyTheme, setApplyTheme] = useState(null);
  const [selectedPresentationId, setSelectedPresentationId] = useState('');

  const defaultLockRef = useRef(false);
  const applyLockRef = useRef(false);

  const loadPage = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id) {
      setThemes([]);
      setPresentations([]);
      setPreferences(null);
      setCurrentPlan(null);
      setLoadError('Entre na sua conta para acessar os temas.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!silent) setLoading(true);
    setLoadError('');

    try {
      const [
        themeRows,
        presentationRows,
        preferenceRows,
        planRows,
      ] = await Promise.all([
        base44.entities.PresentationTheme.filter({ active: true }, 'name'),
        base44.entities.Presentation.filter(
          { user_id: user.id, is_archived: false },
          '-updated_date',
        ),
        base44.entities.UserPreference.filter({
          user_id: user.id,
        }),
        backendConfig.features.paidPlans && profile?.plan_id && isProfilePlanActive(profile)
          ? base44.entities.Plan.filter({
              id: profile.plan_id,
            })
          : Promise.resolve([]),
      ]);

      setThemes(
        uniqueById(themeRows).filter(
          (theme) => theme.active !== false,
        ),
      );

      setPresentations(
        uniqueById(presentationRows).filter(
          (presentation) => (
            presentation.user_id === user.id
            && presentation.is_archived !== true
          ),
        ),
      );

      setPreferences(
        selectCurrentRecord(preferenceRows)
        || {
          user_id: user.id,
          ...DEFAULT_PREFERENCES,
        },
      );

      setCurrentPlan(
        uniqueById(planRows).find(
          (plan) => plan.id === profile?.plan_id,
        ) || null,
      );
    } catch (error) {
      console.error('Erro ao carregar temas:', error);
      setLoadError('Não foi possível carregar os temas visuais.');
      toast({
        title: 'Falha ao carregar temas',
        description: 'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile, toast, user?.id]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const filteredThemes = useMemo(() => {
    const query = search.trim().toLowerCase();

    const rows = themes.filter((theme) => {
      const matchesSearch = !query || [
        theme.name,
        theme.description,
        theme.title_font,
        theme.body_font,
        theme.transition_type,
      ].some((value) => String(value || '').toLowerCase().includes(query));

      if (!matchesSearch) return false;
      if (filter === 'official') return Boolean(theme.is_official);
      if (filter === 'premium') return Boolean(theme.is_premium);
      if (filter === 'free') return !theme.is_premium;
      return true;
    });

    return [...rows].sort((a, b) => {
      if (sort === 'official') {
        return Number(Boolean(b.is_official)) - Number(Boolean(a.is_official))
          || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
      }
      if (sort === 'premium') {
        return Number(Boolean(b.is_premium)) - Number(Boolean(a.is_premium))
          || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
      }
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
    });
  }, [filter, search, sort, themes]);

  const canUsePremiumThemes = Boolean(
    isAdmin
    || (
      isProfilePlanActive(profile)
      && currentPlan?.can_use_premium_templates === true
    ),
  );

  const isThemeLocked = useCallback(
    (theme) => Boolean(
      theme?.is_premium
      && !canUsePremiumThemes
    ),
    [canUsePremiumThemes],
  );

  const defaultThemeId = preferences?.default_theme_id || '';

  const stats = useMemo(() => ({
    total: themes.length,
    official: themes.filter((theme) => theme.is_official).length,
    free: themes.filter((theme) => !theme.is_premium).length,
    premium: themes.filter((theme) => theme.is_premium).length,
  }), [themes]);

  const clearFilters = () => {
    setSearch('');
    setFilter('all');
    setSort('name');
  };

  const handleRefresh = async () => {
    if (
      refreshing
      || savingDefault
      || applyingTheme
    ) {
      return;
    }

    setRefreshing(true);
    await loadPage({ silent: true });
  };

  const handleSetDefault = async (theme) => {
    if (
      !user?.id
      || !theme?.id
      || savingDefault
      || defaultLockRef.current
    ) {
      return;
    }

    if (!themes.some((item) => item.id === theme.id)) {
      toast({
        title: 'Tema inválido',
        description: 'Atualize a página e tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    if (isThemeLocked(theme)) {
      toast({
        title: 'Tema disponível em um plano superior',
        description:
          'Confira os planos que liberam temas premium.',
      });

      window.location.href = backendConfig.features.paidPlans ? '/my-plan' : '/settings';
      return;
    }

    defaultLockRef.current = true;
    setSavingDefault(true);

    const previous = preferences;

    const nextPreferences = {
      ...(preferences || {}),
      user_id: user.id,
      default_theme_id: theme.id,
    };

    setPreferences(nextPreferences);

    try {
      let saved;

      if (preferences?.id) {
        saved = await base44.entities.UserPreference.update(
          preferences.id,
          {
            default_theme_id: theme.id,
          },
        );
      } else {
        saved = await base44.entities.UserPreference.create({
          user_id: user.id,
          ...DEFAULT_PREFERENCES,
          default_theme_id: theme.id,
        });
      }

      if (!saved?.id) {
        throw new Error(
          'A preferência não retornou um ID válido.',
        );
      }

      setPreferences(saved);

      toast({
        title: 'Tema padrão atualizado',
        description:
          `${theme.name} será sugerido nas novas apresentações.`,
      });
    } catch (error) {
      console.error(
        'Erro ao definir tema padrão:',
        error,
      );

      setPreferences(previous);

      toast({
        title: 'Não foi possível salvar o tema padrão',
        description:
          error.message
          || 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      defaultLockRef.current = false;
      setSavingDefault(false);
    }
  };

  const openApplyDialog = (theme) => {
    if (!theme?.id) {
      return;
    }

    if (isThemeLocked(theme)) {
      toast({
        title: 'Tema disponível em um plano superior',
        description:
          'Confira os planos que liberam temas premium.',
      });

      window.location.href = backendConfig.features.paidPlans ? '/my-plan' : '/settings';
      return;
    }

    setApplyTheme(theme);
    setSelectedPresentationId('');
  };

  const closeApplyDialog = () => {
    if (applyingTheme) return;
    setApplyTheme(null);
    setSelectedPresentationId('');
  };

  const handleApplyToPresentation = async () => {
    if (
      !applyTheme?.id
      || !selectedPresentationId
      || applyingTheme
      || applyLockRef.current
    ) {
      return;
    }

    if (isThemeLocked(applyTheme)) {
      toast({
        title: 'Tema disponível em um plano superior',
        description:
          'Confira os planos que liberam temas premium.',
      });
      return;
    }

    const target = presentations.find((item) => (
      item.id === selectedPresentationId
      && item.user_id === user?.id
      && item.is_archived !== true
    ));

    if (!target) {
      toast({
        title: 'Selecione uma apresentação válida',
        description:
          'Atualize a lista e tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    const themeStillAvailable = themes.some(
      (theme) => theme.id === applyTheme.id,
    );

    if (!themeStillAvailable) {
      toast({
        title: 'Tema indisponível',
        description:
          'Ele pode ter sido desativado em outra janela.',
        variant: 'destructive',
      });
      return;
    }

    applyLockRef.current = true;
    setApplyingTheme(true);

    try {
      const updated = await base44.entities.Presentation.update(
        target.id,
        {
          theme_id: applyTheme.id,
        },
      );

      setPresentations((current) => current.map((item) => (
        item.id === target.id
          ? {
              ...item,
              theme_id: applyTheme.id,
              ...(updated || {}),
            }
          : item
      )));

      toast({
        title: 'Tema aplicado',
        description:
          `${applyTheme.name} foi aplicado em “${target.title}”.`,
      });

      setApplyTheme(null);
      setSelectedPresentationId('');
    } catch (error) {
      console.error('Erro ao aplicar tema:', error);

      toast({
        title: 'Não foi possível aplicar o tema',
        description:
          'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      applyLockRef.current = false;
      setApplyingTheme(false);
    }
  };

  if (userLoading || loading) return <LoadingState />;

  if (!user?.id) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4">
        <Card className="w-full border-dashed">
          <CardContent className="flex flex-col items-center px-5 py-14 text-center">
            <Palette className="h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">
              Entre para acessar os temas
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Seus temas padrão e apresentações ficam vinculados à sua conta.
            </p>
            <Button asChild className="mt-5">
              <Link to="/login">Entrar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasFilters = Boolean(search.trim()) || filter !== 'all' || sort !== 'name';

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Palette className="h-4 w-4" />
            Aparência das apresentações
          </div>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Temas visuais</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Escolha uma identidade visual, visualize o resultado e aplique o tema às suas apresentações.
          </p>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={
              refreshing
              || savingDefault
              || applyingTheme
            }
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button asChild className="flex-1 sm:flex-none">
            <Link to="/new-presentation">
              <MonitorPlay className="mr-2 h-4 w-4" />
              Nova apresentação
            </Link>
          </Button>
        </div>
      </header>

      {loadError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo dos temas">
        {[
          { label: 'Disponíveis', value: stats.total, icon: Layers3 },
          { label: 'Oficiais', value: stats.official, icon: Check },
          { label: 'Gratuitos', value: stats.free, icon: Palette },
          { label: 'Premium', value: stats.premium, icon: Sparkles },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border/70">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Icon className="h-5 w-5 text-foreground/70" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border-border/70">
        <CardContent className="p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, descrição ou fonte..."
                className="pl-9"
              />
            </div>

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger>
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="official">Oficiais primeiro</SelectItem>
                <SelectItem value="premium">Premium primeiro</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" onClick={clearFilters} disabled={!hasFilters}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredThemes.length} {filteredThemes.length === 1 ? 'tema encontrado' : 'temas encontrados'}
        </p>
        {defaultThemeId ? (
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            Tema padrão selecionado
          </p>
        ) : null}
      </div>

      {filteredThemes.length === 0 ? (
        <EmptyThemes hasFilters={hasFilters} onClear={clearFilters} />
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredThemes.map((theme) => {
            const isDefault = defaultThemeId === theme.id;
            const isLocked = isThemeLocked(theme);

            return (
              <Card
                key={theme.id}
                className={`group overflow-hidden border-border/70 transition-all hover:-translate-y-0.5 hover:shadow-lg ${isDefault ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
              >
                <div className="relative">
                  <ThemePreview theme={theme} compact />

                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    {theme.is_official ? <Badge>Oficial</Badge> : null}
                    {theme.is_premium ? (
                      <Badge className="bg-amber-500 text-white hover:bg-amber-500">Premium</Badge>
                    ) : (
                      <Badge variant="secondary">Gratuito</Badge>
                    )}
                  </div>

                  {isDefault ? (
                    <Badge className="absolute right-3 top-3 bg-emerald-600 text-white hover:bg-emerald-600">
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Padrão
                    </Badge>
                  ) : null}
                </div>

                <CardContent className="space-y-4 p-4">
                  <div>
                    <h2 className="line-clamp-1 text-lg font-semibold">{theme.name}</h2>
                    <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                      {theme.description || 'Tema visual para apresentações claras e bem organizadas.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-2">
                    <ColorDot color={theme.background_color} label="Fundo" />
                    <ColorDot color={theme.title_color} label="Título" />
                    <ColorDot color={theme.text_color} label="Texto" />
                    <ColorDot color={theme.accent_color} label="Destaque" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="rounded-lg bg-muted/60 p-2">
                      <span className="block">Fonte do título</span>
                      <strong className="mt-0.5 block truncate text-foreground">{safeFont(theme.title_font)}</strong>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2">
                      <span className="block">Transição</span>
                      <strong className="mt-0.5 block truncate capitalize text-foreground">{theme.transition_type || 'fade'}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => setPreviewTheme(theme)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </Button>
                    <Button
                      onClick={() => openApplyDialog(theme)}
                      disabled={presentations.length === 0}
                      variant={isLocked ? 'secondary' : 'default'}
                    >
                      {isLocked ? (
                        <Lock className="mr-2 h-4 w-4" />
                      ) : (
                        <MonitorPlay className="mr-2 h-4 w-4" />
                      )}
                      {isLocked ? 'Ver plano' : 'Aplicar'}
                    </Button>
                  </div>

                  <Button
                    variant={isDefault ? 'secondary' : 'ghost'}
                    className="w-full"
                    disabled={isDefault || savingDefault}
                    onClick={() => handleSetDefault(theme)}
                  >
                    <Star className={`mr-2 h-4 w-4 ${isDefault ? 'fill-amber-400 text-amber-400' : ''}`} />
                    {isDefault
                      ? 'Tema padrão atual'
                      : isLocked
                        ? 'Ver plano'
                        : 'Definir como padrão'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {presentations.length === 0 && themes.length > 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Crie uma apresentação para aplicar um tema</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Você ainda pode escolher o tema padrão para as próximas apresentações.
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link to="/new-presentation">Criar apresentação</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={Boolean(previewTheme)} onOpenChange={(open) => !open && setPreviewTheme(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto p-0">
          {previewTheme ? (
            <>
              <ThemePreview theme={previewTheme} />
              <div className="space-y-5 p-5 sm:p-6">
                <DialogHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <DialogTitle>{previewTheme.name}</DialogTitle>
                    {previewTheme.is_official ? <Badge>Oficial</Badge> : null}
                    {previewTheme.is_premium ? <Badge variant="secondary">Premium</Badge> : null}
                  </div>
                  <DialogDescription>
                    {previewTheme.description || 'Visualize como o conteúdo será apresentado com este tema.'}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border p-3">
                    <Label className="text-xs text-muted-foreground">Título</Label>
                    <p className="mt-1 truncate font-semibold">{safeFont(previewTheme.title_font)}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <Label className="text-xs text-muted-foreground">Texto</Label>
                    <p className="mt-1 truncate font-semibold">{safeFont(previewTheme.body_font)}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <Label className="text-xs text-muted-foreground">Alinhamento</Label>
                    <p className="mt-1 capitalize font-semibold">{previewTheme.default_alignment || 'left'}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <Label className="text-xs text-muted-foreground">Transição</Label>
                    <p className="mt-1 capitalize font-semibold">{previewTheme.transition_type || 'fade'}</p>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setPreviewTheme(null)}>
                    Fechar
                  </Button>
                  <Button
                    onClick={() => {
                      const theme = previewTheme;
                      setPreviewTheme(null);
                      openApplyDialog(theme);
                    }}
                    disabled={presentations.length === 0}
                    variant={
                      isThemeLocked(previewTheme)
                        ? 'secondary'
                        : 'default'
                    }
                  >
                    {isThemeLocked(previewTheme) && (
                      <Lock className="mr-2 h-4 w-4" />
                    )}
                    {isThemeLocked(previewTheme)
                      ? 'Ver planos'
                      : 'Aplicar em apresentação'}
                  </Button>
                </DialogFooter>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(applyTheme)} onOpenChange={(open) => !open && closeApplyDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar tema visual</DialogTitle>
            <DialogDescription>
              Escolha a apresentação que receberá o tema “{applyTheme?.name}”. O conteúdo e a ordem dos tópicos não serão alterados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="presentation-theme-target">Apresentação</Label>
            <Select value={selectedPresentationId} onValueChange={setSelectedPresentationId}>
              <SelectTrigger id="presentation-theme-target">
                <SelectValue placeholder="Selecione uma apresentação" />
              </SelectTrigger>
              <SelectContent>
                {presentations.map((presentation) => (
                  <SelectItem key={presentation.id} value={presentation.id}>
                    {presentation.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeApplyDialog} disabled={applyingTheme}>
              Cancelar
            </Button>
            <Button
              onClick={handleApplyToPresentation}
              disabled={!selectedPresentationId || applyingTheme}
            >
              {applyingTheme ? 'Aplicando...' : 'Aplicar tema'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}