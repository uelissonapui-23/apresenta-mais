import fs from 'node:fs';

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const presentMode = fs.readFileSync('src/pages/PresentMode.jsx', 'utf8');
const dialog = fs.readFileSync('src/components/ui/dialog.jsx', 'utf8');
const alertDialog = fs.readFileSync('src/components/ui/alert-dialog.jsx', 'utf8');
const capture = fs.readFileSync('src/pages/Capture.jsx', 'utf8');

// Regressão já encontrada em produção: o palco não pode ficar acima dos modais.
assert(
  presentMode.includes('fixed inset-0 z-40 flex min-h-[100dvh]'),
  'O palco do apresentador deve permanecer em z-40 para não bloquear dialogs/sheets.',
);
assert(dialog.includes('fixed inset-0 z-50'), 'Dialog deve permanecer acima do modo apresentador.');
assert(alertDialog.includes('fixed inset-0 z-50'), 'AlertDialog deve permanecer acima do modo apresentador.');

// Controles somente por ícone precisam ser compreensíveis por leitor de tela/tooltip.
assert(
  capture.includes('aria-label="Mais ações da anotação"'),
  'Menu de ações da coleta precisa de rótulo acessível.',
);
assert(
  presentMode.includes('aria-label="Diminuir tamanho do texto"')
    && presentMode.includes('aria-label="Aumentar tamanho do texto"'),
  'Controles de tamanho de texto do apresentador precisam de rótulos acessíveis.',
);

if (failures.length) {
  console.error('Falhas de segurança visual/responsiva:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Camadas críticas, controles acessíveis e regressões visuais validados.');
