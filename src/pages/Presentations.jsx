import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import PresentationCard from '@/components/shared/PresentationCard';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';

export default function Presentations() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [presentations, setPresentations] = useState([]);
  const [types, setTypes] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [p, t, o] = await Promise.all([
          base44.entities.Presentation.filter({ user_id: user.id }, '-updated_date', 50),
          base44.entities.PresentationType.filter({ active: true }, 'order_index'),
          base44.entities.PresentationObjective.filter({ active: true }, 'order_index'),
        ]);
        setPresentations(p);
        setTypes(t);
        setObjectives(o);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [user]);

  const typeMap = Object.fromEntries(types.map(t => [t.id, t.name]));
  const objMap = Object.fromEntries(objectives.map(o => [o.id, o.name]));

  const filtered = presentations.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === 'favorites') return p.is_favorite;
    if (statusFilter === 'archived') return p.is_archived;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (statusFilter !== 'archived' && p.is_archived) return false;
    if (typeFilter !== 'all' && p.presentation_type_id !== typeFilter) return false;
    return true;
  });

  const handleFavorite = async (p) => {
    await base44.entities.Presentation.update(p.id, { is_favorite: !p.is_favorite });
    setPresentations(prev => prev.map(x => x.id === p.id ? { ...x, is_favorite: !x.is_favorite } : x));
  };

  const handleArchive = async (p) => {
    await base44.entities.Presentation.update(p.id, { is_archived: !p.is_archived, status: 'archived' });
    setPresentations(prev => prev.map(x => x.id === p.id ? { ...x, is_archived: true, status: 'archived' } : x));
    toast({ title: 'Apresentação arquivada' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.Presentation.delete(deleteTarget.id);
    setPresentations(prev => prev.filter(x => x.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast({ title: 'Apresentação excluída' });
  };

  const handleDuplicate = async (p) => {
    const newP = await base44.entities.Presentation.create({
      ...p,
      id: undefined,
      created_date: undefined,
      updated_date: undefined,
      created_by_id: undefined,
      title: `${p.title} (cópia)`,
      status: 'draft',
      progress_percentage: 0,
      is_favorite: false,
      is_archived: false,
    });
    setPresentations(prev => [newP, ...prev]);
    toast({ title: 'Apresentação duplicada' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Minhas Apresentações</h1>
        <Link to="/new-presentation"><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nova</Button></Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="draft">Rascunhos</SelectItem>
            <SelectItem value="ready">Prontas</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
            <SelectItem value="completed">Concluídas</SelectItem>
            <SelectItem value="favorites">Favoritas</SelectItem>
            <SelectItem value="archived">Arquivadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {types.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhuma apresentação encontrada"
          description={presentations.length === 0 ? "Crie sua primeira apresentação para começar." : "Tente ajustar os filtros."}
          actionLabel={presentations.length === 0 ? "Criar apresentação" : undefined}
          onAction={presentations.length === 0 ? () => window.location.href = '/new-presentation' : undefined}
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map(p => (
            <PresentationCard
              key={p.id}
              presentation={p}
              typeName={typeMap[p.presentation_type_id]}
              objectiveName={objMap[p.objective_id]}
              onFavorite={handleFavorite}
              onArchive={handleArchive}
              onDelete={setDeleteTarget}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir apresentação"
        description={`Tem certeza que deseja excluir "${deleteTarget?.title}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}