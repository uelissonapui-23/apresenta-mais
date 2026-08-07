begin;

create extension if not exists pgcrypto;
create schema if not exists apresenta_mais;
grant usage on schema apresenta_mais to authenticated;

create table if not exists apresenta_mais.presentation_templates (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  presentation_type_id uuid
    references apresenta_mais.presentation_types(id) on delete set null,
  objective_id uuid
    references apresenta_mais.presentation_objectives(id) on delete set null,
  communication_style_id uuid
    references apresenta_mais.communication_styles(id) on delete set null,
  name text not null,
  description text not null default '',
  thumbnail_url text not null default '',
  is_official boolean not null default false,
  is_public boolean not null default true,
  is_premium boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists apresenta_mais.template_blocks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null
    references apresenta_mais.presentation_templates(id) on delete cascade,
  parent_id uuid
    references apresenta_mais.template_blocks(id) on delete cascade,
  block_type_id uuid
    references apresenta_mais.block_types(id) on delete set null,
  title text not null,
  summary text not null default '',
  content text not null default '',
  additional_content text not null default '',
  presenter_notes text not null default '',
  order_index numeric not null default 0,
  depth_level integer not null default 0,
  importance_level integer not null default 3
    check (importance_level between 1 and 5),
  estimated_duration_seconds integer not null default 60
    check (estimated_duration_seconds >= 0),
  is_essential boolean not null default false,
  is_hidden boolean not null default false,
  show_to_audience boolean not null default true,
  icon text not null default '',
  background_style text not null default '',
  text_style text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists apresenta_mais.presentation_versions (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null
    references apresenta_mais.presentations(id) on delete cascade,
  version_number integer not null default 1 check (version_number > 0),
  snapshot_json text not null default '',
  change_summary text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (presentation_id, version_number)
);

create index if not exists presentation_templates_visibility_idx
  on apresenta_mais.presentation_templates(active, is_official, is_public);

create index if not exists presentation_templates_owner_idx
  on apresenta_mais.presentation_templates(owner_user_id, updated_at desc);

create index if not exists template_blocks_template_order_idx
  on apresenta_mais.template_blocks(template_id, order_index);

create index if not exists template_blocks_parent_idx
  on apresenta_mais.template_blocks(parent_id);

create index if not exists presentation_versions_presentation_idx
  on apresenta_mais.presentation_versions(presentation_id, version_number desc);

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'presentation_templates',
    'template_blocks',
    'presentation_versions'
  ]
  loop
    execute format(
      'drop trigger if exists %I_set_updated_at on apresenta_mais.%I',
      target_table, target_table
    );
    execute format(
      'create trigger %I_set_updated_at before update on apresenta_mais.%I
       for each row execute function apresenta_mais.set_updated_at()',
      target_table, target_table
    );
  end loop;
end $$;

alter table apresenta_mais.presentation_templates enable row level security;
alter table apresenta_mais.template_blocks enable row level security;
alter table apresenta_mais.presentation_versions enable row level security;

-- Modelos: públicos/oficiais para qualquer autenticado; privados somente ao dono.
drop policy if exists presentation_templates_select_visible
  on apresenta_mais.presentation_templates;
create policy presentation_templates_select_visible
on apresenta_mais.presentation_templates
for select to authenticated
using (
  is_official
  or is_public
  or owner_user_id = auth.uid()
  or apresenta_mais.is_admin()
);

drop policy if exists presentation_templates_insert_owner_or_admin
  on apresenta_mais.presentation_templates;
create policy presentation_templates_insert_owner_or_admin
on apresenta_mais.presentation_templates
for insert to authenticated
with check (
  apresenta_mais.is_admin()
  or (
    owner_user_id = auth.uid()
    and is_official = false
  )
);

drop policy if exists presentation_templates_update_owner_or_admin
  on apresenta_mais.presentation_templates;
create policy presentation_templates_update_owner_or_admin
on apresenta_mais.presentation_templates
for update to authenticated
using (
  apresenta_mais.is_admin()
  or owner_user_id = auth.uid()
)
with check (
  apresenta_mais.is_admin()
  or (
    owner_user_id = auth.uid()
    and is_official = false
  )
);

drop policy if exists presentation_templates_delete_owner_or_admin
  on apresenta_mais.presentation_templates;
create policy presentation_templates_delete_owner_or_admin
on apresenta_mais.presentation_templates
for delete to authenticated
using (
  apresenta_mais.is_admin()
  or owner_user_id = auth.uid()
);

