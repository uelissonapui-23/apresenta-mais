import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';

export default function Profile() {
  const { user, profile } = useCurrentUser();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setForm({ name: profile.name || '', phone: profile.phone || '' });
    else if (user) setForm({ name: user.full_name || '', phone: '' });
  }, [profile, user]);

  const handleSave = async () => {
    setSaving(true);
    if (profile) {
      await base44.entities.UserProfile.update(profile.id, form);
    } else {
      await base44.entities.UserProfile.create({ user_id: user.id, ...form, role: 'user', onboarding_completed: true });
    }
    setSaving(false);
    toast({ title: 'Perfil atualizado' });
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Perfil</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Informações pessoais</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Email</Label><Input value={user?.email || ''} disabled /></div>
          <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <Button variant="destructive" className="w-full" onClick={() => base44.auth.logout('/')}>Sair da conta</Button>
        </CardContent>
      </Card>
    </div>
  );
}