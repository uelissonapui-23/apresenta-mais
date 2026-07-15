import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Crown,
  Edit3,
  Eye,
  Image as ImageIcon,
  Loader2,
  Palette,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const EMPTY_FORM = {
  name: '',
  description: '',
  thumbnail_url: '',
  background_color: '#FFFFFF',
  text_color: '#1A1A1A',
  title_color: '#111111',
  accent_color: '#3B82F6',
  title_font: 'Inter',
  body_font: 'Inter',
  default_title_size: 40,
  default_body_size: 24,
  default_alignment: 'left',
  transition_type: 'fade',
  is_official: false,
  is_premium: false,
  active: true,
};

const FONT_OPTIONS = [
  'Inter',
  'Arial',
  'Roboto',
  'Montserrat',
  'Poppins',
  'Lato',
  'Merriweather',
  'Playfair Display',
  'Georgia',
  'Times New Roman',
];

const TRANSITIONS = [
  { value: 'none', label: 'Sem transição' },
  { value: 'fade', label: 'Suave' },
  { value: 'slide', label: 'Deslizar' },
  { value: 'zoom', label: 'Aproximar' },
];

const ALIGNMENTS = [
  { value: 'left', label: 'Esquerda' },
  { value: 'center', label: 'Centro' },
  { value: 'right', label: 'Direita' },
];

function normalizeHex(value, fallback) {
  const text = String(value || '').trim();
  return /^#[0-9A-Fa-f]{6}$/.test(text) ? text.toUpperCase() : fallback;
}

function isValidUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getContrastColor(hex) {
  const safe = normalizeHex(hex, '#FFFFFF').slice(1);
  const r = parseInt(safe.slice(0, 2), 16);
  const g = parseInt(safe.slice(2, 4), 16);
  const b = parseInt(safe.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? '#111827' : '#FFFFFF';
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

function sortThemesByName(rows) {
  return uniqueById(rows).sort((left, right) => (
    String(left?.name || '').localeCompare(
      String(right?.name || ''),
      'pt-BR',
      { sensitivity: 'base' },
    )
  ));
}

function buildUniqueCopyName(baseName, themes) {
  const base = String(baseName || 'Tema').trim() || 'Tema';

  const names = new Set(
    uniqueById(themes).map((theme) => (
      String(theme.name || '').trim().toLowerCase()
    )),
  );

  let attempt = 1;
  let candidate = `${base} — Cópia`;

  while (names.has(candidate.toLowerCase())) {
    attempt += 1;
    candidate = `${base} — Cópia ${attempt}`;
  }

  return candidate;
}

function ThemePreview({ theme, compact = false }) {
  const background = normalizeHex(theme.background_color, '#FFFFFF');
  const title = normalizeHex(theme.title_color, '#111111');
  const text = normalizeHex(theme.text_color, '#1A1A1A');
  const accent = normalizeHex(theme.accent_color, '#3B82F6');
  const align = theme.default_alignment || 'left';

  return (
    <div
      className={`relative overflow-hidden rounded-xl border shadow-sm ${compact ? 'aspect-[16/10]' : 'min-h-[280px]'}`}
      style={{ backgroundColor: background }}
    >
      {theme.thumbnail_url ? (
        <img
          src={theme.thumbnail_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : null}

      <div className={`relative flex h-full flex-col justify-between ${compact ? 'p-4' : 'p-7 sm:p-10'}`}>
        <div style={{ textAlign: align }}>
          <div
            className={`${compact ? 'mb-3 h-1 w-14' : 'mb-6 h-1.5 w-20'} rounded-full`}
            style={{
              backgroundColor: accent,
              marginLeft: align === 'center' ? 'auto' : align === 'right' ? 'auto' : undefined,
              marginRight: align === 'center' ? 'auto' : undefined,
            }}
          />

          <h3
            className={compact ? 'text-lg font-bold leading-tight' : 'text-3xl font-bold leading-tight sm:text-4xl'}
            style={{
              color: title,
              fontFamily: theme.title_font || 'Inter',
            }}
          >
            Organize suas ideias
          </h3>

          <p
            className={`${compact ? 'mt-2 line-clamp-2 text-xs' : 'mt-5 max-w-2xl text-base leading-relaxed sm:text-lg'}`}
            style={{
              color: text,
              fontFamily: theme.body_font || 'Inter',
              marginLeft: align === 'center' ? 'auto' : align === 'right' ? 'auto' : undefined,
            }}
          >
            Uma apresentação clara, direta e fácil de acompanhar do início ao fim.
          </p>
        </div>

        <div
          className={`${compact ? 'mt-3 text-[10px]' : 'mt-10 text-sm'} font-medium`}
          style={{ color: accent, textAlign: align }}
        >
          Próximo tópico: Aplicação prática
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={normalizeHex(value, '#000000')}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-10 w-12 cursor-pointer rounded-md border bg-background p-1"
          aria-label={label}
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={7}
          placeholder="#000000"
          className="font-mono uppercase"
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminThemes() {
  const { isAdmin, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();

  const [themes, setThemes] = useState([]);
  const [presentations, setPresentations] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLockRef = useRef(false);
  const actionLockRef = useRef(false);
  const [busyThemeId, setBusyThemeId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewTheme, setPreviewTheme] = useState(null);
  const [editingTheme, setEditingTheme] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);

    try {
      const [themeRows, presentationRows, preferenceRows] = await Promise.all([
        base44.entities.PresentationTheme.filter({}, 'name'),
        base44.entities.Presentation.filter({}, '-updated_date'),
        base44.entities.UserPreference.filter({}, '-updated_date'),
      ]);

      setThemes(sortThemesByName(themeRows));
      setPresentations(uniqueById(presentationRows));
      setPreferences(uniqueById(preferenceRows));
    } catch (error) {
      console.error('Erro ao carregar temas:', error);
      toast({
        title: 'Não foi possível carregar os temas',
        description: 'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    if (!userLoading) loadData();
  }, [loadData, userLoading]);

  const usageMap = useMemo(() => {
    const map = {};
    themes.forEach((theme) => {
      map[theme.id] = {
        presentations: 0,
        preferences: 0,
      };
    });

    presentations.forEach((presentation) => {
      if (presentation.theme_id && map[presentation.theme_id]) {
        map[presentation.theme_id].presentations += 1;
      }
    });

    preferences.forEach((preference) => {
      if (preference.default_theme_id && map[preference.default_theme_id]) {
        map[preference.default_theme_id].preferences += 1;
      }
    });

    return map;
  }, [preferences, presentations, themes]);

  const filteredThemes = useMemo(() => {
    const term = search.trim().toLowerCase();

    return themes.filter((theme) => {
      const matchesSearch = !term || [
        theme.name,
        theme.description,
        theme.title_font,
        theme.body_font,
        theme.transition_type,
      ].some((value) => String(value || '').toLowerCase().includes(term));

      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && theme.active !== false)
        || (statusFilter === 'inactive' && theme.active === false);

      const matchesType = typeFilter === 'all'
        || (typeFilter === 'official' && theme.is_official)
        || (typeFilter === 'custom' && !theme.is_official)
        || (typeFilter === 'premium' && theme.is_premium)
        || (typeFilter === 'free' && !theme.is_premium);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [search, statusFilter, themes, typeFilter]);

  const summary = useMemo(() => ({
    total: themes.length,
    active: themes.filter((theme) => theme.active !== false).length,
    official: themes.filter((theme) => theme.is_official).length,
    premium: themes.filter((theme) => theme.is_premium).length,
  }), [themes]);

  const openCreate = () => {
    setEditingTheme(null);
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setEditorOpen(true);
  };

  const openEdit = (theme) => {
    setEditingTheme(theme);
    setForm({
      ...EMPTY_FORM,
      ...theme,
      default_title_size: Number(theme.default_title_size) || 40,
      default_body_size: Number(theme.default_body_size) || 24,
    });
    setErrors({});
    setEditorOpen(true);
  };

  const validateForm = () => {
    const nextErrors = {};
    const normalizedName = form.name.trim();

    if (!normalizedName) nextErrors.name = 'Informe o nome do tema.';
    if (normalizedName.length > 80) nextErrors.name = 'Use no máximo 80 caracteres.';

    const duplicate = themes.some((theme) => (
      theme.id !== editingTheme?.id
      && String(theme.name || '').trim().toLowerCase() === normalizedName.toLowerCase()
    ));
    if (duplicate) nextErrors.name = 'Já existe um tema com esse nome.';

    if (form.thumbnail_url && !isValidUrl(form.thumbnail_url)) {
      nextErrors.thumbnail_url = 'Informe um endereço iniciado por http:// ou https://.';
    }

    [
      ['background_color', 'Cor de fundo'],
      ['text_color', 'Cor do texto'],
      ['title_color', 'Cor do título'],
      ['accent_color', 'Cor de destaque'],
    ].forEach(([field, label]) => {
      if (!/^#[0-9A-Fa-f]{6}$/.test(String(form[field] || '').trim())) {
        nextErrors[field] = `${label} deve usar o formato #RRGGBB.`;
      }
    });

    const titleSize = Number(form.default_title_size);
    const bodySize = Number(form.default_body_size);
    if (!Number.isFinite(titleSize) || titleSize < 18 || titleSize > 120) {
      nextErrors.default_title_size = 'Use um tamanho entre 18 e 120.';
    }
    if (!Number.isFinite(bodySize) || bodySize < 12 || bodySize > 80) {
      nextErrors.default_body_size = 'Use um tamanho entre 12 e 80.';
    }
    if (bodySize >= titleSize) {
      nextErrors.default_body_size = 'O texto deve ser menor que o título.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (
      !validateForm()
      || saving
      || saveLockRef.current
    ) {
      return;
    }

    saveLockRef.current = true;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      thumbnail_url: form.thumbnail_url.trim(),
      background_color: normalizeHex(form.background_color, '#FFFFFF'),
      text_color: normalizeHex(form.text_color, '#1A1A1A'),
      title_color: normalizeHex(form.title_color, '#111111'),
      accent_color: normalizeHex(form.accent_color, '#3B82F6'),
      title_font: form.title_font || 'Inter',
      body_font: form.body_font || 'Inter',
      default_title_size: Number(form.default_title_size),
      default_body_size: Number(form.default_body_size),
      default_alignment: form.default_alignment || 'left',
      transition_type: form.transition_type || 'fade',
      is_official: Boolean(form.is_official),
      is_premium: Boolean(form.is_premium),
      active: Boolean(form.active),
    };

    try {
      if (editingTheme?.id) {
        const updated = await base44.entities.PresentationTheme.update(
          editingTheme.id,
          payload,
        );

        setThemes((current) => sortThemesByName(
          current.map((theme) => (
            theme.id === editingTheme.id
              ? {
                  ...theme,
                  ...payload,
                  ...(updated || {}),
                }
              : theme
          )),
        ));

        toast({
          title: 'Tema atualizado',
          description: 'As alterações já estão disponíveis.',
        });
      } else {
        const created = await base44.entities.PresentationTheme.create(
          payload,
        );

        if (!created?.id) {
          throw new Error(
            'O novo tema não retornou um ID válido.',
          );
        }

        setThemes((current) => sortThemesByName([
          ...current,
          created,
        ]));

        toast({
          title: 'Tema criado',
          description:
            'O novo tema já pode ser usado nas apresentações.',
        });
      }

      setEditorOpen(false);
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
      toast({
        title: 'Não foi possível salvar',
        description: 'Revise os dados e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  };

  const handleDuplicate = async (theme) => {
    if (
      !theme?.id
      || saving
      || actionLockRef.current
    ) {
      return;
    }

    actionLockRef.current = true;
    setBusyThemeId(theme.id);
    setSaving(true);

    try {
      const created = await base44.entities.PresentationTheme.create({
        name: buildUniqueCopyName(theme.name, themes),
        description: theme.description || '',
        thumbnail_url: theme.thumbnail_url || '',
        background_color: normalizeHex(
          theme.background_color,
          '#FFFFFF',
        ),
        text_color: normalizeHex(
          theme.text_color,
          '#1A1A1A',
        ),
        title_color: normalizeHex(
          theme.title_color,
          '#111111',
        ),
        accent_color: normalizeHex(
          theme.accent_color,
          '#3B82F6',
        ),
        title_font: theme.title_font || 'Inter',
        body_font: theme.body_font || 'Inter',
        default_title_size:
          Number(theme.default_title_size) || 40,
        default_body_size:
          Number(theme.default_body_size) || 24,
        default_alignment:
          theme.default_alignment || 'left',
        transition_type:
          theme.transition_type || 'fade',
        is_official: false,
        is_premium: false,
        active: false,
      });

      if (!created?.id) {
        throw new Error(
          'A cópia do tema não retornou um ID válido.',
        );
      }

      setThemes((current) => sortThemesByName([
        ...current,
        created,
      ]));

      toast({
        title: 'Tema duplicado',
        description:
          'A cópia foi criada inativa para você revisar antes de publicar.',
      });
    } catch (error) {
      console.error('Erro ao duplicar tema:', error);

      toast({
        title: 'Não foi possível duplicar',
        description:
          error.message
          || 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      actionLockRef.current = false;
      setBusyThemeId('');
      setSaving(false);
    }
  };

  const toggleActive = async (theme) => {
    if (
      !theme?.id
      || saving
      || actionLockRef.current
    ) {
      return;
    }

    actionLockRef.current = true;
    setBusyThemeId(theme.id);
    setSaving(true);

    const nextValue = theme.active === false;

    try {
      const updated = await base44.entities.PresentationTheme.update(
        theme.id,
        {
          active: nextValue,
        },
      );

      setThemes((current) => current.map((item) => (
        item.id === theme.id
          ? {
              ...item,
              ...(updated || {}),
              active: nextValue,
            }
          : item
      )));

      toast({
        title: nextValue
          ? 'Tema ativado'
          : 'Tema desativado',
        description: nextValue
          ? 'Ele voltou a aparecer para os usuários.'
          : 'Apresentações antigas continuam preservando o tema.',
      });
    } catch (error) {
      console.error('Erro ao alterar status:', error);

      toast({
        title: 'Não foi possível alterar o status',
        variant: 'destructive',
      });
    } finally {
      actionLockRef.current = false;
      setBusyThemeId('');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const target = deleteTarget;

    if (
      !target?.id
      || saving
      || actionLockRef.current
    ) {
      return;
    }

    actionLockRef.current = true;
    setBusyThemeId(target.id);
    setSaving(true);

    try {
      const [
        currentPresentations,
        currentPreferences,
      ] = await Promise.all([
        base44.entities.Presentation.filter({
          theme_id: target.id,
        }),
        base44.entities.UserPreference.filter({
          default_theme_id: target.id,
        }),
      ]);

      const presentationUsage = uniqueById(
        currentPresentations,
      ).length;

      const preferenceUsage = uniqueById(
        currentPreferences,
      ).length;

      if (
        presentationUsage > 0
        || preferenceUsage > 0
      ) {
        toast({
          title: 'Tema em uso',
          description:
            'Desative o tema em vez de excluí-lo, ou remova primeiro seus vínculos.',
          variant: 'destructive',
        });

        setDeleteTarget(null);
        return;
      }

      await base44.entities.PresentationTheme.delete(
        target.id,
      );

      setThemes((current) => current.filter(
        (theme) => theme.id !== target.id,
      ));

      toast({
        title: 'Tema excluído',
      });

      setDeleteTarget(null);
    } catch (error) {
      console.error('Erro ao excluir tema:', error);

      toast({
        title: 'Não foi possível excluir',
        description:
          'Atualize a lista e tente novamente.',
        variant: 'destructive',
      });

      await loadData({ silent: true });
    } finally {
      actionLockRef.current = false;
      setBusyThemeId('');
      setSaving(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Carregando temas...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4">
        <Card className="w-full">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-2xl font-bold">Acesso restrito</h1>
            <p className="mt-2 text-muted-foreground">
              Somente administradores podem configurar os temas visuais do aplicativo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Administração</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Temas visuais</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Controle cores, fontes, alinhamento e aparência do modo apresentação.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => {
              setRefreshing(true);
              loadData({ silent: true });
            }}
            disabled={
              refreshing
              || saving
              || Boolean(busyThemeId)
            }
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={openCreate}
            disabled={saving || Boolean(busyThemeId)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo tema
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total" value={summary.total} icon={Palette} />
        <StatCard label="Ativos" value={summary.active} icon={Check} />
        <StatCard label="Oficiais" value={summary.official} icon={Sparkles} />
        <StatCard label="Premium" value={summary.premium} icon={Crown} />
      </section>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar temas..."
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="official">Oficiais</SelectItem>
              <SelectItem value="custom">Personalizados</SelectItem>
              <SelectItem value="free">Gratuitos</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filteredThemes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <Palette className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">Nenhum tema encontrado</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ajuste os filtros ou crie um novo tema visual.
            </p>
            <Button className="mt-5" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Criar tema
            </Button>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredThemes.map((theme) => {
            const usage = usageMap[theme.id] || { presentations: 0, preferences: 0 };
            return (
              <Card key={theme.id} className={`overflow-hidden ${theme.active === false ? 'opacity-70' : ''}`}>
                <CardContent className="p-0">
                  <button
                    type="button"
                    className="block w-full p-4 text-left"
                    onClick={() => setPreviewTheme(theme)}
                  >
                    <ThemePreview theme={theme} compact />
                  </button>

                  <div className="space-y-4 border-t p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold">{theme.name}</h2>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {theme.description || 'Sem descrição.'}
                        </p>
                      </div>
                      <Switch
                        checked={theme.active !== false}
                        onCheckedChange={() => toggleActive(theme)}
                        aria-label={`Ativar ${theme.name}`}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {theme.is_official && <Badge variant="secondary">Oficial</Badge>}
                      {theme.is_premium && <Badge className="bg-amber-500 text-white">Premium</Badge>}
                      {theme.active === false && <Badge variant="outline">Inativo</Badge>}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>{usage.presentations} apresentações</div>
                      <div>{usage.preferences} padrões</div>
                      <div className="truncate">Título: {theme.title_font || 'Inter'}</div>
                      <div className="truncate">Texto: {theme.body_font || 'Inter'}</div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <Button variant="outline" size="icon" onClick={() => setPreviewTheme(theme)} title="Visualizar">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => openEdit(theme)} title="Editar">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleDuplicate(theme)} title="Duplicar">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDeleteTarget(theme)}
                        disabled={usage.presentations > 0 || usage.preferences > 0}
                        title={usage.presentations > 0 || usage.preferences > 0 ? 'Tema em uso' : 'Excluir'}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      <Dialog open={editorOpen} onOpenChange={(open) => !saving && setEditorOpen(open)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTheme ? 'Editar tema' : 'Criar tema visual'}</DialogTitle>
            <DialogDescription>
              Configure a aparência que será aplicada no modo apresentação.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="theme-name">Nome *</Label>
                <Input
                  id="theme-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ex.: Escuro elegante"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme-description">Descrição</Label>
                <Textarea
                  id="theme-description"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Explique para quais apresentações este tema é indicado."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme-thumbnail">Imagem de capa</Label>
                <Input
                  id="theme-thumbnail"
                  value={form.thumbnail_url}
                  onChange={(event) => setForm((current) => ({ ...current, thumbnail_url: event.target.value }))}
                  placeholder="https://..."
                />
                {errors.thumbnail_url && <p className="text-xs text-destructive">{errors.thumbnail_url}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <ColorField
                    label="Cor de fundo"
                    value={form.background_color}
                    onChange={(value) => setForm((current) => ({ ...current, background_color: value }))}
                  />
                  {errors.background_color && <p className="mt-1 text-xs text-destructive">{errors.background_color}</p>}
                </div>
                <div>
                  <ColorField
                    label="Cor do texto"
                    value={form.text_color}
                    onChange={(value) => setForm((current) => ({ ...current, text_color: value }))}
                  />
                  {errors.text_color && <p className="mt-1 text-xs text-destructive">{errors.text_color}</p>}
                </div>
                <div>
                  <ColorField
                    label="Cor do título"
                    value={form.title_color}
                    onChange={(value) => setForm((current) => ({ ...current, title_color: value }))}
                  />
                  {errors.title_color && <p className="mt-1 text-xs text-destructive">{errors.title_color}</p>}
                </div>
                <div>
                  <ColorField
                    label="Cor de destaque"
                    value={form.accent_color}
                    onChange={(value) => setForm((current) => ({ ...current, accent_color: value }))}
                  />
                  {errors.accent_color && <p className="mt-1 text-xs text-destructive">{errors.accent_color}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Fonte do título</Label>
                  <Select value={form.title_font} onValueChange={(value) => setForm((current) => ({ ...current, title_font: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => <SelectItem key={font} value={font}>{font}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fonte do corpo</Label>
                  <Select value={form.body_font} onValueChange={(value) => setForm((current) => ({ ...current, body_font: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => <SelectItem key={font} value={font}>{font}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title-size">Tamanho padrão do título</Label>
                  <Input
                    id="title-size"
                    type="number"
                    min="18"
                    max="120"
                    value={form.default_title_size}
                    onChange={(event) => setForm((current) => ({ ...current, default_title_size: event.target.value }))}
                  />
                  {errors.default_title_size && <p className="text-xs text-destructive">{errors.default_title_size}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body-size">Tamanho padrão do texto</Label>
                  <Input
                    id="body-size"
                    type="number"
                    min="12"
                    max="80"
                    value={form.default_body_size}
                    onChange={(event) => setForm((current) => ({ ...current, default_body_size: event.target.value }))}
                  />
                  {errors.default_body_size && <p className="text-xs text-destructive">{errors.default_body_size}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Alinhamento padrão</Label>
                  <Select value={form.default_alignment} onValueChange={(value) => setForm((current) => ({ ...current, default_alignment: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALIGNMENTS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Transição</Label>
                  <Select value={form.transition_type} onValueChange={(value) => setForm((current) => ({ ...current, transition_type: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRANSITIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Oficial</Label>
                    <p className="text-xs text-muted-foreground">Identifica temas criados pela equipe do aplicativo.</p>
                  </div>
                  <Switch checked={form.is_official} onCheckedChange={(value) => setForm((current) => ({ ...current, is_official: value }))} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Premium</Label>
                    <p className="text-xs text-muted-foreground">Restringe o tema aos planos que liberam modelos premium.</p>
                  </div>
                  <Switch checked={form.is_premium} onCheckedChange={(value) => setForm((current) => ({ ...current, is_premium: value }))} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Ativo</Label>
                    <p className="text-xs text-muted-foreground">Permite que o tema seja escolhido pelos usuários.</p>
                  </div>
                  <Switch checked={form.active} onCheckedChange={(value) => setForm((current) => ({ ...current, active: value }))} />
                </div>
              </div>
            </div>

            <div className="space-y-3 lg:sticky lg:top-0 lg:self-start">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Prévia em tempo real</h3>
              </div>
              <ThemePreview theme={form} />
              <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                Cor de contraste sugerida para botões: 
                <span
                  className="ml-2 rounded px-2 py-1 font-medium"
                  style={{
                    backgroundColor: normalizeHex(form.accent_color, '#3B82F6'),
                    color: getContrastColor(form.accent_color),
                  }}
                >
                  Exemplo
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {editingTheme ? 'Salvar alterações' : 'Criar tema'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewTheme)} onOpenChange={(open) => !open && setPreviewTheme(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewTheme?.name}</DialogTitle>
            <DialogDescription>{previewTheme?.description || 'Prévia do tema visual.'}</DialogDescription>
          </DialogHeader>
          {previewTheme && <ThemePreview theme={previewTheme} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTheme(null)}>Fechar</Button>
            <Button onClick={() => {
              const target = previewTheme;
              setPreviewTheme(null);
              openEdit(target);
            }}>
              <Edit3 className="mr-2 h-4 w-4" />
              Editar tema
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tema?</AlertDialogTitle>
            <AlertDialogDescription>
              O tema “{deleteTarget?.name}” será removido definitivamente. Esta ação só é permitida quando ele não estiver vinculado a apresentações ou preferências.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}