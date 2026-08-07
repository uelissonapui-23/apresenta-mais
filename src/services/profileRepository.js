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
