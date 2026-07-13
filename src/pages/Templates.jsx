import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutTemplate, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/shared/EmptyState';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';

export default function Templates() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [types, setTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [t, tp] = await Promise.all([
        base44.entities.PresentationTemplate.filter({ active: true }, 'name'),
        base44.entities.PresentationType.filter({ active: true }, 'order_index'),
      ]);
      setTemplates(t);
      setTypes(tp);
      setLoading(false);
    };
    load();
  }, []);

  const typeMap = Object.fromEntries(types.map(t => [t.id, t.name]));

  const handleUseTemplate = async (template) => {
    const p = await base44.entities.Presentation.create({
      user_id: user.id,
      title: `${template.name} - Nova`,
      presentation_type_id: template.presentation_type_id,
      objective_id: template.objective_id,
      communication_style_id: template.communication_style_id,
      status: 'draft',
    });
    const templateBlocks = await base44.entities.TemplateBlock.filter({ template_id: template.id }, 'order_index');
    if (templateBlocks.length > 0) {
      const newBlocks = templateBlocks.map(tb => ({
        presentation_id: p.id,
        block_type_id: tb.block_type_id,
        title: tb.title,
        summary: tb.summary,
        content: tb.content,
        presenter_notes: tb.presenter_notes,
        order_index: tb.order_index,
        depth_level: tb.depth_level,
        importance_level: tb.importance_level,
        estimated_duration_seconds: tb.estimated_duration_seconds,
        is_essential: tb.is_essential,
      }));
      await base44.entities.PresentationBlock.bulkCreate(newBlocks);
    }
    toast({ title: 'Apresentação criada a partir do modelo' });
    navigate(`/presentations/${p.id}/editor`);
  };

  const filtered = templates.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Modelos</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar modelos..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={LayoutTemplate} title="Nenhum modelo encontrado" description="Modelos aparecerão aqui quando forem criados." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(t => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{t.name}</h3>
                    {typeMap[t.presentation_type_id] && <Badge variant="secondary" className="mt-1 text-xs">{typeMap[t.presentation_type_id]}</Badge>}
                  </div>
                  <div className="flex gap-1">
                    {t.is_official && <Badge className="text-[10px] bg-blue-100 text-blue-700">Oficial</Badge>}
                    {t.is_premium && <Badge className="text-[10px] bg-yellow-100 text-yellow-700">Premium</Badge>}
                  </div>
                </div>
                {t.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{t.description}</p>}
                <Button size="sm" className="w-full" onClick={() => handleUseTemplate(t)}>Usar este modelo</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}