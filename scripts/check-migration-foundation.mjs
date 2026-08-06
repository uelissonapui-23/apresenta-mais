import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  '.env.example',
  'vercel.json',
  'src/lib/backendConfig.js',
  'src/lib/supabaseClient.js',
  'src/services/data/backendProvider.js',
  'supabase/config.toml',
  'supabase/migrations/20260806230000_migration_foundation.sql',
  '.github/workflows/deploy-supabase-production.yml',
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length) {
  console.error(`Arquivos ausentes:\n- ${missing.join('\n- ')}`);
  process.exit(1);
}

const env = readFileSync('.env.example', 'utf8');
for (const key of [
  'VITE_BACKEND_PROVIDER',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_SCHEMA',
]) {
  if (!env.includes(key)) {
    console.error(`Variável ausente no .env.example: ${key}`);
    process.exit(1);
  }
}

const migration = readFileSync(
  'supabase/migrations/20260806230000_migration_foundation.sql',
  'utf8',
);

for (const expected of [
  'create schema if not exists apresenta_mais',
  'apresenta_mais.profiles',
  'enable row level security',
  'profiles_select_own',
  'apresenta_mais.subscription_plans',
  'apresenta_mais.user_subscriptions',
  "notify pgrst, 'reload schema'",
]) {
  if (!migration.toLowerCase().includes(expected.toLowerCase())) {
    console.error(`Estrutura ausente na migration: ${expected}`);
    process.exit(1);
  }
}

if (/create table if not exists\s+public\.profiles/i.test(migration)) {
  console.error('A migration não pode criar ou alterar public.profiles do projeto compartilhado.');
  process.exit(1);
}

const config = readFileSync('supabase/config.toml', 'utf8');
if (!config.includes('"apresenta_mais"')) {
  console.error('O schema apresenta_mais não está exposto em supabase/config.toml.');
  process.exit(1);
}

console.log('Base isolada do Apresenta+ para GitHub + Supabase + Vercel validada.');
