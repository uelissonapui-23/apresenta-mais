const normalize = (value) => String(value || '').trim();

const requestedProvider = normalize(import.meta.env.VITE_BACKEND_PROVIDER).toLowerCase();

export const backendConfig = Object.freeze({
  provider: requestedProvider === 'supabase' ? 'supabase' : 'base44',
  supabaseUrl: normalize(import.meta.env.VITE_SUPABASE_URL),
  supabasePublishableKey: normalize(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  features: Object.freeze({
    ads: import.meta.env.VITE_FEATURE_ADS === 'true',
    paidPlans: import.meta.env.VITE_FEATURE_PAID_PLANS === 'true',
    supporterPlan: import.meta.env.VITE_FEATURE_SUPPORTER_PLAN === 'true',
  }),
});

export function isSupabaseConfigured() {
  return Boolean(
    backendConfig.supabaseUrl
    && backendConfig.supabasePublishableKey,
  );
}

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase ainda não foi configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
}
