import React, { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ShieldX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';

export default function AdminRoute() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          setDenied(true);
          setChecking(false);
          return;
        }

        const profiles = await base44.entities.UserProfile.filter(
          { user_id: user.id },
        );

        const profile = Array.isArray(profiles) ? profiles[0] : null;
        const userRole = user?.role;
        const profileRole = profile?.role;
        const profileActive = profile ? profile.active !== false : true;

        const adminAccess =
          (userRole === 'admin' || profileRole === 'admin') && profileActive;

        setIsAdmin(adminAccess);
        setDenied(!adminAccess);
      } catch {
        setDenied(true);
      } finally {
        setChecking(false);
      }
    };

    checkAdmin();
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm">Verificando acesso administrativo...</span>
        </div>
      </div>
    );
  }

  if (denied || !isAdmin) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-xl items-center px-4 py-10">
        <Card className="w-full border-destructive/25">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
              <ShieldX className="h-7 w-7 text-destructive" />
            </div>
            <h1 className="text-xl font-bold">Acesso restrito</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta área é exclusiva para administradores. Se você acredita que
              deveria ter acesso, entre em contato com o responsável pelo aplicativo.
            </p>
            <Button asChild className="mt-6">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <Outlet />;
}