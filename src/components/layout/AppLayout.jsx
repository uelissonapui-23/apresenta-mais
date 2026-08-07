import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  FolderOpen,
  Home,
  LayoutDashboard,
  LayoutTemplate,
  Library,
  LogOut,
  Heart,
  Megaphone,
  Menu,
  Moon,
  MoreHorizontal,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Presentation,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  X,
} from 'lucide-react';

import { backendConfig } from '@/lib/backendConfig';
import useCurrentUser from '@/hooks/useCurrentUser';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';

const SIDEBAR_STORAGE_KEY = 'apresenta_sidebar_collapsed';
const THEME_STORAGE_KEY = 'apresenta_theme';

const MAIN_NAV_ITEMS = [
  {
    label: 'Início',
    path: '/',
    icon: Home,
    exact: true,
  },
  {
    label: 'Apresentações',
    path: '/presentations',
    icon: Presentation,
  },
  {
    label: 'Modelos',
    path: '/templates',
    icon: LayoutTemplate,
  },
  {
    label: 'Biblioteca',
    path: '/library',
    icon: Library,
  },
  {
    label: 'Temas',
    path: '/themes',
    icon: Palette,
  },
];

const SECONDARY_NAV_ITEMS = [
  {
    label: 'Perfil',
    path: '/profile',
    icon: UserRound,
  },
  {
    label: 'Configurações',
    path: '/settings',
    icon: Settings,
  },
];

const ADMIN_NAV_ITEMS = [
  {
    label: 'Painel administrativo',
    path: '/admin',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: 'Usuários',
    path: '/admin/users',
    icon: CircleUserRound,
  },
  {
    label: 'Planos',
    path: '/admin/plans',
    icon: ShieldCheck,
    enabled: backendConfig.features.paidPlans,
  },
  {
    label: 'Solicitações',
    path: '/admin/plan-requests',
    icon: CreditCard,
    enabled: backendConfig.features.paidPlans,
  },
  {
    label: 'Apoios',
    path: '/admin/support-contributions',
    icon: Heart,
    enabled: backendConfig.features.supporterPlan,
  },
  {
    label: 'Anúncios',
    path: '/admin/ads',
    icon: Megaphone,
    enabled: backendConfig.features.ads,
  },
  {
    label: 'Pagamentos',
    path: '/admin/payment-config',
    icon: CreditCard,
    enabled: backendConfig.features.paidPlans || backendConfig.features.supporterPlan,
  },
  {
    label: 'Tipos',
    path: '/admin/types',
    icon: FolderOpen,
  },
  {
    label: 'Objetivos',
    path: '/admin/objectives',
    icon: Sparkles,
  },
  {
    label: 'Estilos',
    path: '/admin/styles',
    icon: Palette,
  },
  {
    label: 'Tipos de bloco',
    path: '/admin/block-types',
    icon: BookOpen,
  },
  {
    label: 'Modelos',
    path: '/admin/templates',
    icon: LayoutTemplate,
  },
  {
    label: 'Fluxos guiados',
    path: '/admin/guided-flows',
    icon: Presentation,
  },
  {
    label: 'Perguntas',
    path: '/admin/guided-questions',
    icon: BookOpen,
  },
  {
    label: 'Temas',
    path: '/admin/themes',
    icon: Palette,
  },
  {
    label: 'Dicas',
    path: '/admin/tips',
    icon: Sparkles,
  },
];

