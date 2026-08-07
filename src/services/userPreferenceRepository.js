import { getSupabaseClient } from '@/lib/supabaseClient';

export async function getUserPreference(userId) {
  if (!userId) return null;
  const { data, error } = await getSupabaseClient()
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveUserPreference(userId, payload = {}) {
  if (!userId) throw new Error('Usuário não autenticado.');
  const next = {
    user_id: userId,
    default_view_mode: payload.default_view_mode || 'structure',
    default_detail_level: payload.default_detail_level || 'normal',
    default_font_size: Number(payload.default_font_size || 16),
    presentation_font_size: Number(payload.presentation_font_size || 28),
    use_dark_mode: payload.use_dark_mode === true,
    show_timer: payload.show_timer !== false,
    show_next_block: payload.show_next_block !== false,
    show_progress: payload.show_progress !== false,
    auto_mark_completed: payload.auto_mark_completed !== false,
    confirm_before_restart: payload.confirm_before_restart !== false,
    accessibility_settings_json: typeof payload.accessibility_settings_json === 'string'
      ? payload.accessibility_settings_json
      : JSON.stringify(payload.accessibility_settings_json || {}),
  };
  const { data, error } = await getSupabaseClient()
    .from('user_preferences')
    .upsert(next, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
