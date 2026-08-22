begin;

create schema if not exists apresenta_mais;
grant usage on schema apresenta_mais to authenticated;

create table if not exists apresenta_mais.capture_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nova coleta',
  source_type text not null default 'palestra',
  source_name text not null default '',
  speaker_name text not null default '',
  status text not null default 'active' check (status in ('active','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists apresenta_mais.capture_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references apresenta_mais.capture_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note_type text not null default 'main_point' check (note_type in ('main_point','idea','quote','example','question','research')),
  content text not null,
  source text not null default '',
  order_index integer not null default 0,
  is_highlighted boolean not null default false,
  used_in_presentation boolean not null default false,
  presentation_id uuid null references apresenta_mais.presentations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists capture_sessions_user_updated_idx on apresenta_mais.capture_sessions(user_id, updated_at desc);
create index if not exists capture_notes_session_order_idx on apresenta_mais.capture_notes(session_id, order_index, created_at);
create index if not exists capture_notes_user_created_idx on apresenta_mais.capture_notes(user_id, created_at desc);

drop trigger if exists capture_sessions_set_updated_at on apresenta_mais.capture_sessions;
create trigger capture_sessions_set_updated_at before update on apresenta_mais.capture_sessions
for each row execute function apresenta_mais.set_updated_at();

drop trigger if exists capture_notes_set_updated_at on apresenta_mais.capture_notes;
create trigger capture_notes_set_updated_at before update on apresenta_mais.capture_notes
for each row execute function apresenta_mais.set_updated_at();

alter table apresenta_mais.capture_sessions enable row level security;
alter table apresenta_mais.capture_notes enable row level security;

drop policy if exists capture_sessions_select_own on apresenta_mais.capture_sessions;
create policy capture_sessions_select_own on apresenta_mais.capture_sessions for select to authenticated using (user_id = auth.uid());
drop policy if exists capture_sessions_insert_own on apresenta_mais.capture_sessions;
create policy capture_sessions_insert_own on apresenta_mais.capture_sessions for insert to authenticated with check (user_id = auth.uid());
drop policy if exists capture_sessions_update_own on apresenta_mais.capture_sessions;
create policy capture_sessions_update_own on apresenta_mais.capture_sessions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists capture_sessions_delete_own on apresenta_mais.capture_sessions;
create policy capture_sessions_delete_own on apresenta_mais.capture_sessions for delete to authenticated using (user_id = auth.uid());

drop policy if exists capture_notes_select_own on apresenta_mais.capture_notes;
create policy capture_notes_select_own on apresenta_mais.capture_notes for select to authenticated using (user_id = auth.uid() and exists (select 1 from apresenta_mais.capture_sessions s where s.id = session_id and s.user_id = auth.uid()));
drop policy if exists capture_notes_insert_own on apresenta_mais.capture_notes;
create policy capture_notes_insert_own on apresenta_mais.capture_notes for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from apresenta_mais.capture_sessions s where s.id = session_id and s.user_id = auth.uid()));
drop policy if exists capture_notes_update_own on apresenta_mais.capture_notes;
create policy capture_notes_update_own on apresenta_mais.capture_notes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and exists (select 1 from apresenta_mais.capture_sessions s where s.id = session_id and s.user_id = auth.uid()));
drop policy if exists capture_notes_delete_own on apresenta_mais.capture_notes;
create policy capture_notes_delete_own on apresenta_mais.capture_notes for delete to authenticated using (user_id = auth.uid());

revoke all on apresenta_mais.capture_sessions, apresenta_mais.capture_notes from anon;
grant select, insert, update, delete on apresenta_mais.capture_sessions, apresenta_mais.capture_notes to authenticated;

notify pgrst, 'reload schema';
commit;
