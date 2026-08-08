begin;

create schema if not exists apresenta_mais;

grant usage on schema apresenta_mais to authenticated;

-- ---------------------------------------------------------------------------
-- Conta ativa precisa ser requisito no servidor, não apenas no frontend.
-- ---------------------------------------------------------------------------
create or replace function apresenta_mais.is_active_user()
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
      and p.account_status = 'active'
  );
$$;

revoke all on function apresenta_mais.is_active_user() from public;
grant execute on function apresenta_mais.is_active_user() to authenticated;

-- Policies RESTRICTIVE são combinadas com as policies de propriedade existentes.
-- Dessa forma, uma conta inativa deixa de acessar dados do app mesmo usando a API
-- diretamente com uma sessão que ainda não expirou.
do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'user_preferences',
    'presentations',
    'presentation_blocks',
    'presentation_sessions',
    'session_block_progress',
    'guided_answers',
    'library_items',
    'tags',
    'presentation_tags',
    'block_attachments',
    'block_references',
    'presentation_templates',
    'template_blocks',
    'presentation_versions'
  ]
  loop
    execute format(
      'drop policy if exists %I_active_account on apresenta_mais.%I',
      target_table,
      target_table
    );

    execute format(
      'create policy %I_active_account on apresenta_mais.%I
       as restrictive
       for all
       to authenticated
       using (apresenta_mais.is_active_user())
       with check (apresenta_mais.is_active_user())',
      target_table,
      target_table
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Modelos públicos só podem ser publicados por administradores. Usuários
-- comuns podem manter cópias/modelos privados próprios, mas não injetar
-- conteúdo na galeria de todos os usuários via API direta.
-- ---------------------------------------------------------------------------
drop policy if exists presentation_templates_select_visible
  on apresenta_mais.presentation_templates;
create policy presentation_templates_select_visible
on apresenta_mais.presentation_templates
for select to authenticated
using (
  owner_user_id = auth.uid()
  or apresenta_mais.is_admin()
  or is_official
  or (
    is_public
    and exists (
      select 1
      from apresenta_mais.profiles owner_profile
      where owner_profile.id = owner_user_id
        and owner_profile.role = 'admin'
        and owner_profile.account_status = 'active'
    )
  )
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
    and is_public = false
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
    and is_public = false
  )
);

-- A leitura dos blocos deve obedecer exatamente à visibilidade do modelo.
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
        t.owner_user_id = auth.uid()
        or apresenta_mais.is_admin()
        or t.is_official
        or (
          t.is_public
          and exists (
            select 1
            from apresenta_mais.profiles owner_profile
            where owner_profile.id = t.owner_user_id
              and owner_profile.role = 'admin'
              and owner_profile.account_status = 'active'
          )
        )
      )
  )
);

-- Impede que a administração se tranque acidentalmente removendo/desativando
-- o último administrador ativo. Também mantém a proteção contra autoelevação.
create or replace function apresenta_mais.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = apresenta_mais, public
as $$
begin
  if (
    old.role is distinct from new.role
    or old.account_status is distinct from new.account_status
  ) and not apresenta_mais.is_admin() then
    raise exception 'Somente administradores podem alterar papel ou status da conta'
      using errcode = '42501';
  end if;

  if old.role = 'admin'
     and old.account_status = 'active'
     and (new.role is distinct from 'admin' or new.account_status is distinct from 'active')
     and not exists (
       select 1
       from apresenta_mais.profiles p
       where p.id <> old.id
         and p.role = 'admin'
         and p.account_status = 'active'
     ) then
    raise exception 'O sistema precisa manter pelo menos um administrador ativo'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function apresenta_mais.protect_profile_privileged_fields() from public;

