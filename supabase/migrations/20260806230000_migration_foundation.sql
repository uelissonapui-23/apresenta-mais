begin;

create extension if not exists pgcrypto;
create schema if not exists apresenta_mais;

grant usage on schema apresenta_mais to authenticated;

-- Perfil isolado do Apresenta+. Não altera public.profiles, que pode ser
-- compartilhado por outros aplicativos no mesmo projeto Supabase.
create table if not exists apresenta_mais.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  onboarding_completed boolean not null default false,
  account_status text not null default 'active' check (account_status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Preparação leve para monetização futura. Nenhum anúncio ou pagamento é ativado.
create table if not exists apresenta_mais.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  removes_ads boolean not null default false,
  supporter boolean not null default false,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists apresenta_mais.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references apresenta_mais.subscription_plans(id),
  status text not null default 'inactive'
    check (status in ('inactive', 'active', 'expired', 'cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

insert into apresenta_mais.subscription_plans (
  code,
  name,
  description,
  removes_ads,
  supporter,
  active
)
values
  ('free', 'Gratuito', 'Plano aberto do Apresenta+', false, false, true),
  ('no_ads', 'Sem anúncios', 'Preparado para ativação futura', true, false, false),
  ('supporter', 'Apoiador', 'Preparado para ativação futura', true, true, false)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  removes_ads = excluded.removes_ads,
  supporter = excluded.supporter;

create or replace function apresenta_mais.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = apresenta_mais, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on apresenta_mais.profiles;
create trigger profiles_set_updated_at
before update on apresenta_mais.profiles
for each row execute function apresenta_mais.set_updated_at();

drop trigger if exists subscription_plans_set_updated_at on apresenta_mais.subscription_plans;
create trigger subscription_plans_set_updated_at
before update on apresenta_mais.subscription_plans
for each row execute function apresenta_mais.set_updated_at();

drop trigger if exists user_subscriptions_set_updated_at on apresenta_mais.user_subscriptions;
create trigger user_subscriptions_set_updated_at
before update on apresenta_mais.user_subscriptions
for each row execute function apresenta_mais.set_updated_at();

alter table apresenta_mais.profiles enable row level security;
alter table apresenta_mais.subscription_plans enable row level security;
alter table apresenta_mais.user_subscriptions enable row level security;

drop policy if exists profiles_select_own on apresenta_mais.profiles;
create policy profiles_select_own
on apresenta_mais.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_insert_own on apresenta_mais.profiles;
create policy profiles_insert_own
on apresenta_mais.profiles for insert
to authenticated
with check (id = auth.uid() and role = 'user');

drop policy if exists profiles_update_own on apresenta_mais.profiles;
create policy profiles_update_own
on apresenta_mais.profiles for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (
    select current_profile.role
    from apresenta_mais.profiles as current_profile
    where current_profile.id = auth.uid()
  )
);

drop policy if exists subscription_plans_read_active on apresenta_mais.subscription_plans;
create policy subscription_plans_read_active
on apresenta_mais.subscription_plans for select
to authenticated
using (active = true);

drop policy if exists user_subscriptions_select_own on apresenta_mais.user_subscriptions;
create policy user_subscriptions_select_own
on apresenta_mais.user_subscriptions for select
to authenticated
using (user_id = auth.uid());

revoke all on all tables in schema apresenta_mais from anon;
revoke all on all sequences in schema apresenta_mais from anon;

grant select, insert, update on apresenta_mais.profiles to authenticated;
grant select on apresenta_mais.subscription_plans to authenticated;
grant select on apresenta_mais.user_subscriptions to authenticated;

-- Permite que o PostgREST enxergue imediatamente o novo schema e as tabelas.
notify pgrst, 'reload schema';

commit;