function getInitials(value) {
  const text = String(value || '').trim();

  if (!text) {
    return 'U';
  }

  const parts = text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function isAdminProfile(profile) {
  return (
    profile?.role === 'admin'
    && profile?.active !== false
  );
}

function getPageTitle(pathname) {
  if (pathname === '/') {
    return 'Início';
  }

  if (pathname === '/presentations') {
    return 'Minhas apresentações';
  }

  if (pathname === '/new-presentation') {
    return 'Nova apresentação';
  }

  if (pathname.startsWith('/guided/')) {
    return 'Criação guiada';
  }

  if (
    pathname.includes('/editor')
    || pathname.startsWith('/presentation-editor/')
  ) {
    return 'Editor';
  }

  if (
    pathname.includes('/overview')
    || pathname.startsWith('/presentation-overview/')
  ) {
    return 'Visão geral';
  }

  if (pathname.startsWith('/session-history/')) {
    return 'Histórico';
  }

  if (pathname === '/templates') {
    return 'Modelos';
  }

  if (pathname === '/library') {
    return 'Biblioteca';
  }

  if (pathname === '/themes') {
    return 'Temas';
  }

  if (pathname === '/settings') {
    return 'Configurações';
  }

  if (pathname === '/profile') {
    return 'Perfil';
  }

  if (pathname === '/admin') {
    return 'Administração';
  }

  if (pathname.startsWith('/admin/users')) {
    return 'Usuários';
  }

  if (pathname.startsWith('/admin/plans')) {
    return 'Planos';
  }

  if (pathname.startsWith('/admin/types')) {
    return 'Tipos de apresentação';
  }

  if (pathname.startsWith('/admin/objectives')) {
    return 'Objetivos';
  }

  if (pathname.startsWith('/admin/styles')) {
    return 'Estilos';
  }

  if (pathname.startsWith('/admin/block-types')) {
    return 'Tipos de bloco';
  }

  if (pathname.startsWith('/admin/templates')) {
    return 'Modelos administrativos';
  }

  if (pathname.startsWith('/admin/guided-flows')) {
    return 'Fluxos guiados';
  }

  if (pathname.startsWith('/admin/guided-questions')) {
    return 'Perguntas guiadas';
  }

  if (pathname.startsWith('/admin/themes')) {
    return 'Temas administrativos';
  }

  if (pathname.startsWith('/admin/tips')) {
    return 'Dicas';
  }

  return 'Apresenta+';
}

function NavItem({
  item,
  collapsed = false,
  onNavigate,
}) {
  const Icon = item.icon;

  const content = (
    <NavLink
      to={item.path}
      end={item.exact}
      onClick={onNavigate}
      className={({ isActive }) => (
        [
          'group flex min-h-11 items-center rounded-xl transition-colors',
          collapsed
            ? 'justify-center px-2'
            : 'gap-3 px-3',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        ].join(' ')
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />

      {!collapsed && (
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {item.label}
        </span>
      )}
    </NavLink>
  );

  if (!collapsed) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {content}
      </TooltipTrigger>

      <TooltipContent side="right">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

function Sidebar({
  profile,
  user,
  collapsed,
  onToggle,
  onLogout,
  loggingOut,
}) {
  const admin = isAdminProfile(profile);

  const displayName = (
    profile?.name
    || user?.full_name
    || user?.name
    || user?.email
    || 'Usuário'
  );

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-40 hidden border-r bg-background lg:flex lg:flex-col',
        'transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-64',
      ].join(' ')}
    >
      <div
        className={[
          'flex h-16 items-center border-b px-3',
          collapsed
            ? 'justify-center'
            : 'justify-between',
        ].join(' ')}
      >
        <Link
          to="/"
          className="flex min-w-0 items-center gap-3"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Presentation className="h-5 w-5" />
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-base font-bold">
                Apresenta+
              </p>

              <p className="truncate text-[11px] text-muted-foreground">
                Organize. Ensaie. Apresente.
              </p>
            </div>
          )}
        </Link>

        {!collapsed && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label="Recolher menu"
          >
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        )}

        {collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute -right-3 top-20 flex h-7 w-7 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted"
            aria-label="Expandir menu"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <TooltipProvider delayDuration={150}>
        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          <div className="space-y-1">
            {MAIN_NAV_ITEMS.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                collapsed={collapsed}
              />
            ))}
          </div>

          <div className="my-4 border-t" />

          <div className="space-y-1">
            {SECONDARY_NAV_ITEMS.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                collapsed={collapsed}
              />
            ))}
          </div>

          {admin && (
            <>
              <div className="my-4 border-t" />

              {!collapsed && (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Administração
                </p>
              )}

              <div className="space-y-1">
                {ADMIN_NAV_ITEMS.filter((item) => item.enabled !== false).map((item) => (
                  <NavItem
                    key={item.path}
                    item={item}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </>
          )}
        </nav>
      </TooltipProvider>

      <div className="border-t p-3">
        {collapsed ? (
          <TooltipProvider delayDuration={150}>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-12 w-full p-0"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={profile?.avatar_url || ''}
                          alt={displayName}
                        />

                        <AvatarFallback>
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>

                <TooltipContent side="right">
                  {displayName}
                </TooltipContent>
              </Tooltip>

              <UserDropdownContent
                profile={profile}
                user={user}
                onLogout={onLogout}
                loggingOut={loggingOut}
              />
            </DropdownMenu>
          </TooltipProvider>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full min-w-0 items-center gap-3 rounded-xl p-2 text-left hover:bg-muted"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage
                    src={profile?.avatar_url || ''}
                    alt={displayName}
                  />

                  <AvatarFallback>
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">
                      {displayName}
                    </p>

                    {admin && (
                      <Badge
                        variant="secondary"
                        className="h-5 px-1.5 text-[9px]"
                      >
                        Admin
                      </Badge>
                    )}
                  </div>

                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email || 'Conta Apresenta+'}
                  </p>
                </div>

                <MoreHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>

            <UserDropdownContent
              profile={profile}
              user={user}
              onLogout={onLogout}
              loggingOut={loggingOut}
            />
          </DropdownMenu>
        )}
      </div>
    </aside>
  );
}

