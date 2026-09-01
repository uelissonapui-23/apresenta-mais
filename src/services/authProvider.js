import { getSupabaseClient } from '@/lib/supabaseClient';

function normalizeSupabaseUser(user) {
  if (!user) return null;
  const metadata = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email || '',
    full_name: metadata.full_name || metadata.name || '',
    name: metadata.full_name || metadata.name || '',
    role: metadata.role || 'user',
    email_confirmed_at: user.email_confirmed_at || null,
    created_at: user.created_at,
    raw_user_meta_data: metadata,
  };
}

function throwIfError(error) { if (error) throw error; }

export const authProvider = {
  async me() {
    const client = getSupabaseClient();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const { data, error } = await client.auth.getSession();
      throwIfError(error);
      return normalizeSupabaseUser(data?.session?.user);
    }
    const { data, error } = await client.auth.getUser();
    if (error?.name === 'AuthSessionMissingError') return null;
    throwIfError(error);
    return normalizeSupabaseUser(data?.user);
  },

  async loginViaEmailPassword(email, password) {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    throwIfError(error);
    return normalizeSupabaseUser(data?.user);
  },

  async register({ email, password, full_name, name }) {
    const { data, error } = await getSupabaseClient().auth.signUp({
      email,
      password,
      options: { data: { full_name: full_name || name || '' } },
    });
    throwIfError(error);
    const session = data?.session || null;
    const user = normalizeSupabaseUser(data?.user);
    const requiresVerification = Boolean(user && !session);
    return { user, session, requires_verification: requiresVerification, verification_required: requiresVerification, email_verified: Boolean(session || data?.user?.email_confirmed_at) };
  },

  async verifyOtp({ email, token, code }) {
    const { data, error } = await getSupabaseClient().auth.verifyOtp({ email, token: token || code, type: 'signup' });
    throwIfError(error);
    return data;
  },

  async resendOtp({ email }) {
    const { data, error } = await getSupabaseClient().auth.resend({ type: 'signup', email });
    throwIfError(error);
    return data;
  },

  async loginWithProvider(provider, callbackUrl) {
    const { data, error } = await getSupabaseClient().auth.signInWithOAuth({ provider, options: { redirectTo: callbackUrl } });
    throwIfError(error);
    return data;
  },

  async resetPasswordRequest(email) {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { data, error } = await getSupabaseClient().auth.resetPasswordForEmail(email, { redirectTo });
    throwIfError(error);
    return data;
  },

  async resetPassword({ newPassword }) {
    const { data, error } = await getSupabaseClient().auth.updateUser({ password: newPassword });
    throwIfError(error);
    return data;
  },

  async logout(destination) {
    const { error } = await getSupabaseClient().auth.signOut();
    throwIfError(error);
    if (destination) window.location.assign(destination);
  },

  redirectToLogin(returnUrl) {
    const url = new URL('/login', window.location.origin);
    if (returnUrl) url.searchParams.set('returnUrl', returnUrl);
    window.location.assign(url.toString());
  },
};

export function isSupabaseAuthActive() { return true; }
