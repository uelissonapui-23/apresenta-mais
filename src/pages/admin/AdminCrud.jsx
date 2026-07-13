import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';

export default function AdminCrud({ entityName, title, fields, displayField = 'name' }) {
  const { isAdmin } = useCurrentUser();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({});

  const entity = base44.entities[entityName];

  useEffect(() => {
    entity.list('-created_date', 50).then(setItems).finally(() => setLoading(false));
  }, []);

  if (!isAdmin) return <div className="p-8 text-center"><h1 className="text-xl font-bold">Acesso restrito</h1></div>;

  const openNew = () => {
    const defaults = {};
    fields.forEach(f => { defaults[f.key] = f.default !== undefined ? f.default : ''; });
    setForm(defaults);
    setEditItem(null);
    setShowForm(true);
  };

  const openEdit = (item) => {
    const formData = {};
    fields.forEach(f => { formData[f.key] = item[f.key] !== undefined ? item[f.key] : ''; });
    setForm(formData);
    setEditItem(item);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (editItem) {
      await entity.update(editItem.id, form);
      setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, ...form } : i));
      toast({ title: 'Atualizado' });
    } else {
      const newItem = await entity.create(form);
      setItems(prev => [newItem, ...prev]);
      toast({ title: 'Criado' });
    }
    setShowForm(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await entity.delete(deleteTarget.id);
    setItems(prev => prev.filter(i => i.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast({ title: 'Excluído' });
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/admin"><Button variant="ghost" size="icon"><ChevronLeft className="w-5 h-5" /></Button></Link>
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" />Novo</Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title={`Nenhum ${title.toLowerCase()}`} actionLabel="Criar" onAction={openNew} />
      ) : (
        <div className="grid gap-2">
          {items.map(item => (
            <Card key={item.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item[displayField] || item.name || item.title || item.id}</p>
                  {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(item)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? 'Editar' : 'Novo'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {fields.map(f => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                {f.type === 'boolean' ? (
                  <div className="mt-1"><Switch checked={!!form[f.key]} onCheckedChange={v => setForm(prev => ({ ...prev, [f.key]: v }))} /></div>
                ) : f.type === 'textarea' ? (
                  <Textarea rows={3} value={form[f.key] || ''} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                ) : f.type === 'number' ? (
                  <Input type="number" value={form[f.key] || ''} onChange={e => setForm(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))} />
                ) : (
                  <Input value={form[f.key] || ''} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>
          <DialogFooter><Button onClick={handleSave}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)} title="Excluir" description="Tem certeza?" confirmLabel="Excluir" onConfirm={handleDelete} variant="destructive" />
    </div>
  );
}