begin;

create schema if not exists apresenta_mais;
grant usage on schema apresenta_mais to authenticated;

create table if not exists apresenta_mais.presentation_sessions (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null
    references apresenta_mais.presentations(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  session_type text not null default 'rehearsal'
    check (session_type in ('rehearsal', 'presentation')),
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed')),
  started_at timestamptz not null default now(),
  paused_at timestamptz,
  finished_at timestamptz,
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
  planned_duration_seconds integer not null default 0 check (planned_duration_seconds >= 0),
  current_block_id uuid
    references apresenta_mais.presentation_blocks(id) on delete set null,
  completed_count integer not null default 0 check (completed_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists apresenta_mais.session_block_progress (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references apresenta_mais.presentation_sessions(id) on delete cascade,
  block_id uuid not null
    references apresenta_mais.presentation_blocks(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'current', 'completed', 'skipped', 'revisit')),
  started_at timestamptz,
  completed_at timestamptz,
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
  visit_count integer not null default 0 check (visit_count >= 0),
  order_used integer not null default 0,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, block_id)
);

create index if not exists presentation_sessions_user_presentation_idx
  on apresenta_mais.presentation_sessions(user_id, presentation_id, created_at desc);

create index if not exists presentation_sessions_status_idx
  on apresenta_mais.presentation_sessions(user_id, status);

create index if not exists session_block_progress_session_order_idx
  on apresenta_mais.session_block_progress(session_id, order_used);

drop trigger if exists presentation_sessions_set_updated_at
  on apresenta_mais.presentation_sessions;
create trigger presentation_sessions_set_updated_at
before update on apresenta_mais.presentation_sessions
for each row execute function apresenta_mais.set_updated_at();

drop trigger if exists session_block_progress_set_updated_at
  on apresenta_mais.session_block_progress;
create trigger session_block_progress_set_updated_at
before update on apresenta_mais.session_block_progress
for each row execute function apresenta_mais.set_updated_at();

alter table apresenta_mais.presentation_sessions enable row level security;
alter table apresenta_mais.session_block_progress enable row level security;

drop policy if exists presentation_sessions_select_own
  on apresenta_mais.presentation_sessions;
create policy presentation_sessions_select_own
on apresenta_mais.presentation_sessions
for select to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from apresenta_mais.presentations p
    where p.id = presentation_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists presentation_sessions_insert_own
  on apresenta_mais.presentation_sessions;
create policy presentation_sessions_insert_own
on apresenta_mais.presentation_sessions
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from apresenta_mais.presentations p
    where p.id = presentation_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists presentation_sessions_update_own
  on apresenta_mais.presentation_sessions;
create policy presentation_sessions_update_own
on apresenta_mais.presentation_sessions
for update to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from apresenta_mais.presentations p
    where p.id = presentation_id
      and p.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from apresenta_mais.presentations p
    where p.id = presentation_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists presentation_sessions_delete_own
  on apresenta_mais.presentation_sessions;
create policy presentation_sessions_delete_own
on apresenta_mais.presentation_sessions
for delete to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from apresenta_mais.presentations p
    where p.id = presentation_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists session_block_progress_select_own
  on apresenta_mais.session_block_progress;
create policy session_block_progress_select_own
on apresenta_mais.session_block_progress
for select to authenticated
using (
  exists (
    select 1
    from apresenta_mais.presentation_sessions s
    join apresenta_mais.presentations p on p.id = s.presentation_id
    where s.id = session_id
      and s.user_id = auth.uid()
      and p.user_id = auth.uid()
  )
);

drop policy if exists session_block_progress_insert_own
  on apresenta_mais.session_block_progress;
create policy session_block_progress_insert_own
on apresenta_mais.session_block_progress
for insert to authenticated
with check (
  exists (
    select 1
    from apresenta_mais.presentation_sessions s
    join apresenta_mais.presentations p on p.id = s.presentation_id
    where s.id = session_id
      and s.user_id = auth.uid()
      and p.user_id = auth.uid()
  )
);

drop policy if exists session_block_progress_update_own
  on apresenta_mais.session_block_progress;
create policy session_block_progress_update_own
on apresenta_mais.session_block_progress
for update to authenticated
using (
  exists (
    select 1
    from apresenta_mais.presentation_sessions s
    join apresenta_mais.presentations p on p.id = s.presentation_id
    where s.id = session_id
      and s.user_id = auth.uid()
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from apresenta_mais.presentation_sessions s
    join apresenta_mais.presentations p on p.id = s.presentation_id
    where s.id = session_id
      and s.user_id = auth.uid()
      and p.user_id = auth.uid()
  )
);

drop policy if exists session_block_progress_delete_own
  on apresenta_mais.session_block_progress;
create policy session_block_progress_delete_own
on apresenta_mais.session_block_progress
for delete to authenticated
using (
  exists (
    select 1
    from apresenta_mais.presentation_sessions s
    join apresenta_mais.presentations p on p.id = s.presentation_id
    where s.id = session_id
      and s.user_id = auth.uid()
      and p.user_id = auth.uid()
  )
);

revoke all on
  apresenta_mais.presentation_sessions,
  apresenta_mais.session_block_progress
from anon;

grant select, insert, update, delete on
  apresenta_mais.presentation_sessions,
  apresenta_mais.session_block_progress
to authenticated;

notify pgrst, 'reload schema';

commit;