function UserDropdownContent({
  profile,
  user,
  onLogout,
  loggingOut,
}) {
  const displayName = (
    profile?.name
    || user?.full_name
    || user?.name
    || 'Usuário'
  );

  return (
    <DropdownMenuContent
      align="end"
      sideOffset={8}
      className="w-64"
    >
      <DropdownMenuLabel>
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {displayName}
          </p>

          <p className="truncate text-xs font-normal text-muted-foreground">
            {user?.email}
          </p>
        </div>
      </DropdownMenuLabel>

      <DropdownMenuSeparator />

      <DropdownMenuItem asChild>
        <Link to="/profile">
          <UserRound className="mr-2 h-4 w-4" />
          Perfil
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild>
        <Link to="/settings">
          <Settings className="mr-2 h-4 w-4" />
          Configurações
        </Link>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem
        onClick={onLogout}
        disabled={loggingOut}
        className="text-destructive focus:text-destructive"
      >
        <LogOut className="mr-2 h-4 w-4" />
        {loggingOut ? 'Saindo...' : 'Sair da conta'}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

function MobileHeader({
  title,
  profile,
  user,
  onOpenMenu,
  onLogout,
  loggingOut,
}) {
  const displayName = (
    profile?.name
    || user?.full_name
    || user?.name
    || 'Usuário'
  );

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur lg:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenMenu}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {title}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label="Criar apresentação"
        >
          <Link to="/new-presentation">
            <Plus className="h-5 w-5" />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={profile?.avatar_url || ''}
                  alt={displayName}
                />

                <AvatarFallback className="text-xs">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <UserDropdownContent
            profile={profile}
            user={user}
            onLogout={onLogout}
            loggingOut={loggingOut}
          />
        </DropdownMenu>
      </div>
    </header>
  );
}

function MobileDrawer({
  open,
  onOpenChange,
  profile,
}) {
  const admin = isAdminProfile(profile);

  const handleNavigate = () => {
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetContent
        side="left"
        className="w-[88vw] max-w-sm overflow-y-auto p-0"
      >
        <SheetHeader className="border-b p-4 text-left">
          <SheetTitle className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Presentation className="h-5 w-5" />
            </span>

            <span>
              Apresenta+
            </span>
          </SheetTitle>
        </SheetHeader>

        <nav className="space-y-5 p-4">
          <div className="space-y-1">
            {MAIN_NAV_ITEMS.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                onNavigate={handleNavigate}
              />
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="space-y-1">
              {SECONDARY_NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          </div>

          {admin && (
            <div className="border-t pt-4">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Administração
              </p>

              <div className="space-y-1">
                {ADMIN_NAV_ITEMS.filter((item) => item.enabled !== false).map((item) => (
                  <NavItem
                    key={item.path}
                    item={item}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function MobileBottomNavigation({
  onOpenMore,
}) {
  const items = [
    {
      label: 'Início',
      path: '/',
      icon: Home,
      exact: true,
    },
    {
      label: 'Apresentações',
      path: '/presentations',
      icon: Presentation,
    },
    {
      label: 'Criar',
      path: '/new-presentation',
      icon: Plus,
      primary: true,
    },
    {
      label: 'Modelos',
      path: '/templates',
      icon: LayoutTemplate,
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden"
      aria-label="Navegação principal"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
        {items.map((item) => {
          const Icon = item.icon;

          if (item.primary) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-end gap-1"
              >
                <span className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-lg">
                  <Icon className="h-6 w-6" />
                </span>

                <span className="text-[10px] font-medium">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => (
                [
                  'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground',
                ].join(' ')
              )}
            >
              <Icon className="h-5 w-5" />

              <span className="max-w-full truncate text-[10px] font-medium">
                {item.label}
              </span>
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={onOpenMore}
          className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-muted-foreground"
        >
          <MoreHorizontal className="h-5 w-5" />

          <span className="text-[10px] font-medium">
            Mais
          </span>
        </button>
      </div>
    </nav>
  );
}

function LayoutLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-muted border-t-primary" />

        <p className="text-sm">
          Preparando o aplicativo...
        </p>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    user,
    profile,
    loading,
    logout,
  } = useCurrentUser();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => (
      window.localStorage.getItem(
        SIDEBAR_STORAGE_KEY,
      ) === 'true'
    ),
  );

  const pageTitle = useMemo(
    () => getPageTitle(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      String(sidebarCollapsed),
    );
  }, [sidebarCollapsed]);

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      // Limpa o estado de autenticação e o cache compartilhado primeiro.
      // O Home pode ter requisições em voo; ele ignora resultados após desmontar.
      await logout(false);

      navigate('/login', {
        replace: true,
      });
    } catch (error) {
      console.error(
        'Erro ao sair da conta:',
        error,
      );

      toast({
        title: 'Não foi possível sair',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return <LayoutLoading />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-muted/20">
      <Sidebar
        profile={profile}
        user={user}
        collapsed={sidebarCollapsed}
        onToggle={() => {
          setSidebarCollapsed((current) => !current);
        }}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <MobileHeader
        title={pageTitle}
        profile={profile}
        user={user}
        onOpenMenu={() => setMobileMenuOpen(true)}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <MobileDrawer
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        profile={profile}
      />

      <main
        className={[
          'min-h-screen min-w-0 transition-[padding] duration-200',
          'pb-24 lg:pb-0',
          sidebarCollapsed
            ? 'lg:pl-[76px]'
            : 'lg:pl-64',
        ].join(' ')}
      >
        <div className="min-w-0">
          <Outlet />
        </div>
      </main>

      <MobileBottomNavigation
        onOpenMore={() => setMobileMenuOpen(true)}
      />
    </div>
  );
}