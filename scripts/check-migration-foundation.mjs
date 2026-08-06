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
  'enable row level security',
  'profiles_select_own',
  'subscription_plans',
  'user_subscriptions',
]) {
  if (!migration.toLowerCase().includes(expected.toLowerCase())) {
    console.error(`Estrutura ausente na migration: ${expected}`);
    process.exit(1);
  }
}

console.log('Base de migração GitHub + Supabase + Vercel validada.');
