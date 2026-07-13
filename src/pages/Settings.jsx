import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';

export default function Settings() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState(null);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [p, t] = await Promise.all([
        base44.entities.UserPreference.filter({ user_id: user.id }),
        base44.entities.PresentationTheme.filter({ active: true }),
      ]);
      setPrefs(p[0] || { user_id: user.id, default_view_mode: 'structure', default_detail_level: 'normal', default_font_size: 16, presentation_font_size: 24, use_dark_mode: false, show_timer: true, show_next_block: true, show_progress: true, auto_mark_completed: true, confirm_before_restart: true });
      setThemes(t);
      setLoading(false);
    };
    load();
  }, [user]);

  const update = (field, value) => setPrefs(p => ({ ...p, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    if (prefs.id) {
      await base44.entities.UserPreference.update(prefs.id, prefs);
    } else {
      const created = await base44.entities.UserPreference.create(prefs);
      setPrefs(created);
    }
    setSaving(false);
    toast({ title: 'Configurações salvas' });
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Visualização</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Tema visual padrão</Label>
            <Select value={prefs?.default_theme_id || ''} onValueChange={v => update('default_theme_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{themes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Visualização padrão</Label>
            <Select value={prefs?.default_view_mode || 'structure'} onValueChange={v => update('default_view_mode', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="structure">Estrutura</SelectItem>
                <SelectItem value="text">Texto</SelectItem>
                <SelectItem value="cards">Cartões</SelectItem>
                <SelectItem value="script">Roteiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Nível de detalhe padrão</Label>
            <Select value={prefs?.default_detail_level || 'normal'} onValueChange={v => update('default_detail_level', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compacto</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="detailed">Detalhado</SelectItem>
                <SelectItem value="complete">Completo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Tamanho da fonte (editor): {prefs?.default_font_size || 16}px</Label>
            <Slider value={[prefs?.default_font_size || 16]} onValueChange={([v]) => update('default_font_size', v)} min={12} max={24} step={1} />
          </div>
          <div><Label>Tamanho da fonte (apresentação): {prefs?.presentation_font_size || 24}px</Label>
            <Slider value={[prefs?.presentation_font_size || 24]} onValueChange={([v]) => update('presentation_font_size', v)} min={16} max={48} step={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Apresentação</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><Label>Tema escuro</Label><Switch checked={prefs?.use_dark_mode} onCheckedChange={v => update('use_dark_mode', v)} /></div>
          <div className="flex items-center justify-between"><Label>Mostrar cronômetro</Label><Switch checked={prefs?.show_timer} onCheckedChange={v => update('show_timer', v)} /></div>
          <div className="flex items-center justify-between"><Label>Mostrar próximo bloco</Label><Switch checked={prefs?.show_next_block} onCheckedChange={v => update('show_next_block', v)} /></div>
          <div className="flex items-center justify-between"><Label>Mostrar progresso</Label><Switch checked={prefs?.show_progress} onCheckedChange={v => update('show_progress', v)} /></div>
          <div className="flex items-center justify-between"><Label>Marcar automaticamente como concluído</Label><Switch checked={prefs?.auto_mark_completed} onCheckedChange={v => update('auto_mark_completed', v)} /></div>
          <div className="flex items-center justify-between"><Label>Confirmar antes de recomeçar</Label><Switch checked={prefs?.confirm_before_restart} onCheckedChange={v => update('confirm_before_restart', v)} /></div>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar configurações'}</Button>
    </div>
  );
}