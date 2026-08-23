-- Validação pós-release do Apresenta+ V1.
-- Somente leitura: não altera dados.

-- 1) Policies RESTRICTIVE da área de Coleta devem existir.
select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'apresenta_mais'
  and policyname in ('capture_sessions_active_account', 'capture_notes_active_account')
order by tablename, policyname;

-- 2) Funções SECURITY DEFINER devem usar search_path restrito.
select
  n.nspname as schema_name,
  p.proname as function_name,
  p.prosecdef as security_definer,
  p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'apresenta_mais'
  and p.proname in (
    'handle_new_user',
    'is_admin',
    'is_active_user',
    'protect_profile_privileged_fields',
    'validate_presentation_block_parent',
    'validate_session_current_block',
    'validate_session_block_progress',
    'validate_template_block_parent'
  )
order by p.proname;

-- 3) Bucket deve continuar privado.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'apresenta-mais-files';

-- 4) Histórico isolado deve registrar a migration final.
select version, applied_at
from apresenta_mais._migration_history
where version = '20260823020000_release_security_hardening.sql';
