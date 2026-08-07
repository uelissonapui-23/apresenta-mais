#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL não configurado}"

MIGRATIONS_DIR="supabase/migrations"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Diretório $MIGRATIONS_DIR não encontrado."
  exit 1
fi

echo "Preparando histórico isolado do Apresenta Mais..."

psql "$SUPABASE_DB_URL" \
  -v ON_ERROR_STOP=1 \
  -X <<'SQL'
create schema if not exists apresenta_mais;

create table if not exists apresenta_mais._migration_history (
  version text primary key,
  applied_at timestamptz not null default now()
);

revoke all on apresenta_mais._migration_history from public, anon, authenticated;
SQL

shopt -s nullglob
migration_files=("$MIGRATIONS_DIR"/*.sql)

if (( ${#migration_files[@]} == 0 )); then
  echo "Nenhuma migration SQL encontrada em $MIGRATIONS_DIR."
  exit 0
fi

IFS=$'\n' migration_files=($(printf '%s\n' "${migration_files[@]}" | sort))
unset IFS

for migration in "${migration_files[@]}"; do
  version="$(basename "$migration")"

  # Passa o nome da migration como literal SQL seguro via psql.
  already_applied="$(
    psql "$SUPABASE_DB_URL" \
      -v ON_ERROR_STOP=1 \
      -X \
      -tA \
      -v "migration_version=$version" \
      -c "select exists (
            select 1
            from apresenta_mais._migration_history
            where version = :'migration_version'
          );"
  )"

  if [[ "$already_applied" == "t" ]]; then
    echo "✓ $version já aplicada."
    continue
  fi

  echo "→ Aplicando $version..."

  psql "$SUPABASE_DB_URL" \
    -v ON_ERROR_STOP=1 \
    -X \
    -f "$migration"

  psql "$SUPABASE_DB_URL" \
    -v ON_ERROR_STOP=1 \
    -X \
    -v "migration_version=$version" \
    -c "insert into apresenta_mais._migration_history(version)
        values (:'migration_version')
        on conflict (version) do nothing;"

  echo "✓ $version aplicada e registrada."
done

echo "Migrations do Apresenta Mais concluídas."
