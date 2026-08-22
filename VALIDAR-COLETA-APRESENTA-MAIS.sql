select
  exists(select 1 from information_schema.tables where table_schema='apresenta_mais' and table_name='capture_sessions') as capture_sessions_ok,
  exists(select 1 from information_schema.tables where table_schema='apresenta_mais' and table_name='capture_notes') as capture_notes_ok,
  has_table_privilege('authenticated','apresenta_mais.capture_sessions','SELECT,INSERT,UPDATE,DELETE') as capture_sessions_privileges_ok,
  has_table_privilege('authenticated','apresenta_mais.capture_notes','SELECT,INSERT,UPDATE,DELETE') as capture_notes_privileges_ok;
