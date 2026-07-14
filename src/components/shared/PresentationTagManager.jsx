import React, { useMemo, useState } from 'react';
import { Plus, Tag as TagIcon, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const TAG_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
];

const DEFAULT_TAG_COLOR = '#3B82F6';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function TagBadge({ tag, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{
        backgroundColor: `${tag.color || DEFAULT_TAG_COLOR}20`,
        color: tag.color || DEFAULT_TAG_COLOR,
      }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: tag.color || DEFAULT_TAG_COLOR }}
      />
      {tag.name}
      {onRemove && (
        <button type="button" onClick={onRemove} className="ml-0.5 hover:opacity-70">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export default function PresentationTagManager({
  presentationId,
  tags,
  presentationTags,
  onTagsChanged,
  compact = false,
}) {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLOR);
  const [saving, setSaving] = useState(false);

  const tagMap = useMemo(
    () => Object.fromEntries(tags.map((t) => [t.id, t])),
    [tags],
  );

  const appliedTagIds = useMemo(
    () => presentationTags
      .filter((pt) => pt.presentation_id === presentationId)
      .map((pt) => pt.tag_id),
    [presentationTags, presentationId],
  );

  const appliedTags = appliedTagIds.map((id) => tagMap[id]).filter(Boolean);

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name) {
      toast({ title: 'Informe o nome da etiqueta', variant: 'destructive' });
      return;
    }

    const existing = tags.find((t) => normalizeText(t.name) === normalizeText(name));
    if (existing) {
      toast({ title: 'Já existe uma etiqueta com esse nome', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const firstTag = tags[0];
      await base44.entities.Tag.create({
        user_id: firstTag?.user_id || '',
        name,
        color: newTagColor,
      });
      onTagsChanged();
      setNewTagName('');
      setNewTagColor(DEFAULT_TAG_COLOR);
      setShowCreate(false);
      toast({ title: 'Etiqueta criada' });
    } catch (error) {
      toast({ title: 'Não foi possível criar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTag = async (tagId) => {
    const existing = presentationTags.find(
      (pt) => pt.presentation_id === presentationId && pt.tag_id === tagId,
    );

    try {
      if (existing) {
        await base44.entities.PresentationTag.delete(existing.id);
      } else {
        await base44.entities.PresentationTag.create({
          presentation_id: presentationId,
          tag_id: tagId,
        });
      }
      onTagsChanged();
    } catch (error) {
      toast({ title: 'Não foi possível atualizar', variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {appliedTags.map((tag) => (
          <TagBadge key={tag.id} tag={tag} />
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted"
            >
              <TagIcon className="h-3 w-3" />
              {compact ? '' : 'Etiqueta'}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            {tags.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Crie sua primeira etiqueta para organizar apresentações.
              </div>
            ) : (
              tags.map((tag) => {
                const isApplied = appliedTagIds.includes(tag.id);
                return (
                  <DropdownMenuItem
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.id)}
                  >
                    <span
                      className="mr-2 h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color || DEFAULT_TAG_COLOR }}
                    />
                    <span className="flex-1 truncate">{tag.name}</span>
                    {isApplied && <X className="h-3 w-3 text-muted-foreground" />}
                  </DropdownMenuItem>
                );
              })
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar nova etiqueta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova etiqueta</DialogTitle>
            <DialogDescription>
              Crie etiquetas para organizar e filtrar suas apresentações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Nome</Label>
              <Input
                id="tag-name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Ex.: Importante, Igreja, Trabalho..."
                autoFocus
                maxLength={40}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTagName.trim()) {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewTagColor(color)}
                    className={`h-7 w-7 rounded-full transition-transform ${
                      newTagColor === color ? 'scale-125 ring-2 ring-offset-2 ring-ring' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Cor ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTag} disabled={saving || !newTagName.trim()}>
              {saving ? 'Criando...' : 'Criar etiqueta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}