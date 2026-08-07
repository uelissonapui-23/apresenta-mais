begin;
create table if not exists apresenta_mais.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  default_view_mode text not null default 'structure', default_detail_level text not null default 'normal',
  default_font_size integer not null default 16, presentation_font_size integer not null default 28,
  use_dark_mode boolean not null default false, show_timer boolean not null default true,
  show_next_block boolean not null default true, show_progress boolean not null default true,
  auto_mark_completed boolean not null default true, confirm_before_restart boolean not null default true,
  accessibility_settings_json text not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table apresenta_mais.user_preferences enable row level security;
drop trigger if exists user_preferences_set_updated_at on apresenta_mais.user_preferences;
create trigger user_preferences_set_updated_at before update on apresenta_mais.user_preferences for each row execute function apresenta_mais.set_updated_at();
drop policy if exists user_preferences_select_own on apresenta_mais.user_preferences;
create policy user_preferences_select_own on apresenta_mais.user_preferences for select to authenticated using (user_id=auth.uid());
drop policy if exists user_preferences_insert_own on apresenta_mais.user_preferences;
create policy user_preferences_insert_own on apresenta_mais.user_preferences for insert to authenticated with check (user_id=auth.uid());
drop policy if exists user_preferences_update_own on apresenta_mais.user_preferences;
create policy user_preferences_update_own on apresenta_mais.user_preferences for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
revoke all on apresenta_mais.user_preferences from anon;
grant select,insert,update on apresenta_mais.user_preferences to authenticated;
notify pgrst,'reload schema';
commit;
