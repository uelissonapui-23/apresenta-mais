import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

const requiredFiles = [
  'src/main.jsx',
  'src/App.jsx',
  'src/pages/Capture.jsx',
  'src/pages/PresentationEditor.jsx',
  'src/pages/PresentMode.jsx',
  'src/components/editor/ViewHybrid.jsx',
  'supabase/migrations/20260822180000_capture_notes_workflow.sql',
  '.github/workflows/deploy-supabase-production.yml',
  'scripts/apply-apresenta-migrations.sh',
];

for (const file of requiredFiles) {
  if (!exists(file)) {
    fail(`Arquivo obrigatório ausente: ${file}`);
  }
}

const migrationsDir = path.join(root, 'supabase', 'migrations');
if (!fs.existsSync(migrationsDir)) {
  fail('Diretório supabase/migrations não encontrado.');
} else {
  const migrations = fs.readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  const foreignMigrations = migrations.filter((name) => (
    /class_manager|bingo|confirma/i.test(name)
  ));

  if (foreignMigrations.length > 0) {
    fail(
      `Migrations de outro aplicativo encontradas: ${foreignMigrations.join(', ')}`,
    );
  }

  const duplicateVersions = migrations
    .map((name) => name.slice(0, 14))
    .filter((version, index, versions) => versions.indexOf(version) !== index);

  if (duplicateVersions.length > 0) {
    fail(`Versões de migration duplicadas: ${[...new Set(duplicateVersions)].join(', ')}`);
  }
}

const tempDir = path.join(root, 'supabase', '.temp');
if (fs.existsSync(tempDir)) {
  warn('supabase/.temp existe localmente. Ele está ignorado pelo Git e pode ser removido quando quiser.');
}

const scanRoots = ['src', 'scripts', '.github'];
const textExtensions = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx', '.yml', '.yaml', '.json']);
const conflictPattern = /^(<{7}|={7}|>{7})/m;
const secretPatterns = [
  /SUPABASE_DB_URL\s*=\s*['\"][^$]/i,
  /service_role\s*[:=]\s*['\"][A-Za-z0-9._-]{20,}/i,
  /postgres(?:ql)?:\/\/[^\s'\"]+:[^\s'\"]+@/i,
];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (textExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

for (const scanRoot of scanRoots) {
  for (const filePath of walk(path.join(root, scanRoot))) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relative = path.relative(root, filePath);

    if (conflictPattern.test(content)) {
      fail(`Marcador de conflito Git encontrado em ${relative}`);
    }

    for (const pattern of secretPatterns) {
      if (pattern.test(content)) {
        fail(`Possível segredo gravado diretamente em ${relative}`);
      }
    }
  }
}

if (warnings.length > 0) {
  console.log('\nAvisos de preparação para release:');
  for (const message of warnings) {
    console.log(`- ${message}`);
  }
}

if (failures.length > 0) {
  console.error('\nFalhas de preparação para release:');
  for (const message of failures) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log('\n✓ Estrutura crítica presente.');
console.log('✓ Migrations do Apresenta+ isoladas.');
console.log('✓ Nenhum conflito Git detectado.');
console.log('✓ Nenhum segredo óbvio encontrado no código versionável.');
console.log('✓ Verificação de preparação para release concluída.');
