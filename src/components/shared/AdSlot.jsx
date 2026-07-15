import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Megaphone, X } from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';

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

function uniqueById(rows) {
  const map = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.id) map.set(row.id, row);
  }

  return [...map.values()];
}

function isExcludedRoute(pathname) {
  return EXCLUDED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

function getViewport() {
  if (typeof window === 'undefined') {
    return { device: 'desktop', orientation: 'landscape' };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    device: width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop',
    orientation: height > width ? 'portrait' : 'landscape',
  };
}

function normalizeRoute(route) {
  const value = String(route || '').trim();
  if (!value) return '';
  return value.startsWith('/') ? value : `/${value}`;
}

function parseExcludedRoutes(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return [...new Set(value.map(normalizeRoute).filter(Boolean))];
  }

  if (typeof value === 'object') {
    return [];
  }

  const raw = String(value).trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return [...new Set(parsed.map(normalizeRoute).filter(Boolean))];
    }
  } catch {
    // The admin page stores one route per line; continue with text parsing.
  }

  return [...new Set(
    raw
      .split(/\r?\n|,/)
      .map(normalizeRoute)
      .filter(Boolean),
  )];
}

function routeMatches(pathname, route) {
  if (!route) return false;
  if (route === '/') return pathname === '/';

  const normalizedRoute = route.endsWith('/')
    ? route.slice(0, -1)
    : route;

  return (
    pathname === normalizedRoute
    || pathname.startsWith(`${normalizedRoute}/`)
  );
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

  if (
    placement.page_key
    && placement.page_key !== 'all'
    && placement.page_key !== pageKey
  ) {
    return false;
  }

  return true;
}

function isRouteExcluded(placement, pathname) {
  return parseExcludedRoutes(placement?.excluded_routes_json)
    .some((route) => routeMatches(pathname, route));
}

function normalizeDate(value) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isActivePlan(profile) {
  if (!profile) return false;
  if (profile.permanent_ad_free) return true;

  const status = String(profile.plan_status || 'none').toLowerCase();
  if (status === 'permanent') return true;
  if (status !== 'active') return false;

  const expiration = normalizeDate(profile.plan_expires_at);
  return !expiration || expiration.getTime() > Date.now();
}

function userShouldSeeAds(profile, plan) {
  if (!profile) return true;
  if (profile.permanent_ad_free) return false;

  const status = String(profile.plan_status || 'none').toLowerCase();
  if (status === 'permanent') return false;

  if (!isActivePlan(profile)) return true;

  if (plan?.id) {
    return plan.shows_ads !== false;
  }

  return profile.shows_ads !== false;
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
  const [plan, setPlan] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [viewport, setViewport] = useState(getViewport);

  useEffect(() => {
    const handleViewportChange = () => setViewport(getViewport());

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, []);

  useEffect(() => {
    setDismissed(false);
  }, [location.pathname, placementCode]);

  useEffect(() => {
    let cancelled = false;

    async function loadAdData() {
      setLoaded(false);

      if (!placementCode || isExcludedRoute(location.pathname)) {
        if (!cancelled) {
          setConfig(null);
          setPlacement(null);
          setPlan(null);
          setLoaded(true);
        }
        return;
      }

      try {
        const planPromise = profile?.plan_id
          ? base44.entities.Plan.filter({ id: profile.plan_id }, '-updated_date', 5)
          : Promise.resolve([]);

        const [configRows, placementRows, planRows] = await Promise.all([
          base44.entities.AdConfiguration.filter(
            { active: true },
            '-updated_date',
            20,
          ),
          base44.entities.AdPlacement.filter(
            { code: placementCode, active: true },
            'order_index',
            20,
          ),
          planPromise,
        ]);

        if (cancelled) return;

        const configs = uniqueById(configRows);
        const placements = uniqueById(placementRows);
        const plans = uniqueById(planRows);

        setConfig(configs[0] || null);
        setPlacement(
          placements.find((item) => item.enabled !== false)
          || placements[0]
          || null,
        );
        setPlan(plans.find((item) => item.id === profile?.plan_id) || null);
      } catch (error) {
        console.warn('Não foi possível carregar o espaço de anúncio:', error);
        if (!cancelled) {
          setConfig(null);
          setPlacement(null);
          setPlan(null);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    loadAdData();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, placementCode, profile?.plan_id]);

  const visible = useMemo(() => {
    if (dismissed || !loaded || !placementCode) return false;
    if (isExcludedRoute(location.pathname)) return false;

    if (!config || config.ads_enabled === false || config.active === false) {
      return false;
    }

    const isTestMode = config.test_mode !== false;

    if (isAdmin && !(isTestMode && config.admin_preview_enabled !== false)) {
      return false;
    }

    if (!placement) return false;

    if (!shouldPlacementShow(placement, {
      device: viewport.device,
      orientation: viewport.orientation,
      pageKey,
    })) {
      return false;
    }

    if (isRouteExcluded(placement, location.pathname)) return false;

    if (!isAdmin && !userShouldSeeAds(profile, plan)) return false;

    try {
      const sessionDismissed = window.sessionStorage.getItem(
        `${SESSION_STORAGE_KEY}:${placementCode}`,
      );

      if (sessionDismissed === 'true') return false;
    } catch {
      // sessionStorage may be unavailable.
    }

    return true;
  }, [
    config,
    dismissed,
    isAdmin,
    loaded,
    location.pathname,
    pageKey,
    placement,
    placementCode,
    plan,
    profile,
    viewport.device,
    viewport.orientation,
  ]);

  const handleDismiss = () => {
    setDismissed(true);

    try {
      window.sessionStorage.setItem(
        `${SESSION_STORAGE_KEY}:${placementCode}`,
        'true',
      );
    } catch {
      // Ignore storage errors.
    }
  };

  if (!visible) return null;

  const isTestMode = config?.test_mode !== false;
  const isAdminPreview = isAdmin && isTestMode;

  return (
    <div
      className={`relative flex min-h-[72px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-3 ${className}`}
      data-ad-slot={placementCode}
      data-ad-placement={placement?.id}
      data-ad-device={viewport.device}
      data-ad-orientation={viewport.orientation}
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
          {isAdminPreview
            ? 'Prévia administrativa de anúncio'
            : isTestMode
              ? 'Espaço publicitário (modo teste)'
              : 'Publicidade'}
        </div>

        <p className="text-xs text-muted-foreground/60">
          {isTestMode
            ? `Posição: ${placement?.name || placementCode}`
            : 'Anúncio'}
        </p>
      </div>
    </div>
  );
}