import { base44 } from '@/api/base44Client';
import { backendConfig } from '@/lib/backendConfig';
import { getSupabaseClient } from '@/lib/supabaseClient';

function mapSupabaseProfile(row) {
  if (!row) return null;
  return {
    ...row,
    user_id: row.id,
    name: row.full_name || '',
    active: row.account_status !== 'inactive',
  };
}

export async function getUserProfile(userId) {
  if (!userId) return null;
  if (backendConfig.provider !== 'supabase') {
    const rows = await base44.entities.UserProfile.filter({ user_id: userId });
    return Array.isArray(rows) ? rows[0] || null : null;
  }
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return mapSupabaseProfile(data);
}

export async function saveUserProfile(userId, payload) {
  if (!userId) throw new Error('Usuário não autenticado.');
  if (backendConfig.provider !== 'supabase') {
    const rows = await base44.entities.UserProfile.filter({ user_id: userId });
    const current = Array.isArray(rows) ? rows[0] : null;
    if (current?.id) return base44.entities.UserProfile.update(current.id, payload);
    return base44.entities.UserProfile.create({ user_id: userId, ...payload });
  }

  const supabasePayload = {
    id: userId,
    full_name: payload.name ?? payload.full_name ?? '',
    phone: payload.phone || null,
    avatar_url: payload.avatar_url || null,
    onboarding_completed: payload.onboarding_completed ?? true,
  };
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .upsert(supabasePayload, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  return mapSupabaseProfile(data);
}
