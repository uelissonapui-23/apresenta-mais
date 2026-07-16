import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Church,
  GraduationCap,
  LayoutTemplate,
  Lightbulb,
  Loader2,
  Mic2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shapes,
  Sparkles,
  Trash2,
  Users,
  XCircle,
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';

const DEFAULT_FORM = {
  name: '',
  description: '',
  icon: 'Shapes',
  color: '#6366f1',
  default_structure_id: '',
  order_index: 0,
  active: true,
};

const ICON_OPTIONS = [
  { value: 'Shapes', label: 'Genérico', icon: Shapes },
  { value: 'Church', label: 'Igreja / Pregação', icon: Church },
  { value: 'BookOpen', label: 'Estudo / Leitura', icon: BookOpen },
  { value: 'GraduationCap', label: 'Aula / Ensino', icon: GraduationCap },
  { value: 'Mic2', label: 'Palestra / Evento', icon: Mic2 },
  { value: 'Briefcase', label: 'Negócios / Projeto', icon: Briefcase },
  { value: 'Users', label: 'Reunião / Grupo', icon: Users },
  { value: 'Lightbulb', label: 'Ideia / Criatividade', icon: Lightbulb },
  { value: 'Sparkles', label: 'Inspirador', icon: Sparkles },
  { value: 'LayoutTemplate', label: 'Modelo / Estrutura', icon: LayoutTemplate },
];

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
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

function sortByOrderAndName(rows) {
  return uniqueById(rows).sort((left, right) => {
    const orderDifference = (
      normalizeNumber(left?.order_index)
      - normalizeNumber(right?.order_index)
    );

    if (orderDifference !== 0) {
      return orderDifference;
    }

    return String(left?.name || '').localeCompare(
      String(right?.name || ''),
      'pt-BR',
      { sensitivity: 'base' },
    );
  });
}

function getIconComponent(iconName) {
  return ICON_OPTIONS.find((item) => item.value === iconName)?.icon || Shapes;
}

function isValidHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || '').trim());
}

