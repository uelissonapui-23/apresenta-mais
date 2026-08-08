import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Paperclip,
  Quote,
  Video,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import { normalizeHttpUrl } from '@/lib/safeUrl';
import { Badge } from '@/components/ui/badge';

function getAttachmentIcon(type) {
  switch (type) {
    case 'image': return ImageIcon;
    case 'video': return Video;
    case 'document': return FileText;
    default: return LinkIcon;
  }
}

export default function BlockAttachmentsDisplay({ blockId, darkMode = false }) {
  const [open, setOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [references, setReferences] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const loadData = useCallback(async () => {
    if (!blockId) return;
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
      setLoaded(true);
    }
  }, [blockId]);

  useEffect(() => {
    if (open && !loaded) {
      loadData();
    }
  }, [open, loaded, loadData]);

  const totalCount = attachments.length + references.length;

  if (totalCount === 0 && loaded) return null;

  const containerClass = darkMode
    ? 'border-white/10 bg-white/5 text-white'
    : 'border-border/70 bg-muted/30 text-foreground';

  const mutedClass = darkMode ? 'text-white/60' : 'text-muted-foreground';

  return (
    <div className={`mt-4 rounded-xl border ${containerClass}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <Paperclip className="h-4 w-4 shrink-0" />
        <span>Anexos e referências</span>
        {totalCount > 0 && (
          <Badge variant="secondary" className="text-[10px]">{totalCount}</Badge>
        )}
      </button>

      {open && (
        <div className="space-y-4 px-3 pb-3">
          {!loaded && (
            <p className={`text-xs ${mutedClass}`}>Carregando...</p>
          )}

          {loaded && attachments.length > 0 && (
            <div>
              <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${mutedClass}`}>
                Anexos
              </p>
              <div className="space-y-2">
                {attachments.map((att) => {
                  const Icon = getAttachmentIcon(att.attachment_type);
                  const safeFileUrl = normalizeHttpUrl(att.file_url);
                  const isImage = att.attachment_type === 'image' && safeFileUrl;
                  const isVideo = att.attachment_type === 'video' && safeFileUrl;

                  return (
                    <div key={att.id} className="overflow-hidden rounded-lg border border-current/10">
                      {isImage && (
                        <a
                          href={safeFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={safeFileUrl}
                            alt={att.title || 'Imagem'}
                            className="max-h-60 w-full object-contain"
                            loading="lazy"
                          />
                        </a>
                      )}
                      <div className="flex items-center gap-2 p-2">
                        {!isImage && <Icon className={`h-4 w-4 shrink-0 ${mutedClass}`} />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">
                            {att.title || att.file_url}
                          </p>
                          {att.description && (
                            <p className={`truncate text-[10px] ${mutedClass}`}>{att.description}</p>
                          )}
                        </div>
                        {safeFileUrl && (
                          <a
                            href={safeFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`shrink-0 ${mutedClass} hover:text-current`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      {isVideo && (
                        <div className="px-2 pb-2">
                          <a
                            href={safeFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-current/10 px-3 py-1.5 text-xs font-medium hover:bg-current/5"
                          >
                            <Video className="h-3.5 w-3.5" />
                            Abrir vídeo
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {loaded && references.length > 0 && (
            <div>
              <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${mutedClass}`}>
                Referências
              </p>
              <div className="space-y-2">
                {references.map((ref) => {
                  const safeReferenceUrl = normalizeHttpUrl(ref.url);
                  return (
                  <div
                    key={ref.id}
                    className="flex items-start gap-2 rounded-lg border border-current/10 p-2"
                  >
                    <Quote className={`mt-0.5 h-4 w-4 shrink-0 ${mutedClass}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-xs font-medium">{ref.title}</p>
                        {ref.reference_type && (
                          <Badge variant="outline" className="text-[9px]">{ref.reference_type}</Badge>
                        )}
                      </div>
                      {ref.reference_text && (
                        <p className={`mt-1 whitespace-pre-wrap text-[10px] leading-relaxed ${mutedClass}`}>
                          {ref.reference_text}
                        </p>
                      )}
                      {ref.source && (
                        <p className={`mt-1 text-[10px] ${mutedClass}`}>Fonte: {ref.source}</p>
                      )}
                    </div>
                    {safeReferenceUrl && (
                      <a
                        href={safeReferenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`shrink-0 ${mutedClass} hover:text-current`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {loaded && totalCount === 0 && (
            <p className={`text-xs ${mutedClass}`}>
              Este bloco não possui anexos ou referências.
            </p>
          )}
        </div>
      )}
    </div>
  );
}