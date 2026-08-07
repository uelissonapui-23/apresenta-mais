begin;

create schema if not exists apresenta_mais;
grant usage on schema apresenta_mais to authenticated;

-- Administradores podem visualizar perfis; usuários comuns continuam vendo apenas o próprio.
drop policy if exists profiles_select_admin on apresenta_mais.profiles;
create policy profiles_select_admin
on apresenta_mais.profiles for select
to authenticated
using (apresenta_mais.is_admin());

-- Protege role/status mesmo que as colunas precisem estar disponíveis para a tela administrativa.
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
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged_fields on apresenta_mais.profiles;
create trigger profiles_protect_privileged_fields
before update on apresenta_mais.profiles
for each row execute function apresenta_mais.protect_profile_privileged_fields();

drop policy if exists profiles_update_admin on apresenta_mais.profiles;
create policy profiles_update_admin
on apresenta_mais.profiles for update
to authenticated
using (apresenta_mais.is_admin())
with check (true);

grant update (
  full_name,
  avatar_url,
  phone,
  onboarding_completed,
  role,
  account_status
) on apresenta_mais.profiles to authenticated;

-- Bucket próprio do Apresenta+. Limite e formatos definidos no servidor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'apresenta-mais-files',
  'apresenta-mais-files',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "apresenta_mais_files_insert_own" on storage.objects;
create policy "apresenta_mais_files_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'apresenta-mais-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "apresenta_mais_files_update_own" on storage.objects;
create policy "apresenta_mais_files_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'apresenta-mais-files'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'apresenta-mais-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "apresenta_mais_files_delete_own" on storage.objects;
create policy "apresenta_mais_files_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'apresenta-mais-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
commit;
