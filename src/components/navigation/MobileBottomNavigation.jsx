import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Presentation, Plus, LayoutTemplate, BookOpen, Settings, MoreHorizontal, Shield } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const mainItems = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/presentations', icon: Presentation, label: 'Apresentações' },
  { path: '/new-presentation', icon: Plus, label: 'Criar' },
  { path: '/templates', icon: LayoutTemplate, label: 'Modelos' },
  { path: '/more', icon: MoreHorizontal, label: 'Mais' },
];

const moreItems = [
  { path: '/library', icon: BookOpen, label: 'Biblioteca' },
  { path: '/settings', icon: Settings, label: 'Configurações' },
];

export default function MobileBottomNavigation({ isAdmin }) {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-14">
          {mainItems.map(item => {
            if (item.path === '/more') {
              return (
                <Sheet key="more" open={moreOpen} onOpenChange={setMoreOpen}>
                  <SheetTrigger asChild>
                    <button className="flex flex-col items-center justify-center gap-0.5 w-16 py-1 text-muted-foreground">
                      <item.icon className="w-5 h-5" />
                      <span className="text-[10px]">{item.label}</span>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-2xl">
                    <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
                    <div className="grid gap-2 py-4">
                      {moreItems.map(mi => (
                        <Link key={mi.path} to={mi.path} onClick={() => setMoreOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors">
                          <mi.icon className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium">{mi.label}</span>
                        </Link>
                      ))}
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setMoreOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors">
                          <Shield className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium">Administração</span>
                        </Link>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              );
            }
            const active = isActive(item.path);
            return (
              <Link key={item.path} to={item.path}
                className={`flex flex-col items-center justify-center gap-0.5 w-16 py-1 transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                <item.icon className={`w-5 h-5 ${active ? 'text-primary' : ''}`} />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="h-14 md:hidden" />
    </>
  );
}