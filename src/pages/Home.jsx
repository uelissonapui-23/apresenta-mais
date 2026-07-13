import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Wand2, Clock, Star, Play, LayoutTemplate, Presentation as PresentationIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import PresentationCard from '@/components/shared/PresentationCard';
import EmptyState from '@/components/shared/EmptyState';
import useCurrentUser from '@/hooks/useCurrentUser';

export default function Home() {
  const { user, profile, loading: userLoading } = useCurrentUser();
  const [presentations, setPresentations] = useState([]);
  const [types, setTypes] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [pres, t, o, sess, tmpl] = await Promise.all([
          base44.entities.Presentation.filter({ user_id: user.id, is_archived: false }, '-updated_date', 10),
          base44.entities.PresentationType.filter({ active: true }, 'order_index'),
          base44.entities.PresentationObjective.filter({ active: true }, 'order_index'),
          base44.entities.PresentationSession.filter({ user_id: user.id }, '-created_date', 5),
          base44.entities.PresentationTemplate.filter({ is_official: true, active: true }, 'name', 6),
        ]);
        setPresentations(pres);
        setTypes(t);
        setObjectives(o);
        setSessions(sess);
        setTemplates(tmpl);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [user]);

  const typeMap = Object.fromEntries(types.map(t => [t.id, t.name]));
  const objMap = Object.fromEntries(objectives.map(o => [o.id, o.name]));
  const favorites = presentations.filter(p => p.is_favorite);
  const recent = presentations.slice(0, 5);

  const handleFavorite = async (p) => {
    await base44.entities.Presentation.update(p.id, { is_favorite: !p.is_favorite });
    setPresentations(prev => prev.map(x => x.id === p.id ? { ...x, is_favorite: !x.is_favorite } : x));
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (profile && !profile.onboarding_completed) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="text-center py-16">
          <h1 className="text-3xl font-bold mb-2">Bem-vindo ao Apresenta+</h1>
          <p className="text-muted-foreground mb-8">Seu assistente completo para criar, ensaiar e apresentar.</p>
          <Link to="/onboarding">
            <Button size="lg">Começar agora</Button>
          </Link>
        </div>
      </div>
    );
  }

  const hasContent = presentations.length > 0;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Olá, {user?.full_name || 'Usuário'}</h1>
        <p className="text-muted-foreground text-sm">O que vamos preparar hoje?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/new-presentation">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium text-sm">Criar apresentação</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/new-presentation?mode=guided">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
                <Wand2 className="w-6 h-6 text-violet-600" />
              </div>
              <span className="font-medium text-sm">Criar com ajuda</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {!hasContent ? (
        <EmptyState
          icon={PresentationIcon}
          title="Nenhuma apresentação ainda"
          description="Crie sua primeira apresentação do zero ou use um modelo pronto."
          actionLabel="Criar apresentação"
          onAction={() => window.location.href = '/new-presentation'}
        />
      ) : (
        <>
          {recent.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-lg">Recentes</h2>
                <Link to="/presentations" className="text-sm text-primary hover:underline">Ver todas</Link>
              </div>
              <div className="grid gap-3">
                {recent.map(p => (
                  <PresentationCard
                    key={p.id}
                    presentation={p}
                    typeName={typeMap[p.presentation_type_id]}
                    objectiveName={objMap[p.objective_id]}
                    onFavorite={handleFavorite}
                  />
                ))}
              </div>
            </section>
          )}

          {favorites.length > 0 && (
            <section>
              <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" /> Favoritas
              </h2>
              <div className="grid gap-3">
                {favorites.map(p => (
                  <PresentationCard
                    key={p.id}
                    presentation={p}
                    typeName={typeMap[p.presentation_type_id]}
                    onFavorite={handleFavorite}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {templates.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Modelos recomendados</h2>
            <Link to="/templates" className="text-sm text-primary hover:underline">Ver todos</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {templates.map(t => (
              <Link key={t.id} to={`/templates/${t.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      <LayoutTemplate className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-medium text-sm truncate">{t.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="pb-4">
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{presentations.length}</span> apresentações criadas
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}