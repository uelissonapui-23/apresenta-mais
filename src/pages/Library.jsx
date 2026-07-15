import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Check,
  Copy,
  FilePlus2,
  Filter,
  FolderOpen,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Tags,
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import EmptyState from '@/components/shared/EmptyState';

const ITEM_TYPES = [
  { value: 'citation', label: 'Citação' },
  { value: 'story', label: 'História' },
  { value: 'example', label: 'Exemplo' },
  { value: 'reference', label: 'Referência' },
  { value: 'application', label: 'Aplicação' },
  { value: 'question', label: 'Pergunta' },
  { value: 'block', label: 'Bloco reutilizável' },
];

const TYPE_LABELS = Object.fromEntries(
  ITEM_TYPES.map((item) => [item.value, item.label]),
);

const TYPE_TO_BLOCK_CODE = {
  citation: 'quote',
  story: 'story',
  example: 'example',
  reference: 'reference',
  application: 'application',
  question: 'question',
  block: 'topic',
};

const EMPTY_FORM = {
  title: '',
  item_type: 'citation',
  summary: '',
  content: '',
  source: '',
  tags: '',
  is_favorite: false,
};

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseTags(value) {
  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
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

function normalizeTags(value) {
  const seen = new Set();

  return parseTags(value)
    .filter((tag) => {
      const key = normalize(tag);

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .join(', ');
}

function createUniqueCopyTitle(baseTitle, items) {
  const base = String(baseTitle || 'Conteúdo').trim() || 'Conteúdo';
  const existingTitles = new Set(
    uniqueById(items).map((item) => normalize(item.title)),
  );

  let attempt = 1;
  let candidate = `${base} — cópia`;

  while (existingTitles.has(normalize(candidate))) {
    attempt += 1;
    candidate = `${base} — cópia ${attempt}`;
  }

  return candidate;
}

function buildAdditionalContent(item) {
  const lines = [];

  if (item?.source) {
    lines.push(`Fonte: ${item.source}`);
  }

  const tags = normalizeTags(item?.tags);

  if (tags) {
    lines.push(`Etiquetas: ${tags}`);
  }

  return lines.join('\n');
}

function LibraryLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <span className="text-sm">Carregando sua biblioteca...</span>
      </div>
    </div>
  );
}

function LibraryItemCard({
  item,
  onEdit,
  onDelete,
  onFavorite,
  onDuplicate,
  onInsert,
}) {
  const tags = parseTags(item.tags);

  return (
    <Card className="min-w-0 border-border/70 transition-all hover:border-primary/25 hover:shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => onFavorite(item)}
            className="mt-0.5 shrink-0 rounded-md p-1 hover:bg-muted"
            aria-label={item.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Star
              className={`h-5 w-5 ${
                item.is_favorite
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground'
              }`}
            />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 break-words font-semibold leading-snug">
                {item.title}
              </h3>

              <Badge variant="outline" className="shrink-0 text-[10px]">
                {TYPE_LABELS[item.item_type] || 'Conteúdo'}
              </Badge>
            </div>

            {item.summary && (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {item.summary}
              </p>
            )}

            {item.content && (
              <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed">
                {item.content}
              </p>
            )}

            {item.source && (
              <p className="mt-3 text-xs text-muted-foreground">
                <span className="font-medium">Fonte:</span> {item.source}
              </p>
            )}

            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.slice(0, 6).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}

                {tags.length > 6 && (
                  <Badge variant="secondary" className="text-[10px]">
                    +{tags.length - 6}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onInsert(item)}>
                <FilePlus2 className="mr-2 h-4 w-4" />
                Inserir em apresentação
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => onDuplicate(item)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicar
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => onDelete(item)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Library() {
  const { user, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();

  const [items, setItems] = useState([]);
  const [presentations, setPresentations] = useState([]);
  const [blockTypes, setBlockTypes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [loadError, setLoadError] = useState('');

  const saveLockRef = useRef(false);
  const deleteLockRef = useRef(false);
  const insertLockRef = useRef(false);
  const itemActionLocksRef = useRef(new Set());

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sortBy, setSortBy] = useState('recent');

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [insertTarget, setInsertTarget] = useState(null);
  const [selectedPresentationId, setSelectedPresentationId] = useState('');
  const [insertAsEssential, setInsertAsEssential] = useState(false);

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (!user?.id) {
        setItems([]);
        setPresentations([]);
        setBlockTypes([]);
        setLoadError('Entre na sua conta para acessar a biblioteca.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      setLoadError('');

      try {
        const [itemRows, presentationRows, typeRows] = await Promise.all([
          base44.entities.LibraryItem.filter(
            { user_id: user.id },
            '-updated_date',
          ),
          base44.entities.Presentation.filter(
            { user_id: user.id, is_archived: false },
            '-updated_date',
          ),
          base44.entities.BlockType.filter(
            { active: true },
            'order_index',
          ),
        ]);

        setItems(
          uniqueById(itemRows).filter(
            (item) => item.user_id === user.id,
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

        setBlockTypes(
          uniqueById(typeRows).filter(
            (type) => type.active !== false,
          ),
        );
      } catch (error) {
        console.error('Erro ao carregar biblioteca:', error);
        setLoadError('Não foi possível carregar sua biblioteca agora.');

        toast({
          title: 'Falha ao carregar a biblioteca',
          description: 'Confira sua conexão e tente novamente.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast, user?.id],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const term = normalize(search);

    const result = items.filter((item) => {
      if (typeFilter !== 'all' && item.item_type !== typeFilter) {
        return false;
      }

      if (favoriteOnly && !item.is_favorite) {
        return false;
      }

      if (!term) {
        return true;
      }

      const searchable = normalize([
        item.title,
        item.summary,
        item.content,
        item.source,
        item.tags,
        TYPE_LABELS[item.item_type],
      ].join(' '));

      return searchable.includes(term);
    });

    return [...result].sort((a, b) => {
      if (sortBy === 'title') {
        return String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR');
      }

      if (sortBy === 'favorites') {
        return Number(Boolean(b.is_favorite)) - Number(Boolean(a.is_favorite));
      }

      const aDate = new Date(a.updated_date || a.created_date || 0).getTime();
      const bDate = new Date(b.updated_date || b.created_date || 0).getTime();
      return bDate - aDate;
    });
  }, [favoriteOnly, items, search, sortBy, typeFilter]);

  const favoriteCount = useMemo(
    () => items.filter((item) => item.is_favorite).length,
    [items],
  );

  const openCreate = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      title: item.title || '',
      item_type: item.item_type || 'citation',
      summary: item.summary || '',
      content: item.content || '',
      source: item.source || '',
      tags: item.tags || '',
      is_favorite: Boolean(item.is_favorite),
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingItem(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    const title = form.title.trim();

    if (!title) {
      toast({
        title: 'Informe um título',
        description: 'O título é obrigatório para salvar o conteúdo.',
        variant: 'destructive',
      });
      return;
    }

    if (
      !user?.id
      || saving
      || saveLockRef.current
    ) {
      return;
    }

    if (
      editingItem?.id
      && (
        editingItem.user_id !== user.id
        || !items.some((item) => item.id === editingItem.id)
      )
    ) {
      toast({
        title: 'Conteúdo inválido',
        description: 'Atualize a biblioteca antes de editar novamente.',
        variant: 'destructive',
      });
      return;
    }

    const validType = ITEM_TYPES.some(
      (type) => type.value === form.item_type,
    );

    saveLockRef.current = true;
    setSaving(true);

    const payload = {
      title,
      item_type: validType
        ? form.item_type
        : 'citation',
      summary: form.summary.trim(),
      content: form.content.trim(),
      source: form.source.trim(),
      tags: normalizeTags(form.tags),
      is_favorite: Boolean(form.is_favorite),
    };

    try {
      if (editingItem?.id) {
        const updated = await base44.entities.LibraryItem.update(
          editingItem.id,
          payload,
        );

        setItems((current) => current.map((item) => (
          item.id === editingItem.id
            ? {
                ...item,
                ...payload,
                ...(updated || {}),
              }
            : item
        )));

        toast({ title: 'Conteúdo atualizado' });
      } else {
        const created = await base44.entities.LibraryItem.create({
          ...payload,
          user_id: user.id,
        });

        if (!created?.id) {
          throw new Error(
            'O novo conteúdo não retornou um ID válido.',
          );
        }

        setItems((current) => [
          created,
          ...current,
        ]);

        toast({
          title: 'Conteúdo adicionado à biblioteca',
        });
      }

      setFormOpen(false);
      setEditingItem(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      console.error(
        'Erro ao salvar item da biblioteca:',
        error,
      );

      toast({
        title: 'Não foi possível salvar',
        description:
          error.message
          || 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  };

  const handleFavorite = async (item) => {
    if (
      !item?.id
      || !user?.id
      || item.user_id !== user.id
      || itemActionLocksRef.current.has(item.id)
    ) {
      return;
    }

    itemActionLocksRef.current.add(item.id);

    const nextValue = !item.is_favorite;

    setItems((current) => current.map((currentItem) => (
      currentItem.id === item.id
        ? {
            ...currentItem,
            is_favorite: nextValue,
          }
        : currentItem
    )));

    try {
      const updated = await base44.entities.LibraryItem.update(
        item.id,
        {
          is_favorite: nextValue,
        },
      );

      if (updated?.id) {
        setItems((current) => current.map((currentItem) => (
          currentItem.id === item.id
            ? {
                ...currentItem,
                ...updated,
              }
            : currentItem
        )));
      }
    } catch (error) {
      console.error('Erro ao favoritar item:', error);

      setItems((current) => current.map((currentItem) => (
        currentItem.id === item.id
          ? {
              ...currentItem,
              is_favorite: !nextValue,
            }
          : currentItem
      )));

      toast({
        title: 'Não foi possível atualizar o favorito',
        variant: 'destructive',
      });
    } finally {
      itemActionLocksRef.current.delete(item.id);
    }
  };

  const handleDuplicate = async (item) => {
    if (
      !item?.id
      || !user?.id
      || item.user_id !== user.id
      || itemActionLocksRef.current.has(item.id)
    ) {
      return;
    }

    itemActionLocksRef.current.add(item.id);

    try {
      const created = await base44.entities.LibraryItem.create({
        user_id: user.id,
        title: createUniqueCopyTitle(
          item.title,
          items,
        ),
        item_type: ITEM_TYPES.some(
          (type) => type.value === item.item_type,
        )
          ? item.item_type
          : 'citation',
        summary: item.summary || '',
        content: item.content || '',
        source: item.source || '',
        tags: normalizeTags(item.tags),
        is_favorite: false,
      });

      if (!created?.id) {
        throw new Error(
          'A cópia não retornou um ID válido.',
        );
      }

      setItems((current) => [
        created,
        ...current,
      ]);

      toast({ title: 'Conteúdo duplicado' });
    } catch (error) {
      console.error('Erro ao duplicar item:', error);

      toast({
        title: 'Não foi possível duplicar',
        description:
          error.message
          || 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      itemActionLocksRef.current.delete(item.id);
    }
  };

  const handleDelete = async () => {
    const target = deleteTarget;

    if (
      !target?.id
      || !user?.id
      || target.user_id !== user.id
      || deleting
      || deleteLockRef.current
    ) {
      return;
    }

    deleteLockRef.current = true;
    setDeleting(true);

    try {
      await base44.entities.LibraryItem.delete(
        target.id,
      );

      setItems((current) => current.filter(
        (item) => item.id !== target.id,
      ));

      setDeleteTarget(null);

      toast({ title: 'Conteúdo excluído' });
    } catch (error) {
      console.error('Erro ao excluir item:', error);

      toast({
        title: 'Não foi possível excluir',
        description:
          'Atualize a biblioteca e tente novamente.',
        variant: 'destructive',
      });

      await loadData({ silent: true });
    } finally {
      deleteLockRef.current = false;
      setDeleting(false);
    }
  };

  const openInsertDialog = (item) => {
    if (
      !item?.id
      || item.user_id !== user?.id
    ) {
      toast({
        title: 'Conteúdo inválido',
        variant: 'destructive',
      });
      return;
    }

    setInsertTarget(item);
    setSelectedPresentationId('');
    setInsertAsEssential(false);
  };

  const findBlockTypeId = (itemType) => {
    const preferredCode = TYPE_TO_BLOCK_CODE[itemType] || 'topic';
    const normalizedPreferred = normalize(preferredCode);

    const exact = blockTypes.find((type) => (
      normalize(type.code) === normalizedPreferred
      || normalize(type.name) === normalizedPreferred
    ));

    if (exact) return exact.id;

    const fallback = blockTypes.find((type) => (
      normalize(type.code) === 'topic'
      || normalize(type.name).includes('topico')
    ));

    return fallback?.id || blockTypes[0]?.id || '';
  };

  const handleInsert = async () => {
    if (
      !insertTarget?.id
      || !selectedPresentationId
      || !user?.id
      || inserting
      || insertLockRef.current
    ) {
      return;
    }

    const selectedPresentation = presentations.find(
      (presentation) => (
        presentation.id === selectedPresentationId
        && presentation.user_id === user.id
        && presentation.is_archived !== true
      ),
    );

    if (!selectedPresentation) {
      toast({
        title: 'Apresentação inválida',
        description:
          'Atualize a biblioteca e selecione novamente.',
        variant: 'destructive',
      });
      return;
    }

    const currentItem = items.find(
      (item) => (
        item.id === insertTarget.id
        && item.user_id === user.id
      ),
    );

    if (!currentItem) {
      toast({
        title: 'Conteúdo não encontrado',
        description:
          'Ele pode ter sido removido em outra janela.',
        variant: 'destructive',
      });
      return;
    }

    const blockTypeId = findBlockTypeId(
      currentItem.item_type,
    );

    if (!blockTypeId) {
      toast({
        title: 'Tipo de bloco indisponível',
        description:
          'Ative ao menos um tipo de bloco antes de inserir.',
        variant: 'destructive',
      });
      return;
    }

    insertLockRef.current = true;
    setInserting(true);

    try {
      const allBlocks = uniqueById(
        await base44.entities.PresentationBlock.filter(
          {
            presentation_id: selectedPresentation.id,
          },
          'order_index',
        ),
      ).filter(
        (block) => (
          block.presentation_id
          === selectedPresentation.id
        ),
      );

      const rootBlocks = allBlocks.filter(
        (block) => !block.parent_id,
      );

      const nextOrder = rootBlocks.reduce(
        (highest, block) => Math.max(
          highest,
          Number(block.order_index) || 0,
        ),
        -1,
      ) + 1;

      const created = await base44.entities.PresentationBlock.create({
        presentation_id: selectedPresentation.id,
        parent_id: null,
        block_type_id: blockTypeId,
        title: currentItem.title,
        summary: currentItem.summary || '',
        content: currentItem.content || '',
        additional_content:
          buildAdditionalContent(currentItem),
        presenter_notes: '',
        order_index: nextOrder,
        depth_level: 0,
        importance_level: insertAsEssential ? 5 : 3,
        estimated_duration_seconds: 60,
        is_essential: insertAsEssential,
        is_hidden: false,
        is_collapsed: false,
        show_to_audience: true,
      });

      if (!created?.id) {
        throw new Error(
          'O novo bloco não retornou um ID válido.',
        );
      }

      setInsertTarget(null);
      setSelectedPresentationId('');
      setInsertAsEssential(false);

      toast({
        title: 'Conteúdo inserido',
        description:
          `Adicionado em “${selectedPresentation.title}”.`,
      });
    } catch (error) {
      console.error(
        'Erro ao inserir conteúdo na apresentação:',
        error,
      );

      toast({
        title: 'Não foi possível inserir o conteúdo',
        description:
          error.message
          || 'Abra a apresentação e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      insertLockRef.current = false;
      setInserting(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setFavoriteOnly(false);
    setSortBy('recent');
  };

  if (userLoading || loading) {
    return <LibraryLoading />;
  }

  if (!user?.id) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4">
        <EmptyState
          icon={BookOpen}
          title="Entre para acessar sua biblioteca"
          description="Seus conteúdos reutilizáveis ficam vinculados à sua conta."
          actionLabel="Entrar"
          onAction={() => {
            window.location.href = '/login';
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">Conteúdo reutilizável</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Biblioteca</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Guarde citações, histórias, exemplos, referências e blocos para usar novamente sem precisar reescrever.
          </p>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="outline"
            onClick={() => {
              setRefreshing(true);
              loadData({ silent: true });
            }}
            disabled={
              refreshing
              || saving
              || deleting
              || inserting
            }
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            onClick={openCreate}
            className="flex-1 sm:flex-none"
            disabled={saving || deleting || inserting}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo conteúdo
          </Button>
        </div>
      </header>

      {loadError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => loadData()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="mt-1 text-2xl font-bold">{items.length}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Favoritos</p>
            <p className="mt-1 text-2xl font-bold">{favoriteCount}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tipos usados</p>
            <p className="mt-1 text-2xl font-bold">
              {new Set(items.map((item) => item.item_type)).size}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Apresentações</p>
            <p className="mt-1 text-2xl font-bold">{presentations.length}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por título, conteúdo, fonte ou etiqueta..."
                className="pl-9"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {ITEM_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="title">Título</SelectItem>
                <SelectItem value="favorites">Favoritos primeiro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={favoriteOnly}
                onCheckedChange={(checked) => setFavoriteOnly(Boolean(checked))}
              />
              Mostrar somente favoritos
            </label>

            {(search || typeFilter !== 'all' || favoriteOnly || sortBy !== 'recent') && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Seus conteúdos</h2>
            <p className="text-xs text-muted-foreground">
              {filteredItems.length} de {items.length} itens exibidos
            </p>
          </div>

          <Badge variant="secondary">
            <Filter className="mr-1 h-3 w-3" />
            {typeFilter === 'all' ? 'Todos' : TYPE_LABELS[typeFilter]}
          </Badge>
        </div>

        {filteredItems.length === 0 ? (
          <Card className="border-dashed">
            <EmptyState
              icon={BookOpen}
              title={items.length === 0 ? 'Sua biblioteca está vazia' : 'Nenhum conteúdo encontrado'}
              description={
                items.length === 0
                  ? 'Salve conteúdos importantes para inserir rapidamente em novas apresentações.'
                  : 'Altere os filtros ou tente buscar com outras palavras.'
              }
              actionLabel={items.length === 0 ? 'Adicionar conteúdo' : 'Limpar filtros'}
              onAction={items.length === 0 ? openCreate : clearFilters}
            />
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredItems.map((item) => (
              <LibraryItemCard
                key={item.id}
                item={item}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onFavorite={handleFavorite}
                onDuplicate={handleDuplicate}
                onInsert={openInsertDialog}
              />
            ))}
          </div>
        )}
      </section>

      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar conteúdo' : 'Adicionar à biblioteca'}
            </DialogTitle>
            <DialogDescription>
              Esse conteúdo poderá ser reutilizado em qualquer apresentação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="library-title">Título *</Label>
                <Input
                  id="library-title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))}
                  placeholder="Ex.: A importância da perseverança"
                  maxLength={180}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.item_type}
                  onValueChange={(value) => setForm((current) => ({
                    ...current,
                    item_type: value,
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="library-source">Fonte</Label>
                <Input
                  id="library-source"
                  value={form.source}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    source: event.target.value,
                  }))}
                  placeholder="Livro, autor, site, referência..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="library-summary">Resumo</Label>
              <Textarea
                id="library-summary"
                rows={3}
                value={form.summary}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  summary: event.target.value,
                }))}
                placeholder="Uma descrição curta para localizar e entender o conteúdo rapidamente."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="library-content">Conteúdo</Label>
              <Textarea
                id="library-content"
                rows={8}
                value={form.content}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  content: event.target.value,
                }))}
                placeholder="Escreva aqui o conteúdo completo..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="library-tags">Etiquetas</Label>
              <div className="relative">
                <Tags className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="library-tags"
                  value={form.tags}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    tags: event.target.value,
                  }))}
                  placeholder="fé, liderança, ensino, vendas"
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Separe as etiquetas com vírgulas.
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3">
              <Checkbox
                checked={form.is_favorite}
                onCheckedChange={(checked) => setForm((current) => ({
                  ...current,
                  is_favorite: Boolean(checked),
                }))}
              />
              <div>
                <p className="text-sm font-medium">Adicionar aos favoritos</p>
                <p className="text-xs text-muted-foreground">
                  Facilita encontrar este conteúdo depois.
                </p>
              </div>
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeForm} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving ? 'Salvando...' : editingItem ? 'Salvar alterações' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir conteúdo?</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.title}” será removido da biblioteca. Os blocos já inseridos em apresentações não serão apagados.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(insertTarget)}
        onOpenChange={(open) => {
          if (!open && !inserting) {
            setInsertTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Inserir em uma apresentação</DialogTitle>
            <DialogDescription>
              Escolha onde deseja adicionar “{insertTarget?.title}”. O conteúdo será criado como um novo bloco principal.
            </DialogDescription>
          </DialogHeader>

          {presentations.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-medium">Você ainda não possui apresentações</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie uma apresentação antes de inserir conteúdos da biblioteca.
              </p>
              <Button asChild className="mt-4">
                <Link to="/new-presentation">Criar apresentação</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-1">
              <div className="space-y-2">
                <Label>Apresentação *</Label>
                <Select
                  value={selectedPresentationId}
                  onValueChange={setSelectedPresentationId}
                >
                  <SelectTrigger>
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

              <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3">
                <Checkbox
                  checked={insertAsEssential}
                  onCheckedChange={(checked) => setInsertAsEssential(Boolean(checked))}
                />
                <div>
                  <p className="text-sm font-medium">Marcar como essencial</p>
                  <p className="text-xs text-muted-foreground">
                    O bloco receberá importância máxima e será priorizado em versões curtas.
                  </p>
                </div>
              </label>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setInsertTarget(null)} disabled={inserting}>
              Cancelar
            </Button>
            {presentations.length > 0 && (
              <Button
                onClick={handleInsert}
                disabled={inserting || !selectedPresentationId}
              >
                {inserting ? 'Inserindo...' : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Inserir conteúdo
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}