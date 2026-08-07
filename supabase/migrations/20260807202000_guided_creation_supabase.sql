begin;

create schema if not exists apresenta_mais;
grant usage on schema apresenta_mais to authenticated;

create table if not exists apresenta_mais.guided_flows (
  id uuid primary key default gen_random_uuid(),
  presentation_type_id uuid references apresenta_mais.presentation_types(id) on delete set null,
  objective_id uuid references apresenta_mais.presentation_objectives(id) on delete set null,
  communication_style_id uuid references apresenta_mais.communication_styles(id) on delete set null,
  name text not null,
  description text,
  active boolean not null default true,
  version numeric not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists apresenta_mais.guided_questions (
  id uuid primary key default gen_random_uuid(),
  guided_flow_id uuid not null references apresenta_mais.guided_flows(id) on delete cascade,
  question_text text not null,
  help_text text,
  field_type text not null default 'textarea',
  options_json text,
  required boolean not null default false,
  order_index integer not null default 0,
  destination_field text,
  block_type_to_generate text,
  conditional_rule_json text,
  active boolean not null default true,
  generated_title text,
  question_short_title text,
  placeholder text,
  split_lines boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists apresenta_mais.guided_answers (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references apresenta_mais.presentations(id) on delete cascade,
  guided_question_id uuid not null references apresenta_mais.guided_questions(id) on delete cascade,
  answer_text text,
  answer_json text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (presentation_id, guided_question_id)
);

create index if not exists guided_flows_lookup_idx
  on apresenta_mais.guided_flows(active, presentation_type_id, objective_id, communication_style_id, version desc);
create index if not exists guided_questions_flow_order_idx
  on apresenta_mais.guided_questions(guided_flow_id, active, order_index);
create index if not exists guided_answers_presentation_idx
  on apresenta_mais.guided_answers(presentation_id);

drop trigger if exists guided_flows_set_updated_at on apresenta_mais.guided_flows;
create trigger guided_flows_set_updated_at
before update on apresenta_mais.guided_flows
for each row execute function apresenta_mais.set_updated_at();

drop trigger if exists guided_questions_set_updated_at on apresenta_mais.guided_questions;
create trigger guided_questions_set_updated_at
before update on apresenta_mais.guided_questions
for each row execute function apresenta_mais.set_updated_at();

drop trigger if exists guided_answers_set_updated_at on apresenta_mais.guided_answers;
create trigger guided_answers_set_updated_at
before update on apresenta_mais.guided_answers
for each row execute function apresenta_mais.set_updated_at();

alter table apresenta_mais.guided_flows enable row level security;
alter table apresenta_mais.guided_questions enable row level security;
alter table apresenta_mais.guided_answers enable row level security;

drop policy if exists guided_flows_read_authenticated on apresenta_mais.guided_flows;
create policy guided_flows_read_authenticated
on apresenta_mais.guided_flows for select to authenticated
using (active = true or apresenta_mais.is_admin());

drop policy if exists guided_flows_admin_write on apresenta_mais.guided_flows;
create policy guided_flows_admin_write
on apresenta_mais.guided_flows for all to authenticated
using (apresenta_mais.is_admin())
with check (apresenta_mais.is_admin());

drop policy if exists guided_questions_read_authenticated on apresenta_mais.guided_questions;
create policy guided_questions_read_authenticated
on apresenta_mais.guided_questions for select to authenticated
using (
  (active = true and exists (
    select 1 from apresenta_mais.guided_flows f
    where f.id = guided_flow_id and f.active = true
  ))
  or apresenta_mais.is_admin()
);

drop policy if exists guided_questions_admin_write on apresenta_mais.guided_questions;
create policy guided_questions_admin_write
on apresenta_mais.guided_questions for all to authenticated
using (apresenta_mais.is_admin())
with check (apresenta_mais.is_admin());

drop policy if exists guided_answers_select_own on apresenta_mais.guided_answers;
create policy guided_answers_select_own
on apresenta_mais.guided_answers for select to authenticated
using (exists (
  select 1 from apresenta_mais.presentations p
  where p.id = presentation_id and p.user_id = auth.uid()
));

drop policy if exists guided_answers_insert_own on apresenta_mais.guided_answers;
create policy guided_answers_insert_own
on apresenta_mais.guided_answers for insert to authenticated
with check (exists (
  select 1 from apresenta_mais.presentations p
  where p.id = presentation_id and p.user_id = auth.uid()
));

drop policy if exists guided_answers_update_own on apresenta_mais.guided_answers;
create policy guided_answers_update_own
on apresenta_mais.guided_answers for update to authenticated
using (exists (
  select 1 from apresenta_mais.presentations p
  where p.id = presentation_id and p.user_id = auth.uid()
))
with check (exists (
  select 1 from apresenta_mais.presentations p
  where p.id = presentation_id and p.user_id = auth.uid()
));

drop policy if exists guided_answers_delete_own on apresenta_mais.guided_answers;
create policy guided_answers_delete_own
on apresenta_mais.guided_answers for delete to authenticated
using (exists (
  select 1 from apresenta_mais.presentations p
  where p.id = presentation_id and p.user_id = auth.uid()
));

revoke all on apresenta_mais.guided_flows, apresenta_mais.guided_questions, apresenta_mais.guided_answers from anon;
grant select, insert, update, delete on apresenta_mais.guided_flows, apresenta_mais.guided_questions, apresenta_mais.guided_answers to authenticated;

notify pgrst, 'reload schema';
commit;
