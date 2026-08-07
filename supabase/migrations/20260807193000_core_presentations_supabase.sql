begin;

create extension if not exists pgcrypto;
create schema if not exists apresenta_mais;

grant usage on schema apresenta_mais to authenticated;

create or replace function apresenta_mais.is_admin()
returns boolean
language sql
stable
security definer
set search_path = apresenta_mais, public
as $$
  select exists (
    select 1
    from apresenta_mais.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.account_status = 'active'
  );
$$;

revoke all on function apresenta_mais.is_admin() from public;
grant execute on function apresenta_mais.is_admin() to authenticated;

create table if not exists apresenta_mais.presentation_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  icon text,
  color text,
  default_structure_id text,
  active boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists apresenta_mais.presentation_objectives (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  icon text,
  active boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists apresenta_mais.communication_styles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  active boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists apresenta_mais.presentation_themes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  thumbnail_url text,
  background_color text not null default '#FFFFFF',
  text_color text not null default '#1A1A1A',
  title_color text not null default '#111111',
  accent_color text not null default '#4F46E5',
  title_font text not null default 'Inter',
  body_font text not null default 'Inter',
  default_title_size integer not null default 32,
  default_body_size integer not null default 18,
  default_alignment text not null default 'left'
    check (default_alignment in ('left','center','right')),
  transition_type text not null default 'fade',
  is_official boolean not null default false,
  is_premium boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists apresenta_mais.block_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  icon text,
  supports_title boolean not null default true,
  supports_summary boolean not null default true,
  supports_content boolean not null default true,
  supports_notes boolean not null default true,
  supports_attachment boolean not null default false,
  active boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists apresenta_mais.presentations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subtitle text,
  description text,
  presentation_type_id uuid references apresenta_mais.presentation_types(id) on delete set null,
  objective_id uuid references apresenta_mais.presentation_objectives(id) on delete set null,
  communication_style_id uuid references apresenta_mais.communication_styles(id) on delete set null,
  audience text,
  audience_knowledge_level text not null default 'mixed'
    check (audience_knowledge_level in ('beginner','intermediate','advanced','mixed')),
  main_theme text,
  main_message text,
  estimated_duration_minutes numeric not null default 30,
  theme_id uuid references apresenta_mais.presentation_themes(id) on delete set null,
  default_view_mode text not null default 'structure'
    check (default_view_mode in ('structure','text','cards','script')),
  status text not null default 'draft'
    check (status in ('draft','ready','in_progress','completed','archived')),
  progress_percentage numeric not null default 0 check (progress_percentage between 0 and 100),
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  current_version integer not null default 1,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists apresenta_mais.presentation_blocks (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references apresenta_mais.presentations(id) on delete cascade,
  parent_id uuid references apresenta_mais.presentation_blocks(id) on delete cascade,
  block_type_id uuid references apresenta_mais.block_types(id) on delete set null,
  title text not null,
  summary text,
  content text,
  additional_content text,
  presenter_notes text,
  order_index integer not null default 0,
  depth_level integer not null default 0,
  importance_level integer not null default 3,
  estimated_duration_seconds integer not null default 60,
  is_essential boolean not null default false,
  is_hidden boolean not null default false,
  is_collapsed boolean not null default false,
  show_to_audience boolean not null default true,
  icon text,
  background_style text,
  text_style text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists presentations_user_updated_idx
  on apresenta_mais.presentations(user_id, updated_at desc);

create index if not exists presentations_user_archived_idx
  on apresenta_mais.presentations(user_id, is_archived);

create index if not exists presentation_blocks_presentation_order_idx
  on apresenta_mais.presentation_blocks(presentation_id, order_index);

create index if not exists presentation_blocks_parent_idx
  on apresenta_mais.presentation_blocks(parent_id);

-- Updated-at triggers
do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'presentation_types',
    'presentation_objectives',
    'communication_styles',
    'presentation_themes',
    'block_types',
    'presentations',
    'presentation_blocks'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on apresenta_mais.%I', target_table, target_table);
    execute format(
      'create trigger %I_set_updated_at before update on apresenta_mais.%I
       for each row execute function apresenta_mais.set_updated_at()',
      target_table,
      target_table
    );
  end loop;
end $$;

-- RLS
alter table apresenta_mais.presentation_types enable row level security;
alter table apresenta_mais.presentation_objectives enable row level security;
alter table apresenta_mais.communication_styles enable row level security;
alter table apresenta_mais.presentation_themes enable row level security;
alter table apresenta_mais.block_types enable row level security;
alter table apresenta_mais.presentations enable row level security;
alter table apresenta_mais.presentation_blocks enable row level security;

-- Catálogos: leitura para autenticados, escrita apenas por admin.
do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'presentation_types',
    'presentation_objectives',
    'communication_styles',
    'presentation_themes',
    'block_types'
  ]
  loop
    execute format('drop policy if exists %I_read_authenticated on apresenta_mais.%I', target_table, target_table);
    execute format(
      'create policy %I_read_authenticated on apresenta_mais.%I
       for select to authenticated using (true)',
      target_table,
      target_table
    );

    execute format('drop policy if exists %I_admin_insert on apresenta_mais.%I', target_table, target_table);
    execute format(
      'create policy %I_admin_insert on apresenta_mais.%I
       for insert to authenticated with check (apresenta_mais.is_admin())',
      target_table,
      target_table
    );

    execute format('drop policy if exists %I_admin_update on apresenta_mais.%I', target_table, target_table);
    execute format(
      'create policy %I_admin_update on apresenta_mais.%I
       for update to authenticated
       using (apresenta_mais.is_admin())
       with check (apresenta_mais.is_admin())',
      target_table,
      target_table
    );

    execute format('drop policy if exists %I_admin_delete on apresenta_mais.%I', target_table, target_table);
    execute format(
      'create policy %I_admin_delete on apresenta_mais.%I
       for delete to authenticated using (apresenta_mais.is_admin())',
      target_table,
      target_table
    );
  end loop;
end $$;

drop policy if exists presentations_select_own on apresenta_mais.presentations;
create policy presentations_select_own
on apresenta_mais.presentations for select
to authenticated
using (user_id = auth.uid());

drop policy if exists presentations_insert_own on apresenta_mais.presentations;
create policy presentations_insert_own
on apresenta_mais.presentations for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists presentations_update_own on apresenta_mais.presentations;
create policy presentations_update_own
on apresenta_mais.presentations for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists presentations_delete_own on apresenta_mais.presentations;
create policy presentations_delete_own
on apresenta_mais.presentations for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists presentation_blocks_select_own on apresenta_mais.presentation_blocks;
create policy presentation_blocks_select_own
on apresenta_mais.presentation_blocks for select
to authenticated
using (
  exists (
    select 1
    from apresenta_mais.presentations p
    where p.id = presentation_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists presentation_blocks_insert_own on apresenta_mais.presentation_blocks;
create policy presentation_blocks_insert_own
on apresenta_mais.presentation_blocks for insert
to authenticated
with check (
  exists (
    select 1
    from apresenta_mais.presentations p
    where p.id = presentation_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists presentation_blocks_update_own on apresenta_mais.presentation_blocks;
create policy presentation_blocks_update_own
on apresenta_mais.presentation_blocks for update
to authenticated
using (
  exists (
    select 1
    from apresenta_mais.presentations p
    where p.id = presentation_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from apresenta_mais.presentations p
    where p.id = presentation_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists presentation_blocks_delete_own on apresenta_mais.presentation_blocks;
create policy presentation_blocks_delete_own
on apresenta_mais.presentation_blocks for delete
to authenticated
using (
  exists (
    select 1
    from apresenta_mais.presentations p
    where p.id = presentation_id
      and p.user_id = auth.uid()
  )
);

revoke all on
  apresenta_mais.presentation_types,
  apresenta_mais.presentation_objectives,
  apresenta_mais.communication_styles,
  apresenta_mais.presentation_themes,
  apresenta_mais.block_types,
  apresenta_mais.presentations,
  apresenta_mais.presentation_blocks
from anon;

grant select, insert, update, delete on
  apresenta_mais.presentation_types,
  apresenta_mais.presentation_objectives,
  apresenta_mais.communication_styles,
  apresenta_mais.presentation_themes,
  apresenta_mais.block_types
to authenticated;

grant select, insert, update, delete on
  apresenta_mais.presentations,
  apresenta_mais.presentation_blocks
to authenticated;

-- Catálogos mínimos para o app funcionar sem depender do Base44.
insert into apresenta_mais.presentation_types
  (name, description, icon, color, active, order_index)
values
  ('Palestra', 'Apresentação para palestras, eventos e encontros.', 'Presentation', '#4F46E5', true, 10),
  ('Pregação', 'Estrutura para mensagens, sermões e estudos.', 'BookOpen', '#7C3AED', true, 20),
  ('Aula', 'Apresentação didática para ensinar um conteúdo.', 'GraduationCap', '#2563EB', true, 30),
  ('Reunião', 'Estrutura objetiva para reuniões e alinhamentos.', 'Users', '#059669', true, 40),
  ('Livre', 'Comece sem um formato obrigatório.', 'Sparkles', '#6B7280', true, 50)
on conflict (name) do nothing;

insert into apresenta_mais.presentation_objectives
  (name, description, icon, active, order_index)
values
  ('Ensinar', 'Explicar um assunto com clareza.', 'GraduationCap', true, 10),
  ('Inspirar', 'Motivar e gerar reflexão.', 'Sparkles', true, 20),
  ('Convencer', 'Apresentar argumentos e conduzir a uma decisão.', 'Target', true, 30),
  ('Informar', 'Organizar e transmitir informações importantes.', 'Info', true, 40),
  ('Conduzir', 'Guiar uma reunião, estudo ou atividade.', 'Route', true, 50)
on conflict (name) do nothing;

insert into apresenta_mais.communication_styles
  (name, description, active, order_index)
values
  ('Claro e direto', 'Frases objetivas e estrutura fácil de acompanhar.', true, 10),
  ('Didático', 'Explicações progressivas, exemplos e reforços.', true, 20),
  ('Inspirador', 'Tom motivador e emocional sem perder a clareza.', true, 30),
  ('Conversacional', 'Linguagem natural e próxima do público.', true, 40)
on conflict (name) do nothing;

insert into apresenta_mais.presentation_themes
  (name, description, background_color, text_color, title_color, accent_color, is_official, active)
values
  ('Apresenta+ Claro', 'Tema claro e limpo para qualquer contexto.', '#FFFFFF', '#334155', '#0F172A', '#4F46E5', true, true),
  ('Apresenta+ Escuro', 'Tema escuro para ambientes com pouca luz.', '#0F172A', '#E2E8F0', '#FFFFFF', '#818CF8', true, true)
on conflict (name) do nothing;

insert into apresenta_mais.block_types
  (name, code, description, icon, supports_title, supports_summary, supports_content, supports_notes, supports_attachment, active, order_index)
values
  ('Abertura', 'opening', 'Introdução, conexão com o público e apresentação do tema.', 'Play', true, true, true, true, true, true, 10),
  ('Tópico', 'topic', 'Parte principal da apresentação.', 'ListTree', true, true, true, true, true, true, 20),
  ('Exemplo', 'example', 'Exemplo, história ou ilustração que torna a ideia concreta.', 'Lightbulb', true, true, true, true, true, true, 30),
  ('Aplicação', 'application', 'Ação prática ou próximo passo para o público.', 'Target', true, true, true, true, true, true, 40),
  ('Conclusão', 'conclusion', 'Fechamento e reforço da mensagem principal.', 'CircleCheck', true, true, true, true, true, true, 50)
on conflict (code) do nothing;

notify pgrst, 'reload schema';

commit;
