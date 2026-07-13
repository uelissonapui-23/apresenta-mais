import React from 'react';
import { Outlet } from 'react-router-dom';
import DesktopSidebar from '@/components/navigation/DesktopSidebar';
import MobileBottomNavigation from '@/components/navigation/MobileBottomNavigation';
import useCurrentUser from '@/hooks/useCurrentUser';

export default function AppLayout() {
  const { user, isAdmin } = useCurrentUser();

  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar isAdmin={isAdmin} userName={user?.full_name} />
      <main className="md:ml-56 min-h-screen pb-16 md:pb-0">
        <Outlet />
      </main>
      <MobileBottomNavigation isAdmin={isAdmin} />
    </div>
  );
}