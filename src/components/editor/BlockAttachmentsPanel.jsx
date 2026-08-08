import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Paperclip,
  Plus,
  Quote,
  Trash2,
  Video,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import { normalizeHttpUrl } from '@/lib/safeUrl';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ATTACHMENT_TYPES = [
  { value: 'image', label: 'Imagem', icon: ImageIcon },
  { value: 'video', label: 'Vídeo', icon: Video },
  { value: 'link', label: 'Link', icon: LinkIcon },
  { value: 'document', label: 'Documento', icon: FileText },
  { value: 'audio', label: 'Áudio', icon: FileText },
];

const REFERENCE_TYPES = [
  'Livro',
  'Artigo',
  'Site',
  'Bíblia',
  'Estudo',
  'Autoridade',
  'Pesquisa',
  'Outro',
];

const EMPTY_ATTACHMENT = {
  attachment_type: 'link',
  file_url: '',
  title: '',
  description: '',
};

const EMPTY_REFERENCE = {
  reference_type: 'Livro',
  title: '',
  reference_text: '',
  source: '',
  url: '',
};

function getAttachmentIcon(type) {
  const found = ATTACHMENT_TYPES.find((t) => t.value === type);
  return found?.icon || LinkIcon;
}

export default function BlockAttachmentsPanel({ blockId }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [references, setReferences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAttachmentForm, setShowAttachmentForm] = useState(false);
  const [showReferenceForm, setShowReferenceForm] = useState(false);
  const [attachmentForm, setAttachmentForm] = useState(EMPTY_ATTACHMENT);
  const [referenceForm, setReferenceForm] = useState(EMPTY_REFERENCE);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!blockId) return;
    setLoading(true);
    try {
      const [attRows, refRows] = await Promise.all([
        base44.entities.BlockAttachment.filter({ block_id: blockId }, 'order_index'),
        base44.entities.BlockReference.filter({ block_id: blockId }, '-created_date'),
      ]);
      setAttachments(Array.isArray(attRows) ? attRows : []);
      setReferences(Array.isArray(refRows) ? refRows : []);
    } catch (error) {
      console.error('Erro ao carregar anexos:', error);
    } finally {
      setLoading(false);
    }
  }, [blockId]);

  useEffect(() => {
    if (open && blockId) {
      loadData();
    }
  }, [open, blockId, loadData]);

  const handleSaveAttachment = async () => {
    const safeFileUrl = normalizeHttpUrl(attachmentForm.file_url);
    if (!safeFileUrl) {
      toast({
        title: 'Informe uma URL válida',
        description: 'Use um endereço iniciado por http:// ou https://.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const nextOrder = attachments.length > 0
        ? Math.max(...attachments.map((a) => Number(a.order_index) || 0)) + 1
        : 0;

      const created = await base44.entities.BlockAttachment.create({
        block_id: blockId,
        attachment_type: attachmentForm.attachment_type,
        file_url: safeFileUrl,
        title: attachmentForm.title.trim(),
        description: attachmentForm.description.trim(),
        order_index: nextOrder,
      });
      setAttachments((prev) => [...prev, created]);
      setAttachmentForm(EMPTY_ATTACHMENT);
      setShowAttachmentForm(false);
      toast({ title: 'Anexo adicionado' });
    } catch (error) {
      toast({ title: 'Não foi possível adicionar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReference = async () => {
    if (!referenceForm.title.trim()) {
      toast({ title: 'Informe o título da referência', variant: 'destructive' });
      return;
    }

    const rawReferenceUrl = referenceForm.url.trim();
    const safeReferenceUrl = rawReferenceUrl ? normalizeHttpUrl(rawReferenceUrl) : '';
    if (rawReferenceUrl && !safeReferenceUrl) {
      toast({
        title: 'Link da referência inválido',
        description: 'Use um endereço iniciado por http:// ou https://.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const created = await base44.entities.BlockReference.create({
        block_id: blockId,
        reference_type: referenceForm.reference_type,
        title: referenceForm.title.trim(),
        reference_text: referenceForm.reference_text.trim(),
        source: referenceForm.source.trim(),
        url: safeReferenceUrl,
      });
      setReferences((prev) => [created, ...prev]);
      setReferenceForm(EMPTY_REFERENCE);
      setShowReferenceForm(false);
      toast({ title: 'Referência adicionada' });
    } catch (error) {
      toast({ title: 'Não foi possível adicionar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAttachment = async (attachment) => {
    try {
      await base44.entities.BlockAttachment.delete(attachment.id);
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
      toast({ title: 'Anexo removido' });
    } catch (error) {
      toast({ title: 'Não foi possível remover', variant: 'destructive' });
    }
  };

  const handleDeleteReference = async (reference) => {
    try {
      await base44.entities.BlockReference.delete(reference.id);
      setReferences((prev) => prev.filter((r) => r.id !== reference.id));
      toast({ title: 'Referência removida' });
    } catch (error) {
      toast({ title: 'Não foi possível remover', variant: 'destructive' });
    }
  };

  const totalCount = attachments.length + references.length;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          <Paperclip className="h-4 w-4 shrink-0" />
          <span className="font-medium">Anexos e referências</span>
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-[10px]">{totalCount}</Badge>
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 space-y-4 rounded-lg border border-border/60 bg-muted/20 p-3">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && (
            <>
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Anexos
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => setShowAttachmentForm((v) => !v)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Adicionar
                  </Button>
                </div>

                {showAttachmentForm && (
                  <div className="mb-3 space-y-2 rounded-lg border bg-background p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select
                          value={attachmentForm.attachment_type}
                          onValueChange={(v) => setAttachmentForm((f) => ({ ...f, attachment_type: v }))}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ATTACHMENT_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">URL</Label>
                        <Input
                          className="h-8 text-xs"
                          value={attachmentForm.file_url}
                          onChange={(e) => setAttachmentForm((f) => ({ ...f, file_url: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Título</Label>
                      <Input
                        className="h-8 text-xs"
                        value={attachmentForm.title}
                        onChange={(e) => setAttachmentForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Título do anexo"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        className="h-8 text-xs"
                        value={attachmentForm.description}
                        onChange={(e) => setAttachmentForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Descrição opcional"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs" onClick={handleSaveAttachment} disabled={saving}>
                        Salvar anexo
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAttachmentForm(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {attachments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum anexo cadastrado.</p>
                ) : (
                  <div className="space-y-1.5">
                    {attachments.map((att) => {
                      const Icon = getAttachmentIcon(att.attachment_type);
                      return (
                        <div key={att.id} className="flex items-center gap-2 rounded-lg border bg-background p-2">
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">
                              {att.title || att.file_url}
                            </p>
                            {att.description && (
                              <p className="truncate text-[10px] text-muted-foreground">{att.description}</p>
                            )}
                          </div>
                          {att.file_url && (
                            <a
                              href={att.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteAttachment(att)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Referências
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => setShowReferenceForm((v) => !v)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Adicionar
                  </Button>
                </div>

                {showReferenceForm && (
                  <div className="mb-3 space-y-2 rounded-lg border bg-background p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select
                          value={referenceForm.reference_type}
                          onValueChange={(v) => setReferenceForm((f) => ({ ...f, reference_type: v }))}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {REFERENCE_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Título *</Label>
                        <Input
                          className="h-8 text-xs"
                          value={referenceForm.title}
                          onChange={(e) => setReferenceForm((f) => ({ ...f, title: e.target.value }))}
                          placeholder="Título da referência"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Texto</Label>
                      <Textarea
                        rows={2}
                        className="text-xs"
                        value={referenceForm.reference_text}
                        onChange={(e) => setReferenceForm((f) => ({ ...f, reference_text: e.target.value }))}
                        placeholder="Texto ou citação da referência"
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Fonte</Label>
                        <Input
                          className="h-8 text-xs"
                          value={referenceForm.source}
                          onChange={(e) => setReferenceForm((f) => ({ ...f, source: e.target.value }))}
                          placeholder="Livro, autor, site..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">URL</Label>
                        <Input
                          className="h-8 text-xs"
                          value={referenceForm.url}
                          onChange={(e) => setReferenceForm((f) => ({ ...f, url: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs" onClick={handleSaveReference} disabled={saving}>
                        Salvar referência
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowReferenceForm(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {references.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma referência cadastrada.</p>
                ) : (
                  <div className="space-y-1.5">
                    {references.map((ref) => (
                      <div key={ref.id} className="flex items-start gap-2 rounded-lg border bg-background p-2">
                        <Quote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <p className="truncate text-xs font-medium">{ref.title}</p>
                            {ref.reference_type && (
                              <Badge variant="outline" className="text-[9px]">{ref.reference_type}</Badge>
                            )}
                          </div>
                          {ref.reference_text && (
                            <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">{ref.reference_text}</p>
                          )}
                          {ref.source && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground">Fonte: {ref.source}</p>
                          )}
                        </div>
                        {ref.url && (
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteReference(ref)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}