-- ---------------------------------------------------------------------------
-- Integridade entre relações. Evita vínculos cruzados entre apresentações,
-- sessões ou templates diferentes, inclusive quando um UUID externo é conhecido.
-- ---------------------------------------------------------------------------
create or replace function apresenta_mais.validate_presentation_block_parent()
returns trigger
language plpgsql
security definer
set search_path = apresenta_mais, public
as $$
declare
  parent_presentation_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'Um bloco não pode ser pai de si mesmo'
      using errcode = '23514';
  end if;

  select b.presentation_id
    into parent_presentation_id
  from apresenta_mais.presentation_blocks b
  where b.id = new.parent_id;

  if parent_presentation_id is null
     or parent_presentation_id is distinct from new.presentation_id then
    raise exception 'O bloco pai deve pertencer à mesma apresentação'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and exists (
    with recursive ancestors as (
      select b.id, b.parent_id
      from apresenta_mais.presentation_blocks b
      where b.id = new.parent_id
      union
      select parent.id, parent.parent_id
      from apresenta_mais.presentation_blocks parent
      join ancestors a on parent.id = a.parent_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'A hierarquia de blocos não pode conter ciclos'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function apresenta_mais.validate_presentation_block_parent() from public;

drop trigger if exists presentation_blocks_validate_parent
  on apresenta_mais.presentation_blocks;
create trigger presentation_blocks_validate_parent
before insert or update of parent_id, presentation_id
on apresenta_mais.presentation_blocks
for each row execute function apresenta_mais.validate_presentation_block_parent();

create or replace function apresenta_mais.validate_session_current_block()
returns trigger
language plpgsql
security definer
set search_path = apresenta_mais, public
as $$
declare
  block_presentation_id uuid;
begin
  if new.current_block_id is null then
    return new;
  end if;

  select b.presentation_id
    into block_presentation_id
  from apresenta_mais.presentation_blocks b
  where b.id = new.current_block_id;

  if block_presentation_id is null
     or block_presentation_id is distinct from new.presentation_id then
    raise exception 'O bloco atual deve pertencer à apresentação da sessão'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function apresenta_mais.validate_session_current_block() from public;

drop trigger if exists presentation_sessions_validate_current_block
  on apresenta_mais.presentation_sessions;
create trigger presentation_sessions_validate_current_block
before insert or update of current_block_id, presentation_id
on apresenta_mais.presentation_sessions
for each row execute function apresenta_mais.validate_session_current_block();

create or replace function apresenta_mais.validate_session_block_progress()
returns trigger
language plpgsql
security definer
set search_path = apresenta_mais, public
as $$
declare
  session_presentation_id uuid;
  block_presentation_id uuid;
begin
  select s.presentation_id
    into session_presentation_id
  from apresenta_mais.presentation_sessions s
  where s.id = new.session_id;

  select b.presentation_id
    into block_presentation_id
  from apresenta_mais.presentation_blocks b
  where b.id = new.block_id;

  if session_presentation_id is null
     or block_presentation_id is null
     or session_presentation_id is distinct from block_presentation_id then
    raise exception 'O progresso deve apontar para um bloco da mesma apresentação da sessão'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function apresenta_mais.validate_session_block_progress() from public;

drop trigger if exists session_block_progress_validate_relation
  on apresenta_mais.session_block_progress;
create trigger session_block_progress_validate_relation
before insert or update of session_id, block_id
on apresenta_mais.session_block_progress
for each row execute function apresenta_mais.validate_session_block_progress();

create or replace function apresenta_mais.validate_template_block_parent()
returns trigger
language plpgsql
security definer
set search_path = apresenta_mais, public
as $$
declare
  parent_template_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'Um bloco de modelo não pode ser pai de si mesmo'
      using errcode = '23514';
  end if;

  select b.template_id
    into parent_template_id
  from apresenta_mais.template_blocks b
  where b.id = new.parent_id;

  if parent_template_id is null
     or parent_template_id is distinct from new.template_id then
    raise exception 'O bloco pai deve pertencer ao mesmo modelo'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and exists (
    with recursive ancestors as (
      select b.id, b.parent_id
      from apresenta_mais.template_blocks b
      where b.id = new.parent_id
      union
      select parent.id, parent.parent_id
      from apresenta_mais.template_blocks parent
      join ancestors a on parent.id = a.parent_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'A hierarquia do modelo não pode conter ciclos'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function apresenta_mais.validate_template_block_parent() from public;

drop trigger if exists template_blocks_validate_parent
  on apresenta_mais.template_blocks;
create trigger template_blocks_validate_parent
before insert or update of parent_id, template_id
on apresenta_mais.template_blocks
for each row execute function apresenta_mais.validate_template_block_parent();

-- ---------------------------------------------------------------------------
-- Storage privado por usuário.
-- ---------------------------------------------------------------------------
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'apresenta-mais-files',
  'apresenta-mais-files',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "apresenta_mais_files_select_own" on storage.objects;
create policy "apresenta_mais_files_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'apresenta-mais-files'
  and (storage.foldername(name))[1] = auth.uid()::text
  and apresenta_mais.is_active_user()
);

-- Recria write policies exigindo também conta ativa.
drop policy if exists "apresenta_mais_files_insert_own" on storage.objects;
create policy "apresenta_mais_files_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'apresenta-mais-files'
  and (storage.foldername(name))[1] = auth.uid()::text
  and apresenta_mais.is_active_user()
);

drop policy if exists "apresenta_mais_files_update_own" on storage.objects;
create policy "apresenta_mais_files_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'apresenta-mais-files'
  and (storage.foldername(name))[1] = auth.uid()::text
  and apresenta_mais.is_active_user()
)
with check (
  bucket_id = 'apresenta-mais-files'
  and (storage.foldername(name))[1] = auth.uid()::text
  and apresenta_mais.is_active_user()
);

drop policy if exists "apresenta_mais_files_delete_own" on storage.objects;
create policy "apresenta_mais_files_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'apresenta-mais-files'
  and (storage.foldername(name))[1] = auth.uid()::text
  and apresenta_mais.is_active_user()
);

notify pgrst, 'reload schema';

commit;
