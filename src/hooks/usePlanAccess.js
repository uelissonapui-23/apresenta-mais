import { useMemo } from 'react';
import useCurrentUser from '@/hooks/useCurrentUser';

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPlanActive(profile) {
  if (!profile) return false;

  if (profile.permanent_ad_free) return true;

  const status = String(profile.plan_status || 'none').toLowerCase();

  if (status === 'permanent') return true;
  if (status === 'active') {
    const expiresAt = normalizeDate(profile.plan_expires_at);
    if (!expiresAt) return true;
    return expiresAt.getTime() > Date.now();
  }

  return false;
}

function shouldShowAds(profile, plan) {
  // Admins never see ads during app usage
  if (profile?.role === 'admin' && profile?.active !== false) return false;

  // Permanent ad-free unlock
  if (profile?.permanent_ad_free) return false;

  // Active ad-free plan
  if (isPlanActive(profile) && plan && plan.shows_ads === false) {
    return false;
  }

  // Default: show ads (free plan behavior)
  // The profile.shows_ads field is a fallback; plan.shows_ads takes priority
  if (plan) {
    return plan.shows_ads !== false;
  }

  return profile?.shows_ads !== false;
}

function getDaysRemaining(expiresAt) {
  const date = normalizeDate(expiresAt);
  if (!date) return null;

  const ms = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function isPlanExpiringSoon(profile, thresholdDays = 7) {
  if (!isPlanActive(profile)) return false;
  if (profile.permanent_ad_free) return false;
  if (profile.plan_status === 'permanent') return false;

  const days = getDaysRemaining(profile.plan_expires_at);
  return days !== null && days <= thresholdDays;
}

export default function usePlanAccess() {
  const { user, profile, isAdmin } = useCurrentUser();

  const planId = profile?.plan_id || '';

  const access = useMemo(() => {
    const active = isPlanActive(profile);
    const ads = shouldShowAds(profile, null);
    const daysRemaining = getDaysRemaining(profile?.plan_expires_at);
    const expiringSoon = isPlanExpiringSoon(profile);

    return {
      hasPlan: Boolean(planId),
      planId,
      planStatus: profile?.plan_status || 'none',
      planStartDate: profile?.plan_start_date || '',
      planExpiresAt: profile?.plan_expires_at || '',
      permanentAdFree: Boolean(profile?.permanent_ad_free),
      isPlanActive: active,
      shouldShowAds: ads,
      daysRemaining,
      isPlanExpiringSoon: expiringSoon,
      planRequestStatus: profile?.plan_request_status || '',
    };
  }, [profile, planId]);

  return {
    ...access,
    user,
    profile,
    isAdmin,
  };
}