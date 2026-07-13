import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, MoreVertical, Play, Pencil, Archive, Trash2, Copy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const statusLabels = {
  draft: 'Rascunho',
  ready: 'Pronta',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  archived: 'Arquivada',
};
const statusColors = {
  draft: 'bg-gray-100 text-gray-700',
  ready: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-gray-100 text-gray-500',
};

export default function PresentationCard({ presentation, typeName, objectiveName, onFavorite, onArchive, onDelete, onDuplicate }) {
  const p = presentation;
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <Link to={`/presentations/${p.id}/editor`} className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate hover:text-primary transition-colors">{p.title}</h3>
          </Link>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onFavorite?.(p)}>
              <Star className={`w-4 h-4 ${p.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link to={`/presentations/${p.id}/editor`}><Pencil className="w-4 h-4 mr-2" />Editar</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to={`/rehearsal/${p.id}`}><Play className="w-4 h-4 mr-2" />Ensaiar</Link></DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate?.(p)}><Copy className="w-4 h-4 mr-2" />Duplicar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onArchive?.(p)}><Archive className="w-4 h-4 mr-2" />Arquivar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete?.(p)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant="outline" className={statusColors[p.status]}>{statusLabels[p.status] || p.status}</Badge>
          {typeName && <Badge variant="secondary" className="text-xs">{typeName}</Badge>}
        </div>
        {objectiveName && <p className="text-xs text-muted-foreground mb-2">{objectiveName}</p>}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{p.estimated_duration_minutes || 0} min</span>
          </div>
          {p.progress_percentage > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p.progress_percentage}%` }} />
              </div>
              <span>{p.progress_percentage}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}