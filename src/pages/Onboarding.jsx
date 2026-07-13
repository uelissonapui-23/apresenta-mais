import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';

export default function Onboarding() {
  const { user, profile } = useCurrentUser();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    setSaving(true);
    if (profile) {
      await base44.entities.UserProfile.update(profile.id, { name, phone, onboarding_completed: true });
    } else {
      await base44.entities.UserProfile.create({ user_id: user.id, name, phone, onboarding_completed: true, role: 'user' });
    }
    await base44.entities.UserPreference.create({ user_id: user.id });
    setSaving(false);
    navigate('/');
  };

  const steps = [
    {
      title: 'Bem-vindo ao Apresenta+',
      desc: 'Seu assistente completo para criar, organizar, ensaiar e realizar apresentações.',
      content: (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-4xl">🎤</span>
          </div>
          <p className="text-center text-muted-foreground max-w-sm">
            Escreva uma vez e visualize de diferentes formas. Ensaie com cronômetro e progresso. Apresente sem se perder.
          </p>
        </div>
      ),
    },
    {
      title: 'Como devemos te chamar?',
      desc: 'Precisamos de algumas informações básicas.',
      content: (
        <div className="space-y-4 py-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div>
            <Label>Telefone (opcional)</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
        </div>
      ),
    },
    {
      title: 'Tudo pronto!',
      desc: 'Você já pode começar a criar suas apresentações.',
      content: (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-4xl">✅</span>
          </div>
          <p className="text-center text-muted-foreground max-w-sm">
            Explore os modelos prontos ou crie do zero com ajuda guiada.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex gap-1 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <h1 className="text-2xl font-bold">{steps[step].title}</h1>
        <p className="text-muted-foreground">{steps[step].desc}</p>
        {steps[step].content}

        <div className="flex gap-3">
          {step > 0 && <Button variant="outline" className="flex-1" onClick={() => setStep(s => s - 1)}>Voltar</Button>}
          {step < steps.length - 1 ? (
            <Button className="flex-1" onClick={() => setStep(s => s + 1)}>Continuar</Button>
          ) : (
            <Button className="flex-1" onClick={handleFinish} disabled={saving}>
              {saving ? 'Salvando...' : 'Começar'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}