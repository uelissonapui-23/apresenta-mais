import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Megaphone, X } from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';

import { Button } from '@/components/ui/button';

const EXCLUDED_ROUTE_PREFIXES = [
  '/present/',
  '/rehearsal/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/terms',
  '/privacy',
  '/onboarding',
];

const SESSION_STORAGE_KEY = 'apresenta_ad_dismissed';

function isExcludedRoute(pathname) {
  return EXCLUDED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

function getDeviceType() {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;

  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';

  return 'desktop';
}

function getOrientation() {
  if (typeof window === 'undefined') return 'portrait';
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

function parseJsonField(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function shouldPlacementShow(placement, { device, orientation, pageKey }) {
  if (!placement || placement.active === false || placement.enabled === false) {
    return false;
  }

  if (device === 'mobile' && placement.show_on_mobile === false) return false;
  if (device === 'tablet' && placement.show_on_tablet === false) return false;
  if (device === 'desktop' && placement.show_on_desktop === false) return false;

  if (orientation === 'portrait' && placement.show_in_portrait === false) return false;
  if (orientation === 'landscape' && placement.show_in_landscape === false) return false;

  if (placement.page_key && placement.page_key !== 'all' && placement.page_key !== pageKey) {
    return false;
  }

  return true;
}

function isRouteExcluded(placement, pathname) {
  const excluded = parseJsonField(placement.excluded_routes_json, []);

  if (!Array.isArray(excluded) || excluded.length === 0) return false;

  return excluded.some(
    (route) => pathname === route || pathname.startsWith(String(route)),
  );
}

export default function AdSlot({
  placement: placementCode,
  pageKey = 'generic',
  className = '',
}) {
  const location = useLocation();
  const { profile, isAdmin } = useCurrentUser();

  const [config, setConfig] = useState(null);
  const [placement, setPlacement] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAdData() {
      if (isExcludedRoute(location.pathname)) {
        setLoaded(true);
        return;
      }

      try {
        const [configRows, placementRows] = await Promise.all([
          base44.entities.AdConfiguration.filter({ active: true }, '-updated_date', 5),
          base44.entities.AdPlacement.filter(
            { code: placementCode, active: true },
            'order_index',
            10,
          ),
        ]);

        if (cancelled) return;

        setConfig(Array.isArray(configRows) && configRows.length > 0 ? configRows[0] : null);
        setPlacement(Array.isArray(placementRows) && placementRows.length > 0 ? placementRows[0] : null);
      } catch {
        // Fail silently — ads should never break the page
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    loadAdData();

    return () => {
      cancelled = true;
    };
  }, [placementCode, location.pathname]);

  const visible = useMemo(() => {
    if (dismissed) return false;
    if (!loaded) return false;
    if (isExcludedRoute(location.pathname)) return false;

    // Admins never see ads
    if (isAdmin) return false;

    // Check global ad config
    if (!config || config.ads_enabled === false || config.active === false) {
      return false;
    }

    // Check placement
    if (!placement) return false;

    const device = getDeviceType();
    const orientation = getOrientation();

    if (!shouldPlacementShow(placement, { device, orientation, pageKey })) {
      return false;
    }

    if (isRouteExcluded(placement, location.pathname)) return false;

    // Check user plan — ad-free users don't see ads
    if (profile?.permanent_ad_free) return false;

    const planStatus = String(profile?.plan_status || 'none').toLowerCase();
    if (planStatus === 'permanent') return false;

    if (planStatus === 'active') {
      const expiresAt = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null;
      const isValid = !expiresAt || expiresAt.getTime() > Date.now();
      if (isValid && profile?.shows_ads === false) return false;
    }

    // Check session-based dismissal
    try {
      const sessionDismissed = window.sessionStorage.getItem(
        `${SESSION_STORAGE_KEY}:${placementCode}`,
      );
      if (sessionDismissed === 'true') return false;
    } catch {
      // sessionStorage may be unavailable
    }

    return true;
  }, [config, dismissed, isAdmin, loaded, location.pathname, pageKey, placement, placementCode, profile]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(
        `${SESSION_STORAGE_KEY}:${placementCode}`,
        'true',
      );
    } catch {
      // Ignore storage errors
    }
  };

  // Reserve space to prevent layout shift, but don't show the ad
  if (!visible) {
    return null;
  }

  const isTestMode = config?.test_mode !== false;

  return (
    <div
      className={`relative flex min-h-[72px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-3 ${className}`}
      data-ad-slot={placementCode}
      data-ad-placement={placement?.id}
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-2 top-2 z-10 rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Fechar anúncio"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
          <Megaphone className="h-3 w-3" />
          {isTestMode ? 'Espaço publicitário (modo teste)' : 'Publicidade'}
        </div>
        <p className="text-xs text-muted-foreground/60">
          {isTestMode
            ? 'Este espaço está reservado para anúncios. Em modo de teste, nenhum anúncio real é exibido.'
            : 'Anúncio'}
        </p>
      </div>
    </div>
  );
}