begin;

-- A área de Coleta foi criada depois do hardening geral de contas ativas.
-- Mantém a mesma garantia das demais entidades: conta inativa não acessa dados
-- mesmo que uma sessão JWT anterior ainda esteja válida.
drop policy if exists capture_sessions_active_account on apresenta_mais.capture_sessions;
create policy capture_sessions_active_account
on apresenta_mais.capture_sessions
as restrictive
for all
to authenticated
using (apresenta_mais.is_active_user())
with check (apresenta_mais.is_active_user());

drop policy if exists capture_notes_active_account on apresenta_mais.capture_notes;
create policy capture_notes_active_account
on apresenta_mais.capture_notes
as restrictive
for all
to authenticated
using (apresenta_mais.is_active_user())
with check (apresenta_mais.is_active_user());

-- SECURITY DEFINER não deve depender de objetos resolvidos no schema public.
-- Todas as referências sensíveis já são qualificadas por schema.
alter function apresenta_mais.handle_new_user()
  set search_path = pg_catalog, apresenta_mais;
alter function apresenta_mais.is_admin()
  set search_path = pg_catalog, apresenta_mais;
alter function apresenta_mais.is_active_user()
  set search_path = pg_catalog, apresenta_mais;
alter function apresenta_mais.protect_profile_privileged_fields()
  set search_path = pg_catalog, apresenta_mais;
alter function apresenta_mais.validate_presentation_block_parent()
  set search_path = pg_catalog, apresenta_mais;
alter function apresenta_mais.validate_session_current_block()
  set search_path = pg_catalog, apresenta_mais;
alter function apresenta_mais.validate_session_block_progress()
  set search_path = pg_catalog, apresenta_mais;
alter function apresenta_mais.validate_template_block_parent()
  set search_path = pg_catalog, apresenta_mais;

-- Funções de trigger/validação não precisam ser chamadas diretamente por clientes.
revoke all on function apresenta_mais.handle_new_user() from public, anon, authenticated;
revoke all on function apresenta_mais.protect_profile_privileged_fields() from public, anon, authenticated;
revoke all on function apresenta_mais.validate_presentation_block_parent() from public, anon, authenticated;
revoke all on function apresenta_mais.validate_session_current_block() from public, anon, authenticated;
revoke all on function apresenta_mais.validate_session_block_progress() from public, anon, authenticated;
revoke all on function apresenta_mais.validate_template_block_parent() from public, anon, authenticated;

-- Funções usadas pelas policies continuam executáveis apenas pelo usuário autenticado.
revoke all on function apresenta_mais.is_admin() from public, anon;
grant execute on function apresenta_mais.is_admin() to authenticated;
revoke all on function apresenta_mais.is_active_user() from public, anon;
grant execute on function apresenta_mais.is_active_user() to authenticated;

notify pgrst, 'reload schema';

commit;
