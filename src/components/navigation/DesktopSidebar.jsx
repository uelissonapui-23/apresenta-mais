import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Presentation, Plus, LayoutTemplate, BookOpen, Settings, Shield, PanelLeftClose, PanelLeft, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const navItems = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/presentations', icon: Presentation, label: 'Apresentações' },
  { path: '/new-presentation', icon: Plus, label: 'Criar' },
  { path: '/templates', icon: LayoutTemplate, label: 'Modelos' },
  { path: '/library', icon: BookOpen, label: 'Biblioteca' },
  { path: '/settings', icon: Settings, label: 'Configurações' },
];

export default function DesktopSidebar({ isAdmin, userName }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <aside className={`hidden md:flex flex-col h-screen fixed left-0 top-0 z-40 bg-sidebar border-r border-sidebar-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
      <div className={`flex items-center h-14 px-4 border-b border-sidebar-border ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <span className="font-bold text-lg text-sidebar-foreground">Apresenta+</span>}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </Button>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const active = isActive(item.path);
          return (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'} ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}>
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          );
        })}
        {isAdmin && (
          <Link to="/admin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${location.pathname.startsWith('/admin') ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'} ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Administração' : undefined}>
            <Shield className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm">Administração</span>}
          </Link>
        )}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <Link to="/profile" className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors ${collapsed ? 'justify-center' : ''}`}>
          <User className="w-5 h-5 text-sidebar-foreground shrink-0" />
          {!collapsed && <span className="text-sm text-sidebar-foreground truncate">{userName || 'Perfil'}</span>}
        </Link>
        <Button variant="ghost" size={collapsed ? "icon" : "default"} className={`w-full mt-1 text-sidebar-foreground hover:text-destructive ${collapsed ? '' : 'justify-start gap-3'}`}
          onClick={() => base44.auth.logout('/')}>
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </Button>
      </div>
    </aside>
  );
}