import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  Home,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Menu,
  MoreHorizontal,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Presentation,
  Settings,
  Shield,
  Sparkles,
  User,
  X,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const SIDEBAR_STORAGE_KEY = 'apresenta_sidebar_collapsed';

const MAIN_NAVIGATION = [
  {
    path: '/',
    label: 'Início',
    description: 'Visão geral e acessos rápidos',
    icon: Home,
    exact: true,
  },
  {
    path: '/presentations',
    label: 'Apresentações',
    description: 'Organize e acompanhe seus conteúdos',
    icon: Presentation,
  },
  {
    path: '/new-presentation',
    label: 'Criar',
    description: 'Comece uma nova apresentação',
    icon: Plus,
    highlighted: true,
  },
  {
    path: '/templates',
    label: 'Modelos',
    description: 'Estruturas prontas para começar',
    icon: LayoutTemplate,
  },
  {
    path: '/library',
    label: 'Biblioteca',
    description: 'Conteúdos reutilizáveis',
    icon: BookOpen,
  },
  {
    path: '/themes',
    label: 'Temas',
    description: 'Aparência das apresentações',
    icon: Sparkles,
  },
];

const ACCOUNT_NAVIGATION = [
  {
    path: '/profile',
    label: 'Perfil',
    description: 'Seus dados e seu plano',
    icon: User,
  },
  {
    path: '/settings',
    label: 'Configurações',
    description: 'Preferências e acessibilidade',
    icon: Settings,
  },
];

const MOBILE_PRIMARY = [
  MAIN_NAVIGATION[0],
  MAIN_NAVIGATION[1],
  MAIN_NAVIGATION[2],
  MAIN_NAVIGATION[3],
];

function getInitials(name) {
  const safeName = String(name || '').trim();

  if (!safeName) {
    return 'AP';
  }

  return safeName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function isRouteActive(locationPath, item) {
  if (item.exact) {
    return locationPath === item.path;
  }

  return (
    locationPath === item.path
    || locationPath.startsWith(`${item.path}/`)
  );
}

function getPageTitle(pathname) {
  const exactTitles = {
    '/': 'Início',
    '/presentations': 'Apresentações',
    '/new-presentation': 'Nova apresentação',
    '/templates': 'Modelos',
    '/library': 'Biblioteca',
    '/themes': 'Temas',
    '/settings': 'Configurações',
    '/profile': 'Perfil',
    '/admin': 'Administração',
  };

  if (exactTitles[pathname]) {
    return exactTitles[pathname];
  }

  if (pathname.includes('/editor')) {
    return 'Editor';
  }

  if (pathname.includes('/overview')) {
    return 'Visão geral';
  }

  if (pathname.startsWith('/guided/')) {
    return 'Criação guiada';
  }

  if (pathname.startsWith('/session-history/')) {
    return 'Histórico';
  }

  if (pathname.startsWith('/admin/')) {
    return 'Administração';
  }

  return 'Apresenta+';
}

function NavigationItem({
  item,
  collapsed,
  pathname,
  onNavigate,
}) {
  const active = isRouteActive(pathname, item);
  const Icon = item.icon;

  const link = (
    <Link
      to={item.path}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={[
        'group relative flex min-h-11 items-center rounded-xl transition-all',
        collapsed ? 'justify-center px-2' : 'gap-3 px-3',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        item.highlighted && !active
          ? 'border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10'
          : '',
      ].join(' ')}
    >
      <Icon className="h-5 w-5 shrink-0" />

      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {item.label}
          </p>
        </div>
      )}

      {!collapsed && active && (
        <ChevronRight className="h-4 w-4 shrink-0 opacity-80" />
      )}
    </Link>
  );

  if (!collapsed) {
    return link;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {link}
      </TooltipTrigger>

      <TooltipContent side="right">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

function DesktopSidebar({
  collapsed,
  onToggleCollapsed,
  pathname,
  isAdmin,
  displayName,
  avatarUrl,
  onLogout,
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r bg-background/95 backdrop-blur md:flex',
          'transition-[width] duration-200 ease-out',
          collapsed ? 'w-[72px]' : 'w-64',
        ].join(' ')}
      >
        <div
          className={[
            'flex h-16 shrink-0 items-center border-b px-3',
            collapsed ? 'justify-center' : 'justify-between gap-3',
          ].join(' ')}
        >
          {!collapsed && (
            <Link to="/" className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Presentation className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-base font-bold leading-none">
                  Apresenta+
                </p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  Organize. Ensaie. Apresente.
                </p>
              </div>
            </Link>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="h-9 w-9 shrink-0"
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
          {!collapsed && (
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Principal
            </p>
          )}

          <div className="space-y-1">
            {MAIN_NAVIGATION.map((item) => (
              <NavigationItem
                key={item.path}
                item={item}
                collapsed={collapsed}
                pathname={pathname}
              />
            ))}
          </div>

          {isAdmin && (
            <div className="mt-5 border-t pt-4">
              {!collapsed && (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Gestão
                </p>
              )}

              <NavigationItem
                item={{
                  path: '/admin',
                  label: 'Administração',
                  description: 'Configurações globais do aplicativo',
                  icon: Shield,
                }}
                collapsed={collapsed}
                pathname={pathname}
              />
            </div>
          )}
        </nav>

        <div className="shrink-0 border-t p-2">
          <div className="space-y-1">
            {ACCOUNT_NAVIGATION.map((item) => (
              <NavigationItem
                key={item.path}
                item={item}
                collapsed={collapsed}
                pathname={pathname}
              />
            ))}
          </div>

          <div
            className={[
              'mt-2 rounded-xl border bg-muted/30 p-2',
              collapsed ? 'flex justify-center' : '',
            ].join(' ')}
          >
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/profile">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                      <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                    </Avatar>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{displayName}</TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex min-w-0 items-center gap-2.5">
                <Link to="/profile" className="shrink-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                    <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                  </Avatar>
                </Link>

                <div className="min-w-0 flex-1">
                  <Link to="/profile" className="block truncate text-sm font-medium hover:underline">
                    {displayName}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {isAdmin ? 'Administrador' : 'Usuário'}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onLogout}
                  aria-label="Sair da conta"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

function MobileTopBar({ title, onOpenMenu }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Presentation className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {title}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            Apresenta+
          </p>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onOpenMenu}
        aria-label="Abrir menu"
        className="h-9 w-9"
      >
        <Menu className="h-5 w-5" />
      </Button>
    </header>
  );
}

