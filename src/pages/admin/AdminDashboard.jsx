import React from 'react';
import { Link } from 'react-router-dom';
import { Users, LayoutTemplate, FileText, Target, MessageSquare, Layers, Wand2, HelpCircle, Palette, CreditCard, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import useCurrentUser from '@/hooks/useCurrentUser';

const adminLinks = [
  { path: '/admin/users', icon: Users, label: 'Usuários', desc: 'Gerenciar usuários e perfis' },
  { path: '/admin/plans', icon: CreditCard, label: 'Planos', desc: 'Gerenciar planos de assinatura' },
  { path: '/admin/types', icon: FileText, label: 'Tipos', desc: 'Tipos de apresentação' },
  { path: '/admin/objectives', icon: Target, label: 'Objetivos', desc: 'Objetivos de apresentação' },
  { path: '/admin/styles', icon: MessageSquare, label: 'Estilos', desc: 'Estilos de comunicação' },
  { path: '/admin/block-types', icon: Layers, label: 'Tipos de bloco', desc: 'Gerenciar tipos de bloco' },
  { path: '/admin/templates', icon: LayoutTemplate, label: 'Modelos', desc: 'Modelos de apresentação' },
  { path: '/admin/guided-flows', icon: Wand2, label: 'Fluxos guiados', desc: 'Fluxos de criação guiada' },
  { path: '/admin/guided-questions', icon: HelpCircle, label: 'Perguntas', desc: 'Perguntas dos fluxos guiados' },
  { path: '/admin/themes', icon: Palette, label: 'Temas', desc: 'Temas visuais' },
  { path: '/admin/tips', icon: Lightbulb, label: 'Dicas', desc: 'Dicas do aplicativo' },
];

export default function AdminDashboard() {
  const { isAdmin } = useCurrentUser();

  if (!isAdmin) {
    return <div className="p-8 text-center"><h1 className="text-xl font-bold">Acesso restrito</h1><p className="text-muted-foreground">Você não tem permissão para acessar esta área.</p></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Administração</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {adminLinks.map(link => (
          <Link key={link.path} to={link.path}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <link.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{link.label}</h3>
                  <p className="text-xs text-muted-foreground">{link.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}