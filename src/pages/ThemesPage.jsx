import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

export default function ThemesPage() {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.PresentationTheme.filter({ active: true }).then(setThemes).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Temas Visuais</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map(t => (
          <Card key={t.id} className="overflow-hidden">
            <div className="h-32 p-4 flex flex-col justify-between" style={{ backgroundColor: t.background_color, color: t.text_color }}>
              <h3 className="font-bold text-lg" style={{ color: t.title_color }}>{t.name}</h3>
              <p className="text-sm opacity-80">{t.description}</p>
            </div>
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-1">
                <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: t.background_color }} title="Fundo" />
                <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: t.text_color }} title="Texto" />
                <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: t.title_color }} title="Título" />
                <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: t.accent_color }} title="Destaque" />
                {t.is_premium && <Badge className="ml-auto text-[10px]">Premium</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}