-- Blocos do modelo herdam a visibilidade/permissão do modelo.
drop policy if exists template_blocks_select_visible
  on apresenta_mais.template_blocks;
create policy template_blocks_select_visible
on apresenta_mais.template_blocks
for select to authenticated
using (
  exists (
    select 1
    from apresenta_mais.presentation_templates t
    where t.id = template_id
      and (
        t.is_official
        or t.is_public
        or t.owner_user_id = auth.uid()
        or apresenta_mais.is_admin()
      )
  )
);

drop policy if exists template_blocks_insert_owner_or_admin
  on apresenta_mais.template_blocks;
create policy template_blocks_insert_owner_or_admin
on apresenta_mais.template_blocks
for insert to authenticated
with check (
  exists (
    select 1
    from apresenta_mais.presentation_templates t
    where t.id = template_id
      and (
        apresenta_mais.is_admin()
        or t.owner_user_id = auth.uid()
      )
  )
);

drop policy if exists template_blocks_update_owner_or_admin
  on apresenta_mais.template_blocks;
create policy template_blocks_update_owner_or_admin
on apresenta_mais.template_blocks
for update to authenticated
using (
  exists (
    select 1
    from apresenta_mais.presentation_templates t
    where t.id = template_id
      and (
        apresenta_mais.is_admin()
        or t.owner_user_id = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from apresenta_mais.presentation_templates t
    where t.id = template_id
      and (
        apresenta_mais.is_admin()
        or t.owner_user_id = auth.uid()
      )
  )
);

drop policy if exists template_blocks_delete_owner_or_admin
  on apresenta_mais.template_blocks;
create policy template_blocks_delete_owner_or_admin
on apresenta_mais.template_blocks
for delete to authenticated
using (
  exists (
    select 1
    from apresenta_mais.presentation_templates t
    where t.id = template_id
      and (
        apresenta_mais.is_admin()
        or t.owner_user_id = auth.uid()
      )
  )
);

-- Histórico: somente versões das próprias apresentações.
drop policy if exists presentation_versions_select_own
  on apresenta_mais.presentation_versions;
create policy presentation_versions_select_own
on apresenta_mais.presentation_versions
for select to authenticated
using (
  exists (
    select 1
    from apresenta_mais.presentations p
    where p.id = presentation_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists presentation_versions_insert_own
  on apresenta_mais.presentation_versions;
create policy presentation_versions_insert_own
on apresenta_mais.presentation_versions
for insert to authenticated
with check (
  (created_by is null or created_by = auth.uid())
  and exists (
    select 1
    from apresenta_mais.presentations p
    where p.id = presentation_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists presentation_versions_delete_own
  on apresenta_mais.presentation_versions;
create policy presentation_versions_delete_own
on apresenta_mais.presentation_versions
for delete to authenticated
using (
  exists (
    select 1
    from apresenta_mais.presentations p
    where p.id = presentation_id
      and p.user_id = auth.uid()
  )
);

revoke all on
  apresenta_mais.presentation_templates,
  apresenta_mais.template_blocks,
  apresenta_mais.presentation_versions
from anon;

grant select, insert, update, delete on
  apresenta_mais.presentation_templates,
  apresenta_mais.template_blocks,
  apresenta_mais.presentation_versions
to authenticated;

-- Modelos oficiais simples para o app continuar útil sem dados antigos do Base44.
do $$
declare
  palestra_id uuid;
  pregacao_id uuid;
  aula_id uuid;
  objetivo_inspirar uuid;
  objetivo_ensinar uuid;
  estilo_claro uuid;
  abertura_id uuid;
  topico_id uuid;
  aplicacao_id uuid;
  conclusao_id uuid;
  template_id uuid;
begin
  select id into palestra_id
  from apresenta_mais.presentation_types
  where name = 'Palestra'
  order by created_at
  limit 1;

  select id into pregacao_id
  from apresenta_mais.presentation_types
  where name = 'Pregação'
  order by created_at
  limit 1;

  select id into aula_id
  from apresenta_mais.presentation_types
  where name = 'Aula'
  order by created_at
  limit 1;

  select id into objetivo_inspirar
  from apresenta_mais.presentation_objectives
  where name = 'Inspirar'
  order by created_at
  limit 1;

  select id into objetivo_ensinar
  from apresenta_mais.presentation_objectives
  where name = 'Ensinar'
  order by created_at
  limit 1;

  select id into estilo_claro
  from apresenta_mais.communication_styles
  where name = 'Claro e direto'
  order by created_at
  limit 1;

  select id into abertura_id
  from apresenta_mais.block_types
  where code = 'opening'
  limit 1;

  select id into topico_id
  from apresenta_mais.block_types
  where code = 'topic'
  limit 1;

  select id into aplicacao_id
  from apresenta_mais.block_types
  where code = 'application'
  limit 1;

  select id into conclusao_id
  from apresenta_mais.block_types
  where code = 'conclusion'
  limit 1;

  if not exists (
    select 1 from apresenta_mais.presentation_templates
    where name = 'Palestra essencial' and is_official = true
  ) then
    insert into apresenta_mais.presentation_templates (
      presentation_type_id, objective_id, communication_style_id,
      name, description, is_official, is_public, is_premium, active
    ) values (
      palestra_id, objetivo_inspirar, estilo_claro,
      'Palestra essencial',
      'Estrutura curta para abrir, desenvolver ideias e concluir com clareza.',
      true, true, false, true
    )
    returning id into template_id;

    insert into apresenta_mais.template_blocks
      (template_id, block_type_id, title, summary, order_index, depth_level, importance_level, estimated_duration_seconds, is_essential)
    values
      (template_id, abertura_id, 'Abertura', 'Conecte-se com o público e apresente a ideia central.', 10, 0, 5, 120, true),
      (template_id, topico_id, 'Ideia principal', 'Desenvolva o argumento ou conteúdo mais importante.', 20, 0, 5, 480, true),
      (template_id, topico_id, 'Segundo ponto', 'Amplie a mensagem com um novo ângulo ou exemplo.', 30, 0, 4, 420, true),
      (template_id, aplicacao_id, 'Aplicação', 'Mostre o que o público pode fazer com o que ouviu.', 40, 0, 5, 240, true),
      (template_id, conclusao_id, 'Conclusão', 'Reforce a mensagem e feche com um próximo passo.', 50, 0, 5, 180, true);
  end if;

  if not exists (
    select 1 from apresenta_mais.presentation_templates
    where name = 'Pregação simples' and is_official = true
  ) then
    insert into apresenta_mais.presentation_templates (
      presentation_type_id, objective_id, communication_style_id,
      name, description, is_official, is_public, is_premium, active
    ) values (
      pregacao_id, objetivo_inspirar, estilo_claro,
      'Pregação simples',
      'Abertura, texto/tema central, desenvolvimento, aplicação e conclusão.',
      true, true, false, true
    )
    returning id into template_id;

    insert into apresenta_mais.template_blocks
      (template_id, block_type_id, title, summary, order_index, depth_level, importance_level, estimated_duration_seconds, is_essential)
    values
      (template_id, abertura_id, 'Abertura', 'Apresente o tema e crie conexão.', 10, 0, 5, 180, true),
      (template_id, topico_id, 'Texto e ideia central', 'Explique a passagem ou princípio principal.', 20, 0, 5, 480, true),
      (template_id, topico_id, 'Desenvolvimento', 'Organize os aprendizados em pontos claros.', 30, 0, 4, 600, true),
      (template_id, aplicacao_id, 'Aplicação', 'Leve a mensagem para a vida prática.', 40, 0, 5, 300, true),
      (template_id, conclusao_id, 'Conclusão', 'Resuma e conduza a uma resposta.', 50, 0, 5, 180, true);
  end if;

  if not exists (
    select 1 from apresenta_mais.presentation_templates
    where name = 'Aula objetiva' and is_official = true
  ) then
    insert into apresenta_mais.presentation_templates (
      presentation_type_id, objective_id, communication_style_id,
      name, description, is_official, is_public, is_premium, active
    ) values (
      aula_id, objetivo_ensinar, estilo_claro,
      'Aula objetiva',
      'Estrutura didática para explicar, exemplificar, praticar e revisar.',
      true, true, false, true
    )
    returning id into template_id;

    insert into apresenta_mais.template_blocks
      (template_id, block_type_id, title, summary, order_index, depth_level, importance_level, estimated_duration_seconds, is_essential)
    values
      (template_id, abertura_id, 'Objetivo da aula', 'Explique o que será aprendido.', 10, 0, 5, 120, true),
      (template_id, topico_id, 'Conceito principal', 'Ensine o fundamento de forma progressiva.', 20, 0, 5, 600, true),
      (template_id, topico_id, 'Exemplo guiado', 'Transforme a explicação em algo concreto.', 30, 0, 4, 420, true),
      (template_id, aplicacao_id, 'Prática', 'Proponha uma aplicação ou exercício.', 40, 0, 5, 420, true),
      (template_id, conclusao_id, 'Revisão', 'Retome os pontos essenciais e próximos passos.', 50, 0, 5, 180, true);
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
