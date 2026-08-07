const normalize = (value) => String(value || '').trim();

export const backendConfig = Object.freeze({
  provider: 'supabase',
  supabaseUrl: normalize(import.meta.env.VITE_SUPABASE_URL),
  supabasePublishableKey: normalize(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  supabaseSchema: normalize(import.meta.env.VITE_SUPABASE_SCHEMA) || 'apresenta_mais',
  features: Object.freeze({
    ads: import.meta.env.VITE_FEATURE_ADS === 'true',
    paidPlans: import.meta.env.VITE_FEATURE_PAID_PLANS === 'true',
    supporterPlan: import.meta.env.VITE_FEATURE_SUPPORTER_PLAN === 'true',
  }),
});

export function isSupabaseConfigured() {
  return Boolean(backendConfig.supabaseUrl && backendConfig.supabasePublishableKey);
}

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.');
  }
}
