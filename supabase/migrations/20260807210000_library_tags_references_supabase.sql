begin;

create extension if not exists pgcrypto;
create schema if not exists apresenta_mais;
grant usage on schema apresenta_mais to authenticated;

create table if not exists apresenta_mais.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null default 'citation'
    check (item_type in (
      'citation','story','example','reference','application','question','block'
    )),
  title text not null,
  summary text not null default '',
  content text not null default '',
  source text not null default '',
  tags text not null default '',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists apresenta_mais.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#3B82F6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists apresenta_mais.presentation_tags (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null
    references apresenta_mais.presentations(id) on delete cascade,
  tag_id uuid not null
    references apresenta_mais.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (presentation_id, tag_id)
);

create table if not exists apresenta_mais.block_attachments (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null
    references apresenta_mais.presentation_blocks(id) on delete cascade,
  attachment_type text not null
    check (attachment_type in ('image','video','audio','document','link')),
  file_url text not null default '',
  thumbnail_url text not null default '',
  title text not null default '',
  description text not null default '',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists apresenta_mais.block_references (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null
    references apresenta_mais.presentation_blocks(id) on delete cascade,
  reference_type text not null default '',
  title text not null,
  reference_text text not null default '',
  source text not null default '',
  url text not null default '',
  metadata_json text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists library_items_user_updated_idx
  on apresenta_mais.library_items(user_id, updated_at desc);

create index if not exists library_items_user_favorite_idx
  on apresenta_mais.library_items(user_id, is_favorite);

create index if not exists tags_user_name_idx
  on apresenta_mais.tags(user_id, name);

create index if not exists presentation_tags_presentation_idx
  on apresenta_mais.presentation_tags(presentation_id);

create index if not exists presentation_tags_tag_idx
  on apresenta_mais.presentation_tags(tag_id);

create index if not exists block_attachments_block_order_idx
  on apresenta_mais.block_attachments(block_id, order_index);

create index if not exists block_references_block_idx
  on apresenta_mais.block_references(block_id, created_at desc);

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'library_items',
    'tags',
    'presentation_tags',
    'block_attachments',
    'block_references'
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

alter table apresenta_mais.library_items enable row level security;
alter table apresenta_mais.tags enable row level security;
alter table apresenta_mais.presentation_tags enable row level security;
alter table apresenta_mais.block_attachments enable row level security;
alter table apresenta_mais.block_references enable row level security;

-- Biblioteca: somente o dono.
drop policy if exists library_items_select_own on apresenta_mais.library_items;
create policy library_items_select_own
on apresenta_mais.library_items for select to authenticated
using (user_id = auth.uid());

drop policy if exists library_items_insert_own on apresenta_mais.library_items;
create policy library_items_insert_own
on apresenta_mais.library_items for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists library_items_update_own on apresenta_mais.library_items;
create policy library_items_update_own
on apresenta_mais.library_items for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists library_items_delete_own on apresenta_mais.library_items;
create policy library_items_delete_own
on apresenta_mais.library_items for delete to authenticated
using (user_id = auth.uid());

-- Tags: somente o dono.
drop policy if exists tags_select_own on apresenta_mais.tags;
create policy tags_select_own
on apresenta_mais.tags for select to authenticated
using (user_id = auth.uid());

drop policy if exists tags_insert_own on apresenta_mais.tags;
create policy tags_insert_own
on apresenta_mais.tags for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists tags_update_own on apresenta_mais.tags;
create policy tags_update_own
on apresenta_mais.tags for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists tags_delete_own on apresenta_mais.tags;
create policy tags_delete_own
on apresenta_mais.tags for delete to authenticated
using (user_id = auth.uid());

-- Vínculo apresentação/tag: a apresentação e a tag precisam pertencer ao usuário.
drop policy if exists presentation_tags_select_own on apresenta_mais.presentation_tags;
create policy presentation_tags_select_own
on apresenta_mais.presentation_tags for select to authenticated
using (
  exists (
    select 1 from apresenta_mais.presentations p
    where p.id = presentation_id and p.user_id = auth.uid()
  )
  and exists (
    select 1 from apresenta_mais.tags t
    where t.id = tag_id and t.user_id = auth.uid()
  )
);

drop policy if exists presentation_tags_insert_own on apresenta_mais.presentation_tags;
create policy presentation_tags_insert_own
on apresenta_mais.presentation_tags for insert to authenticated
with check (
  exists (
    select 1 from apresenta_mais.presentations p
    where p.id = presentation_id and p.user_id = auth.uid()
  )
  and exists (
    select 1 from apresenta_mais.tags t
    where t.id = tag_id and t.user_id = auth.uid()
  )
);

drop policy if exists presentation_tags_delete_own on apresenta_mais.presentation_tags;
create policy presentation_tags_delete_own
on apresenta_mais.presentation_tags for delete to authenticated
using (
  exists (
    select 1 from apresenta_mais.presentations p
    where p.id = presentation_id and p.user_id = auth.uid()
  )
  and exists (
    select 1 from apresenta_mais.tags t
    where t.id = tag_id and t.user_id = auth.uid()
  )
);

-- Helper lógico repetido nas policies dos anexos/referências:
-- bloco -> apresentação -> dono autenticado.
drop policy if exists block_attachments_select_own on apresenta_mais.block_attachments;
create policy block_attachments_select_own
on apresenta_mais.block_attachments for select to authenticated
using (
  exists (
    select 1
    from apresenta_mais.presentation_blocks b
    join apresenta_mais.presentations p on p.id = b.presentation_id
    where b.id = block_id and p.user_id = auth.uid()
  )
);

drop policy if exists block_attachments_insert_own on apresenta_mais.block_attachments;
create policy block_attachments_insert_own
on apresenta_mais.block_attachments for insert to authenticated
with check (
  exists (
    select 1
    from apresenta_mais.presentation_blocks b
    join apresenta_mais.presentations p on p.id = b.presentation_id
    where b.id = block_id and p.user_id = auth.uid()
  )
);

drop policy if exists block_attachments_update_own on apresenta_mais.block_attachments;
create policy block_attachments_update_own
on apresenta_mais.block_attachments for update to authenticated
using (
  exists (
    select 1
    from apresenta_mais.presentation_blocks b
    join apresenta_mais.presentations p on p.id = b.presentation_id
    where b.id = block_id and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from apresenta_mais.presentation_blocks b
    join apresenta_mais.presentations p on p.id = b.presentation_id
    where b.id = block_id and p.user_id = auth.uid()
  )
);

drop policy if exists block_attachments_delete_own on apresenta_mais.block_attachments;
create policy block_attachments_delete_own
on apresenta_mais.block_attachments for delete to authenticated
using (
  exists (
    select 1
    from apresenta_mais.presentation_blocks b
    join apresenta_mais.presentations p on p.id = b.presentation_id
    where b.id = block_id and p.user_id = auth.uid()
  )
);

drop policy if exists block_references_select_own on apresenta_mais.block_references;
create policy block_references_select_own
on apresenta_mais.block_references for select to authenticated
using (
  exists (
    select 1
    from apresenta_mais.presentation_blocks b
    join apresenta_mais.presentations p on p.id = b.presentation_id
    where b.id = block_id and p.user_id = auth.uid()
  )
);

drop policy if exists block_references_insert_own on apresenta_mais.block_references;
create policy block_references_insert_own
on apresenta_mais.block_references for insert to authenticated
with check (
  exists (
    select 1
    from apresenta_mais.presentation_blocks b
    join apresenta_mais.presentations p on p.id = b.presentation_id
    where b.id = block_id and p.user_id = auth.uid()
  )
);

drop policy if exists block_references_update_own on apresenta_mais.block_references;
create policy block_references_update_own
on apresenta_mais.block_references for update to authenticated
using (
  exists (
    select 1
    from apresenta_mais.presentation_blocks b
    join apresenta_mais.presentations p on p.id = b.presentation_id
    where b.id = block_id and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from apresenta_mais.presentation_blocks b
    join apresenta_mais.presentations p on p.id = b.presentation_id
    where b.id = block_id and p.user_id = auth.uid()
  )
);

drop policy if exists block_references_delete_own on apresenta_mais.block_references;
create policy block_references_delete_own
on apresenta_mais.block_references for delete to authenticated
using (
  exists (
    select 1
    from apresenta_mais.presentation_blocks b
    join apresenta_mais.presentations p on p.id = b.presentation_id
    where b.id = block_id and p.user_id = auth.uid()
  )
);

revoke all on
  apresenta_mais.library_items,
  apresenta_mais.tags,
  apresenta_mais.presentation_tags,
  apresenta_mais.block_attachments,
  apresenta_mais.block_references
from anon;

grant select, insert, update, delete on
  apresenta_mais.library_items,
  apresenta_mais.tags,
  apresenta_mais.presentation_tags,
  apresenta_mais.block_attachments,
  apresenta_mais.block_references
to authenticated;

notify pgrst, 'reload schema';

commit;