function MobileBottomNavigation({ pathname, onOpenMore }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 px-1">
        {MOBILE_PRIMARY.map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(pathname, item);

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              className={[
                'relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              ].join(' ')}
            >
              {item.highlighted ? (
                <span
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-full shadow-sm',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary text-primary-foreground',
                  ].join(' ')}
                >
                  <Icon className="h-5 w-5" />
                </span>
              ) : (
                <Icon className="h-5 w-5" />
              )}

              <span className="max-w-full truncate">
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenMore}
          className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium text-muted-foreground"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>Mais</span>
        </button>
      </div>
    </nav>
  );
}

function MobileMenu({
  open,
  onOpenChange,
  pathname,
  isAdmin,
  displayName,
  avatarUrl,
  onLogout,
}) {
  const closeMenu = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(90vw,360px)] p-0">
        <SheetHeader className="border-b p-5 text-left">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-base">
                {displayName}
              </SheetTitle>
              <SheetDescription>
                {isAdmin ? 'Administrador' : 'Sua conta'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="max-h-[calc(100dvh-96px)] overflow-y-auto p-4">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Menu
          </p>

          <div className="space-y-1">
            {[
              ...MAIN_NAVIGATION,
              ...ACCOUNT_NAVIGATION,
            ].map((item) => (
              <NavigationItem
                key={item.path}
                item={item}
                collapsed={false}
                pathname={pathname}
                onNavigate={closeMenu}
              />
            ))}
          </div>

          {isAdmin && (
            <div className="mt-5 border-t pt-4">
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Gestão
              </p>

              <NavigationItem
                item={{
                  path: '/admin',
                  label: 'Administração',
                  description: 'Configurações globais',
                  icon: Shield,
                }}
                collapsed={false}
                pathname={pathname}
                onNavigate={closeMenu}
              />
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={onLogout}
            className="mt-6 w-full justify-start text-destructive hover:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair da conta
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    profile,
    isAdmin,
    loading,
  } = useCurrentUser();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = useMemo(
    () => (
      profile?.name
      || user?.full_name
      || user?.name
      || 'Apresentador'
    ),
    [profile?.name, user?.full_name, user?.name],
  );

  const avatarUrl = profile?.avatar_url || user?.avatar_url || '';
  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        collapsed ? 'true' : 'false',
      );
    } catch {
      // O layout continua funcionando quando o armazenamento local não está disponível.
    }
  }, [collapsed]);

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await base44.auth.logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Erro ao sair da conta:', error);

      try {
        await base44.auth.logout('/login');
      } catch {
        navigate('/login', { replace: true });
      }
    } finally {
      setLoggingOut(false);
      setMobileMenuOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm">Carregando o aplicativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-muted/20 text-foreground">
      <DesktopSidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((current) => !current)}
        pathname={location.pathname}
        isAdmin={Boolean(isAdmin)}
        displayName={displayName}
        avatarUrl={avatarUrl}
        onLogout={handleLogout}
      />

      <MobileTopBar
        title={pageTitle}
        onOpenMenu={() => setMobileMenuOpen(true)}
      />

      <main
        className={[
          'min-h-screen min-w-0 transition-[margin] duration-200 ease-out',
          'pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0',
          collapsed ? 'md:ml-[72px]' : 'md:ml-64',
        ].join(' ')}
      >
        <div className="min-w-0">
          {children || <Outlet />}
        </div>
      </main>

      <MobileBottomNavigation
        pathname={location.pathname}
        onOpenMore={() => setMobileMenuOpen(true)}
      />

      <MobileMenu
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        pathname={location.pathname}
        isAdmin={Boolean(isAdmin)}
        displayName={displayName}
        avatarUrl={avatarUrl}
        onLogout={handleLogout}
      />

      {loggingOut && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="rounded-2xl border bg-background p-5 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
              <p className="text-sm font-medium">Saindo da conta...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}