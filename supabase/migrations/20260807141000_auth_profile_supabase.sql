begin;

alter table apresenta_mais.profiles
  add column if not exists phone text;

-- Evita política recursiva e impede que o próprio usuário eleve seu papel.
drop policy if exists profiles_update_own on apresenta_mais.profiles;
create policy profiles_update_own
on apresenta_mais.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

revoke update on apresenta_mais.profiles from authenticated;
grant update (full_name, avatar_url, phone, onboarding_completed) on apresenta_mais.profiles to authenticated;

create or replace function apresenta_mais.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = apresenta_mais, public
as $$
begin
  insert into apresenta_mais.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists apresenta_mais_create_profile on auth.users;
create trigger apresenta_mais_create_profile
after insert on auth.users
for each row execute function apresenta_mais.handle_new_user();

-- Garante perfil para usuários que já existam no Auth antes desta migration.
insert into apresenta_mais.profiles (id, full_name)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')
from auth.users u
on conflict (id) do nothing;

notify pgrst, 'reload schema';
commit;