function AccessDenied() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-xl items-center px-4 py-10">
      <Card className="w-full border-destructive/25">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <XCircle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Apenas administradores podem gerenciar os tipos de apresentação.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <p className="text-sm">Carregando tipos de apresentação...</p>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, description }) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-5 w-5 text-foreground/70" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TypeCard({
  type,
  template,
  presentationCount,
  templateCount,
  flowCount,
  busy,
  onEdit,
  onToggleActive,
  onMove,
  onDelete,
  canMoveUp,
  canMoveDown,
}) {
  const Icon = getIconComponent(type.icon);
  const color = isValidHexColor(type.color) ? type.color : '#6366f1';

  return (
    <Card className={`overflow-hidden border-border/70 ${!type.active ? 'opacity-70' : ''}`}>
      <div className="h-1.5" style={{ backgroundColor: color }} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${color}1A`, color }}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="truncate text-lg">
                  {type.name || 'Tipo sem nome'}
                </CardTitle>
                <Badge variant={type.active ? 'default' : 'secondary'}>
                  {type.active ? 'Ativo' : 'Inativo'}
                </Badge>
                <Badge variant="outline">Ordem {normalizeNumber(type.order_index, 0)}</Badge>
              </div>
              <p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                {type.description || 'Sem descrição cadastrada.'}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="grid grid-cols-3 gap-2 rounded-xl border bg-muted/20 p-3 text-center">
          <div>
            <p className="text-lg font-bold">{presentationCount}</p>
            <p className="text-[11px] text-muted-foreground">Apresentações</p>
          </div>
          <div>
            <p className="text-lg font-bold">{templateCount}</p>
            <p className="text-[11px] text-muted-foreground">Modelos</p>
          </div>
          <div>
            <p className="text-lg font-bold">{flowCount}</p>
            <p className="text-[11px] text-muted-foreground">Fluxos</p>
          </div>
        </div>

        <div className="rounded-xl border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Estrutura padrão
          </p>
          <p className="mt-1 text-sm font-medium">
            {template?.name || 'Nenhuma estrutura padrão definida'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {template
              ? 'Usada como referência inicial para este tipo.'
              : 'O usuário poderá escolher um modelo ou criar do zero.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(type)}
            disabled={busy}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onToggleActive(type)}
            disabled={busy}
          >
            {type.active ? 'Desativar' : 'Ativar'}
          </Button>

          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onMove(type, -1)}
              disabled={busy || !canMoveUp}
              aria-label={`Mover ${type.name} para cima`}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onMove(type, 1)}
              disabled={busy || !canMoveDown}
              aria-label={`Mover ${type.name} para baixo`}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(type)}
              disabled={busy}
              aria-label={`Excluir ${type.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminTypes() {
  const { toast } = useToast();
  const {
    user,
    isAdmin,
    loading: userLoading,
  } = useCurrentUser();

  const [types, setTypes] = useState([]);
  const [presentations, setPresentations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadLockRef = useRef(false);
  const saveLockRef = useRef(false);
  const actionLockRef = useRef(false);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (loadLockRef.current) {
      return;
    }

    if (!user?.id || !isAdmin) {
      setTypes([]);
      setPresentations([]);
      setTemplates([]);
      setFlows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    loadLockRef.current = true;

    if (!silent) {
      setLoading(true);
    }

    try {
      const [typeRows, presentationRows, templateRows, flowRows] = await Promise.all([
        base44.entities.PresentationType.list('order_index'),
        base44.entities.Presentation.list('-updated_date'),
        base44.entities.PresentationTemplate.list('name'),
        base44.entities.GuidedFlow.list('name'),
      ]);

      setTypes(sortByOrderAndName(typeRows));
      setPresentations(uniqueById(presentationRows));
      setTemplates(uniqueById(templateRows));
      setFlows(uniqueById(flowRows));
    } catch (error) {
      console.error('Erro ao carregar tipos:', error);
      toast({
        title: 'Não foi possível carregar os tipos',
        description: 'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      loadLockRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, toast, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sortedTypes = useMemo(
    () => sortByOrderAndName(types),
    [types],
  );

  const filteredTypes = useMemo(() => {
    const term = search.trim().toLowerCase();

    return sortedTypes.filter((type) => {
      if (statusFilter === 'active' && !type.active) return false;
      if (statusFilter === 'inactive' && type.active) return false;
      if (!term) return true;

      return [type.name, type.description, type.icon]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [search, sortedTypes, statusFilter]);

  const templateMap = useMemo(
    () => Object.fromEntries(templates.map((template) => [template.id, template])),
    [templates],
  );

  const presentationCountMap = useMemo(() => {
    const map = {};
    presentations.forEach((item) => {
      if (!item.presentation_type_id) return;
      map[item.presentation_type_id] = (map[item.presentation_type_id] || 0) + 1;
    });
    return map;
  }, [presentations]);

  const templateCountMap = useMemo(() => {
    const map = {};
    templates.forEach((item) => {
      if (!item.presentation_type_id) return;
      map[item.presentation_type_id] = (map[item.presentation_type_id] || 0) + 1;
    });
    return map;
  }, [templates]);

  const flowCountMap = useMemo(() => {
    const map = {};
    flows.forEach((item) => {
      if (!item.presentation_type_id) return;
      map[item.presentation_type_id] = (map[item.presentation_type_id] || 0) + 1;
    });
    return map;
  }, [flows]);

  const activeCount = types.filter((type) => type.active).length;
  const usedCount = types.filter((type) => (presentationCountMap[type.id] || 0) > 0).length;
  const configuredCount = types.filter((type) => !!type.default_structure_id).length;

  const openCreateDialog = () => {
    const nextOrder = sortedTypes.length
      ? Math.max(...sortedTypes.map((item) => normalizeNumber(item.order_index, 0))) + 1
      : 1;

    setEditingType(null);
    setForm({ ...DEFAULT_FORM, order_index: nextOrder });
    setDialogOpen(true);
  };

  const openEditDialog = (type) => {
    setEditingType(type);
    setForm({
      name: type.name || '',
      description: type.description || '',
      icon: type.icon || 'Shapes',
      color: isValidHexColor(type.color) ? type.color : '#6366f1',
      default_structure_id: type.default_structure_id || '',
      order_index: normalizeNumber(type.order_index, 0),
      active: type.active !== false,
    });
    setDialogOpen(true);
  };

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (
      saving
      || saveLockRef.current
    ) {
      return;
    }
    const name = form.name.trim();
    const description = form.description.trim();
    const color = form.color.trim();

    if (!name) {
      toast({
        title: 'Informe o nome do tipo',
        description: 'O nome é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    const duplicate = types.some(
      (item) => item.id !== editingType?.id && String(item.name || '').trim().toLowerCase() === name.toLowerCase(),
    );

    if (duplicate) {
      toast({
        title: 'Nome já utilizado',
        description: 'Já existe um tipo de apresentação com esse nome.',
        variant: 'destructive',
      });
      return;
    }

    if (!isValidHexColor(color)) {
      toast({
        title: 'Cor inválida',
        description: 'Use uma cor hexadecimal completa, por exemplo #6366f1.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      name,
      description,
      icon: form.icon || 'Shapes',
      color,
      default_structure_id: form.default_structure_id || '',
      order_index: normalizeNumber(form.order_index, 0),
      active: !!form.active,
    };

    saveLockRef.current = true;
    setSaving(true);

    try {
      if (editingType?.id) {
        const updated = await base44.entities.PresentationType.update(
          editingType.id,
          payload,
        );

        setTypes((current) => sortByOrderAndName(
          current.map((item) => (
            item.id === editingType.id
              ? {
                  ...item,
                  ...payload,
                  ...(updated || {}),
                }
              : item
          )),
        ));

        toast({
          title: 'Tipo atualizado',
          description: 'As alterações foram salvas.',
        });
      } else {
        const created = await base44.entities.PresentationType.create(
          payload,
        );

        if (!created?.id) {
          throw new Error(
            'O novo tipo não retornou um ID válido.',
          );
        }

        setTypes((current) => sortByOrderAndName([
          ...current,
          created,
        ]));

        toast({
          title: 'Tipo criado',
          description:
            'O novo tipo já pode ser usado no aplicativo.',
        });
      }

      setDialogOpen(false);
      setEditingType(null);
      setForm(DEFAULT_FORM);
    } catch (error) {
      console.error('Erro ao salvar tipo:', error);
      toast({
        title: 'Não foi possível salvar',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  };

  const handleToggleActive = async (type) => {
    if (
      !type?.id
      || busyId
      || actionLockRef.current
    ) {
      return;
    }

    actionLockRef.current = true;
    setBusyId(type.id);

    const nextValue = !type.active;

    try {
      const updated = await base44.entities.PresentationType.update(
        type.id,
        {
          active: nextValue,
        },
      );

      setTypes((current) => current.map((item) => (
        item.id === type.id
          ? {
              ...item,
              ...(updated || {}),
              active: nextValue,
            }
          : item
      )));

      toast({
        title: nextValue
          ? 'Tipo ativado'
          : 'Tipo desativado',
        description: nextValue
          ? 'Ele voltou a aparecer nas opções de criação.'
          : 'Apresentações existentes continuam preservadas.',
      });
    } catch (error) {
      console.error('Erro ao alterar status:', error);

      toast({
        title: 'Não foi possível alterar o status',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      actionLockRef.current = false;
      setBusyId('');
    }
  };

  const handleMove = async (type, direction) => {
    if (
      !type?.id
      || busyId
      || actionLockRef.current
    ) {
      return;
    }

    const currentIndex = sortedTypes.findIndex(
      (item) => item.id === type.id,
    );

    const targetIndex = currentIndex + direction;

    if (
      currentIndex < 0
      || targetIndex < 0
      || targetIndex >= sortedTypes.length
    ) {
      return;
    }

    const target = sortedTypes[targetIndex];

    const currentOrder = normalizeNumber(
      type.order_index,
      currentIndex + 1,
    );

    const targetOrder = normalizeNumber(
      target.order_index,
      targetIndex + 1,
    );

    actionLockRef.current = true;
    setBusyId(type.id);

    try {
      await base44.entities.PresentationType.update(
        type.id,
        {
          order_index: targetOrder,
        },
      );

      try {
        await base44.entities.PresentationType.update(
          target.id,
          {
            order_index: currentOrder,
          },
        );
      } catch (targetError) {
        try {
          await base44.entities.PresentationType.update(
            type.id,
            {
              order_index: currentOrder,
            },
          );
        } catch {
          // A lista será recarregada abaixo.
        }

        throw targetError;
      }

      setTypes((current) => sortByOrderAndName(
        current.map((item) => {
          if (item.id === type.id) {
            return {
              ...item,
              order_index: targetOrder,
            };
          }

          if (item.id === target.id) {
            return {
              ...item,
              order_index: currentOrder,
            };
          }

          return item;
        }),
      ));
    } catch (error) {
      console.error('Erro ao reordenar tipo:', error);

      toast({
        title: 'Não foi possível alterar a ordem',
        description:
          'A lista será atualizada para refletir o estado real.',
        variant: 'destructive',
      });

      await loadData({ silent: true });
    } finally {
      actionLockRef.current = false;
      setBusyId('');
    }
  };

  const requestDelete = (type) => {
    setDeleteTarget(type);
  };

  const handleDelete = async () => {
    const target = deleteTarget;

    if (
      !target?.id
      || busyId
      || actionLockRef.current
    ) {
      return;
    }

    actionLockRef.current = true;
    setBusyId(target.id);

    try {
      const [
        currentPresentations,
        currentTemplates,
        currentFlows,
      ] = await Promise.all([
        base44.entities.Presentation.filter({
          presentation_type_id: target.id,
        }),
        base44.entities.PresentationTemplate.filter({
          presentation_type_id: target.id,
        }),
        base44.entities.GuidedFlow.filter({
          presentation_type_id: target.id,
        }),
      ]);

      const presentationCount = uniqueById(
        currentPresentations,
      ).length;

      const templateCount = uniqueById(
        currentTemplates,
      ).length;

      const flowCount = uniqueById(
        currentFlows,
      ).length;

      if (
        presentationCount > 0
        || templateCount > 0
        || flowCount > 0
      ) {
        toast({
          title: 'Este tipo está em uso',
          description:
            'Desative-o ou remova primeiro os vínculos com apresentações, modelos e fluxos guiados.',
          variant: 'destructive',
        });

        setDeleteTarget(null);
        return;
      }

      await base44.entities.PresentationType.delete(
        target.id,
      );

      setTypes((current) => current.filter(
        (item) => item.id !== target.id,
      ));

      toast({
        title: 'Tipo excluído',
        description:
          'O registro foi removido definitivamente.',
      });

      setDeleteTarget(null);
    } catch (error) {
      console.error('Erro ao excluir tipo:', error);

      toast({
        title: 'Não foi possível excluir',
        description:
          'Atualize a lista e tente novamente.',
        variant: 'destructive',
      });

      await loadData({ silent: true });
    } finally {
      actionLockRef.current = false;
      setBusyId('');
    }
  };

  const handleRefresh = async () => {
    if (
      refreshing
      || saving
      || busyId
      || loadLockRef.current
    ) {
      return;
    }

    setRefreshing(true);
    await loadData({ silent: true });
  };

  if (userLoading || loading) return <LoadingState />;
  if (!isAdmin) return <AccessDenied />;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Administração
            </Link>
          </Button>
          <p className="text-sm font-medium text-primary">Configuração da criação</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Tipos de apresentação</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Defina as categorias usadas na criação guiada, nos modelos e nos filtros do aplicativo.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            disabled={
              refreshing
              || saving
              || Boolean(busyId)
              || loadLockRef.current
            }
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            type="button"
            onClick={openCreateDialog}
            className="w-full sm:w-auto"
            disabled={
              saving
              || Boolean(busyId)
              || loadLockRef.current
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo tipo
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={Shapes} label="Tipos" value={types.length} description="Total cadastrado" />
        <SummaryCard icon={CheckCircle2} label="Ativos" value={activeCount} description="Disponíveis aos usuários" />
        <SummaryCard icon={Users} label="Em uso" value={usedCount} description="Com apresentações vinculadas" />
        <SummaryCard icon={LayoutTemplate} label="Com estrutura" value={configuredCount} description="Modelo padrão definido" />
      </section>

      <Card className="border-border/70">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, descrição ou ícone..."
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Somente ativos</SelectItem>
                <SelectItem value="inactive">Somente inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredTypes.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            icon={Shapes}
            title={types.length === 0 ? 'Nenhum tipo cadastrado' : 'Nenhum tipo encontrado'}
            description={
              types.length === 0
                ? 'Cadastre categorias como Pregação, Aula, Palestra e Reunião.'
                : 'Altere os filtros ou o texto pesquisado.'
            }
            actionLabel={types.length === 0 ? 'Criar primeiro tipo' : undefined}
            onAction={types.length === 0 ? openCreateDialog : undefined}
          />
        </Card>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {filteredTypes.map((type) => {
            const globalIndex = sortedTypes.findIndex((item) => item.id === type.id);
            return (
              <TypeCard
                key={type.id}
                type={type}
                template={templateMap[type.default_structure_id]}
                presentationCount={presentationCountMap[type.id] || 0}
                templateCount={templateCountMap[type.id] || 0}
                flowCount={flowCountMap[type.id] || 0}
                busy={busyId === type.id}
                onEdit={openEditDialog}
                onToggleActive={handleToggleActive}
                onMove={handleMove}
                onDelete={requestDelete}
                canMoveUp={globalIndex > 0}
                canMoveDown={globalIndex >= 0 && globalIndex < sortedTypes.length - 1}
              />
            );
          })}
        </section>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Como os tipos são usados</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                O tipo escolhido orienta os modelos, perguntas guiadas e dicas apresentadas ao usuário. Desativar um tipo apenas impede novas escolhas; apresentações antigas continuam funcionando normalmente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Editar tipo' : 'Novo tipo de apresentação'}</DialogTitle>
            <DialogDescription>
              Configure como esta categoria será identificada e ordenada no aplicativo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid gap-2">
              <Label htmlFor="type-name">Nome *</Label>
              <Input
                id="type-name"
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                placeholder="Ex.: Pregação"
                maxLength={80}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type-description">Descrição</Label>
              <Textarea
                id="type-description"
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                placeholder="Explique quando este tipo deve ser escolhido."
                rows={4}
                maxLength={500}
              />
              <p className="text-right text-xs text-muted-foreground">
                {form.description.length}/500
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Ícone</Label>
                <Select value={form.icon} onValueChange={(value) => updateForm('icon', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um ícone" />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((option) => {
                      const OptionIcon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <OptionIcon className="h-4 w-4" />
                            {option.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type-color">Cor</Label>
                <div className="flex gap-2">
                  <Input
                    id="type-color"
                    type="color"
                    value={isValidHexColor(form.color) ? form.color : '#6366f1'}
                    onChange={(event) => updateForm('color', event.target.value)}
                    className="h-10 w-14 shrink-0 p-1"
                  />
                  <Input
                    value={form.color}
                    onChange={(event) => updateForm('color', event.target.value)}
                    placeholder="#6366f1"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="type-order">Ordem</Label>
                <Input
                  id="type-order"
                  type="number"
                  min="0"
                  step="1"
                  value={form.order_index}
                  onChange={(event) => updateForm('order_index', event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label>Estrutura padrão</Label>
                <Select
                  value={form.default_structure_id || 'none'}
                  onValueChange={(value) => updateForm('default_structure_id', value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma estrutura" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma estrutura padrão</SelectItem>
                    {templates
                      .filter((template) => template.active !== false)
                      .map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name || 'Modelo sem nome'}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div>
                <Label htmlFor="type-active" className="font-semibold">Tipo ativo</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Quando desativado, deixa de aparecer para novas apresentações.
                </p>
              </div>
              <Switch
                id="type-active"
                checked={!!form.active}
                onCheckedChange={(checked) => updateForm('active', checked)}
              />
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Prévia</p>
              <div className="mt-3 flex items-center gap-3">
                {(() => {
                  const PreviewIcon = getIconComponent(form.icon);
                  const previewColor = isValidHexColor(form.color) ? form.color : '#6366f1';
                  return (
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: `${previewColor}1A`, color: previewColor }}
                    >
                      <PreviewIcon className="h-6 w-6" />
                    </div>
                  );
                })()}
                <div className="min-w-0">
                  <p className="font-semibold">{form.name.trim() || 'Nome do tipo'}</p>
                  <p className="line-clamp-1 text-sm text-muted-foreground">
                    {form.description.trim() || 'Descrição de quando este tipo deve ser utilizado.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingType ? 'Salvar alterações' : 'Criar tipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir tipo de apresentação?"
        description={
          deleteTarget
            ? `O tipo “${deleteTarget.name || 'sem nome'}” será removido definitivamente. A exclusão só será permitida se ele não estiver vinculado a apresentações, modelos ou fluxos guiados.`
            : ''
        }
        confirmLabel="Excluir definitivamente"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}