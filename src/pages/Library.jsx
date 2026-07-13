import React, { useState, useEffect } from 'react';
import { Plus, Search, Star, Pencil, Trash2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';

const typeLabels = { citation: 'Citação', story: 'História', example: 'Exemplo', reference: 'Referência', application: 'Aplicação', question: 'Pergunta', block: 'Bloco' };

export default function Library() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ title: '', item_type: 'citation', summary: '', content: '', source: '' });

  useEffect(() => {
    if (!user) return;
    base44.entities.LibraryItem.filter({ user_id: user.id }, '-updated_date').then(setItems).finally(() => setLoading(false));
  }, [user]);

  const openNew = () => { setForm({ title: '', item_type: 'citation', summary: '', content: '', source: '' }); setEditItem(null); setShowForm(true); };
  const openEdit = (item) => { setForm(item); setEditItem(item); setShowForm(true); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (editItem) {
      await base44.entities.LibraryItem.update(editItem.id, form);
      setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, ...form } : i));
    } else {
      const newItem = await base44.entities.LibraryItem.create({ ...form, user_id: user.id });
      setItems(prev => [newItem, ...prev]);
    }
    setShowForm(false);
    toast({ title: editItem ? 'Item atualizado' : 'Item adicionado' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.LibraryItem.delete(deleteTarget.id);
    setItems(prev => prev.filter(i => i.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast({ title: 'Item excluído' });
  };

  const handleFavorite = async (item) => {
    await base44.entities.LibraryItem.update(item.id, { is_favorite: !item.is_favorite });
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_favorite: !i.is_favorite } : i));
  };

  const filtered = items.filter(i => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && i.item_type !== typeFilter) return false;
    return true;
  });

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Biblioteca</h1>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" />Novo</Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="Biblioteca vazia" description="Salve citações, histórias, exemplos e referências para usar em suas apresentações." actionLabel="Adicionar item" onAction={openNew} />
      ) : (
        <div className="grid gap-3">
          {filtered.map(item => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                      <Badge variant="outline" className="text-[10px] shrink-0">{typeLabels[item.item_type]}</Badge>
                    </div>
                    {item.summary && <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>}
                    {item.source && <p className="text-xs text-muted-foreground mt-1">Fonte: {item.source}</p>}
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleFavorite(item)}>
                      <Star className={`w-4 h-4 ${item.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(item)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Editar item' : 'Novo item'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Tipo</Label>
              <Select value={form.item_type} onValueChange={v => setForm(f => ({ ...f, item_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Resumo</Label><Textarea rows={2} value={form.summary || ''} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} /></div>
            <div><Label>Conteúdo</Label><Textarea rows={4} value={form.content || ''} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} /></div>
            <div><Label>Fonte</Label><Input value={form.source || ''} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave} disabled={!form.title.trim()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)} title="Excluir item" description="Tem certeza que deseja excluir este item?" confirmLabel="Excluir" onConfirm={handleDelete} variant="destructive" />
    </div>
  );
}