import { base44 } from '@/api/base44Client';
import { backendConfig } from '@/lib/backendConfig';
import { getSupabaseClient } from '@/lib/supabaseClient';

const usingSupabase = () => backendConfig.provider === 'supabase';

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

function throwIfError(error) {
  if (error) throw error;
}

export const authProvider = {
  async me() {
    if (!usingSupabase()) return base44.auth.me();
    const { data, error } = await getSupabaseClient().auth.getUser();
    throwIfError(error);
    return normalizeSupabaseUser(data?.user);
  },

  async loginViaEmailPassword(email, password) {
    if (!usingSupabase()) return base44.auth.loginViaEmailPassword(email, password);
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    throwIfError(error);
    return normalizeSupabaseUser(data?.user);
  },

  async register({ email, password, full_name, name, ...rest }) {
    if (!usingSupabase()) return base44.auth.register({ email, password, full_name, name, ...rest });
    const { data, error } = await getSupabaseClient().auth.signUp({
      email,
      password,
      options: { data: { full_name: full_name || name || '' } },
    });
    throwIfError(error);
    return {
      user: normalizeSupabaseUser(data?.user),
      session: data?.session || null,
      requires_verification: Boolean(data?.user && !data?.session),
      verification_required: Boolean(data?.user && !data?.session),
      email_verified: Boolean(data?.session),
    };
  },

  async verifyOtp({ email, token, code }) {
    if (!usingSupabase()) return base44.auth.verifyOtp({ email, token, code });
    const { data, error } = await getSupabaseClient().auth.verifyOtp({
      email,
      token: token || code,
      type: 'signup',
    });
    throwIfError(error);
    return data;
  },

  async resendOtp({ email }) {
    if (!usingSupabase()) return base44.auth.resendOtp({ email });
    const { data, error } = await getSupabaseClient().auth.resend({ type: 'signup', email });
    throwIfError(error);
    return data;
  },

  async loginWithProvider(provider, callbackUrl) {
    if (!usingSupabase()) return base44.auth.loginWithProvider(provider, callbackUrl);
    const { data, error } = await getSupabaseClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl },
    });
    throwIfError(error);
    return data;
  },

  async resetPasswordRequest(email) {
    if (!usingSupabase()) return base44.auth.resetPasswordRequest(email);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { data, error } = await getSupabaseClient().auth.resetPasswordForEmail(email, { redirectTo });
    throwIfError(error);
    return data;
  },

  async resetPassword({ resetToken, newPassword }) {
    if (!usingSupabase()) return base44.auth.resetPassword({ resetToken, newPassword });
    // No Supabase, o link de recuperação cria a sessão de recovery ao retornar ao app.
    const { data, error } = await getSupabaseClient().auth.updateUser({ password: newPassword });
    throwIfError(error);
    return data;
  },

  async logout(destination) {
    if (!usingSupabase()) return base44.auth.logout(destination);
    const { error } = await getSupabaseClient().auth.signOut();
    throwIfError(error);
    if (destination) window.location.assign(destination);
  },

  redirectToLogin(returnUrl) {
    if (!usingSupabase()) return base44.auth.redirectToLogin(returnUrl);
    const url = new URL('/login', window.location.origin);
    if (returnUrl) url.searchParams.set('returnUrl', returnUrl);
    window.location.assign(url.toString());
  },
};

export function isSupabaseAuthActive() {
  return usingSupabase();
}
