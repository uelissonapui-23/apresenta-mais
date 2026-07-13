import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Wand2, LayoutTemplate, Copy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';

export default function NewPresentation() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const initialMode = urlParams.get('mode') || null;

  const [step, setStep] = useState(initialMode === 'guided' ? 'type-select' : 'choose');
  const [types, setTypes] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [styles, setStyles] = useState([]);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '', presentation_type_id: '', objective_id: '', communication_style_id: '',
    main_theme: '', audience: '', estimated_duration_minutes: 30, theme_id: '',
  });

  useEffect(() => {
    const load = async () => {
      const [t, o, s, th] = await Promise.all([
        base44.entities.PresentationType.filter({ active: true }, 'order_index'),
        base44.entities.PresentationObjective.filter({ active: true }, 'order_index'),
        base44.entities.CommunicationStyle.filter({ active: true }, 'order_index'),
        base44.entities.PresentationTheme.filter({ active: true }),
      ]);
      setTypes(t); setObjectives(o); setStyles(s); setThemes(th);
      setLoading(false);
    };
    load();
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const p = await base44.entities.Presentation.create({
      user_id: user.id,
      ...form,
      status: 'draft',
    });
    setSaving(false);
    navigate(`/presentations/${p.id}/editor`);
  };

  const handleGuidedCreate = async () => {
    if (!form.title.trim() || !form.presentation_type_id) return;
    setSaving(true);
    const p = await base44.entities.Presentation.create({
      user_id: user.id,
      ...form,
      status: 'draft',
    });
    setSaving(false);
    navigate(`/guided/${p.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (step === 'choose') {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Nova Apresentação</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: FileText, label: 'Criar do zero', desc: 'Comece com uma apresentação em branco', action: () => setStep('form-blank') },
            { icon: Wand2, label: 'Criar com ajuda', desc: 'Perguntas guiadas para montar sua estrutura', action: () => setStep('type-select') },
            { icon: LayoutTemplate, label: 'Usar modelo', desc: 'Escolha um modelo pronto como base', action: () => navigate('/templates') },
            { icon: Copy, label: 'Duplicar existente', desc: 'Copie uma apresentação já criada', action: () => navigate('/presentations') },
          ].map((opt, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer" onClick={opt.action}>
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <opt.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold">{opt.label}</h3>
                <p className="text-sm text-muted-foreground">{opt.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'type-select') {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => setStep('choose')}>← Voltar</Button>
          <h1 className="text-2xl font-bold mt-2">Que tipo de apresentação?</h1>
          <p className="text-muted-foreground text-sm">Escolha o tipo para personalizar a experiência.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {types.map(t => (
            <Card key={t.id}
              className={`cursor-pointer transition-all ${form.presentation_type_id === t.id ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-md'}`}
              onClick={() => setForm(prev => ({ ...prev, presentation_type_id: t.id }))}>
              <CardContent className="p-3 text-center">
                <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: t.color + '20' }}>
                  <span className="text-lg" style={{ color: t.color }}>•</span>
                </div>
                <span className="text-sm font-medium">{t.name}</span>
              </CardContent>
            </Card>
          ))}
        </div>
        {form.presentation_type_id && (
          <Button className="w-full" onClick={() => setStep('form-guided')}>Continuar</Button>
        )}
      </div>
    );
  }

  const isGuided = step === 'form-guided';

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => setStep(isGuided ? 'type-select' : 'choose')}>← Voltar</Button>
        <h1 className="text-2xl font-bold mt-2">{isGuided ? 'Detalhes da apresentação' : 'Criar do zero'}</h1>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Título *</Label>
          <Input placeholder="Ex: A importância da fé" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} />
        </div>

        {!isGuided && (
          <div>
            <Label>Tipo</Label>
            <Select value={form.presentation_type_id} onValueChange={v => setForm(prev => ({ ...prev, presentation_type_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>
                {types.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label>Objetivo</Label>
          <Select value={form.objective_id} onValueChange={v => setForm(prev => ({ ...prev, objective_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione o objetivo" /></SelectTrigger>
            <SelectContent>
              {objectives.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Estilo de comunicação</Label>
          <Select value={form.communication_style_id} onValueChange={v => setForm(prev => ({ ...prev, communication_style_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione o estilo" /></SelectTrigger>
            <SelectContent>
              {styles.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Tema principal</Label>
          <Input placeholder="Ex: Graça, Liderança, Vendas..." value={form.main_theme} onChange={e => setForm(prev => ({ ...prev, main_theme: e.target.value }))} />
        </div>

        <div>
          <Label>Público-alvo</Label>
          <Input placeholder="Ex: Jovens, Executivos, Alunos..." value={form.audience} onChange={e => setForm(prev => ({ ...prev, audience: e.target.value }))} />
        </div>

        <div>
          <Label>Duração estimada (minutos)</Label>
          <Input type="number" value={form.estimated_duration_minutes} onChange={e => setForm(prev => ({ ...prev, estimated_duration_minutes: parseInt(e.target.value) || 30 }))} />
        </div>

        <div>
          <Label>Tema visual</Label>
          <Select value={form.theme_id} onValueChange={v => setForm(prev => ({ ...prev, theme_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione um tema" /></SelectTrigger>
            <SelectContent>
              {themes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Button className="w-full" disabled={!form.title.trim() || saving} onClick={isGuided ? handleGuidedCreate : handleCreate}>
          {saving ? 'Criando...' : isGuided ? 'Continuar para criação guiada' : 'Criar apresentação'}
        </Button>
      </div>
    </div>
  );
}