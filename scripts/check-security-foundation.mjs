import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const packageJson = JSON.parse(read('package.json'));
const allDependencies = {
  ...(packageJson.dependencies || {}),
  ...(packageJson.devDependencies || {}),
};

assert(!allDependencies['@base44/sdk'], 'SDK Base44 não deve estar instalado.');
assert(!allDependencies['@base44/vite-plugin'], 'Plugin Vite Base44 não deve estar instalado.');

const backendConfig = read('src/lib/backendConfig.js');
assert(backendConfig.includes("provider: 'supabase'"), 'Backend deve permanecer Supabase-only.');

const apiClient = read('src/api/base44Client.js');
assert(!apiClient.includes('/api/apps/'), 'Compatibilidade não pode chamar /api/apps/.');
assert(!apiClient.includes('@base44/'), 'Compatibilidade não pode importar SDK Base44.');

const storage = read('src/services/storageRepository.js');
assert(storage.includes('createSignedUrl'), 'Storage privado deve gerar URL assinada.');
assert(!storage.includes('getPublicUrl'), 'Storage do usuário não deve usar URL pública.');

const hardeningMigration = 'supabase/migrations/20260807234000_security_isolation_hardening.sql';
assert(fs.existsSync(path.join(root, hardeningMigration)), 'Migration de segurança/isolamento ausente.');
if (fs.existsSync(path.join(root, hardeningMigration))) {
  const sql = read(hardeningMigration);
  assert(sql.includes('is_active_user'), 'RLS deve bloquear contas inativas no servidor.');
  assert(sql.includes('as restrictive'), 'Policies de conta ativa devem ser restritivas.');
  assert(sql.includes('validate_presentation_block_parent'), 'Validação de hierarquia de blocos ausente.');
  assert(sql.includes("public = false"), 'Bucket de arquivos deve ser privado.');
}

const envExample = read('.env.example');
assert(!envExample.includes('VITE_BASE44_APP_ID'), '.env.example não deve orientar configuração Base44.');
assert(!envExample.includes('VITE_BACKEND_PROVIDER=base44'), '.env.example não deve ativar Base44.');

if (failures.length) {
  console.error('Falhas na fundação de segurança:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Fundação Supabase, isolamento e storage privado validados.');
