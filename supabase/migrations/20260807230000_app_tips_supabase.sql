create table if not exists apresenta_mais.app_tips (
  id uuid primary key default gen_random_uuid(),
  presentation_type_id uuid null references apresenta_mais.presentation_types(id) on delete set null,
  objective_id uuid null references apresenta_mais.presentation_objectives(id) on delete set null,
  communication_style_id uuid null references apresenta_mais.communication_styles(id) on delete set null,
  title text not null,
  message text not null,
  trigger_type text null,
  rule_json text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_tips_active_idx on apresenta_mais.app_tips(active);
create index if not exists app_tips_trigger_type_idx on apresenta_mais.app_tips(trigger_type);

alter table apresenta_mais.app_tips enable row level security;

drop policy if exists app_tips_select_authenticated on apresenta_mais.app_tips;
create policy app_tips_select_authenticated
on apresenta_mais.app_tips for select
to authenticated
using (active = true or apresenta_mais.is_admin());

drop policy if exists app_tips_insert_admin on apresenta_mais.app_tips;
create policy app_tips_insert_admin
on apresenta_mais.app_tips for insert
to authenticated
with check (apresenta_mais.is_admin());

drop policy if exists app_tips_update_admin on apresenta_mais.app_tips;
create policy app_tips_update_admin
on apresenta_mais.app_tips for update
to authenticated
using (apresenta_mais.is_admin())
with check (apresenta_mais.is_admin());

drop policy if exists app_tips_delete_admin on apresenta_mais.app_tips;
create policy app_tips_delete_admin
on apresenta_mais.app_tips for delete
to authenticated
using (apresenta_mais.is_admin());

grant select on apresenta_mais.app_tips to authenticated;
grant insert, update, delete on apresenta_mais.app_tips to authenticated;

notify pgrst, 'reload schema';
