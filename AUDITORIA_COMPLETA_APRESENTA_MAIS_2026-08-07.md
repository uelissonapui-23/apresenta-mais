# Auditoria completa — Apresenta+

Data: 07/08/2026
Base reconstruída: `APRESENTA MAIS(4).zip` + pacote de logo/responsividade + acabamento visual final.

## Resumo

A auditoria encontrou problemas reais de segurança/isolamento que não eram visíveis nos testes de interface. As correções desta entrega endurecem o Supabase no servidor, validam relações internas, tornam arquivos privados, bloqueiam links inseguros e limpam problemas estáticos/dependências.

## CRÍTICOS — corrigidos

### 1. Conta inativa ainda tinha acesso direto à API
O frontend bloqueava a navegação de uma conta marcada como inativa, mas as policies de várias tabelas verificavam somente `auth.uid()`. Uma sessão já emitida ainda poderia consultar/modificar os próprios dados diretamente no Data API.

Correção: criada `apresenta_mais.is_active_user()` e policies `AS RESTRICTIVE` em todas as tabelas pessoais/operacionais. Conta inativa agora é bloqueada também no banco.

### 2. Relações cruzadas entre apresentações/sessões
Campos como `presentation_blocks.parent_id`, `presentation_sessions.current_block_id` e `session_block_progress.block_id` possuíam FK, mas não garantiam que os dois registros pertenciam à mesma apresentação. Um UUID externo conhecido poderia criar relação cruzada e efeitos de cascata indesejados.

Correção: triggers de integridade validam que pai/bloco/sessão pertencem à mesma apresentação. Hierarquias também rejeitam auto-referência e ciclos.

### 3. Relações cruzadas em blocos de modelos
`template_blocks.parent_id` não garantia que o pai pertencia ao mesmo template.

Correção: trigger específico exige o mesmo `template_id` e rejeita ciclos.

## ALTOS — corrigidos

### 4. Bucket de arquivos era público
O bucket `apresenta-mais-files` tinha `public=true`. As escritas eram isoladas por pasta de usuário, mas qualquer pessoa com a URL poderia baixar o arquivo sem sessão.

Correção: bucket privado, policy SELECT por pasta do usuário e conta ativa. O serviço de upload deixou de usar `getPublicUrl` e passa a gerar URL assinada temporária.

### 5. Usuário comum podia publicar template para todos via API
A policy permitia que o dono de um template definisse `is_public=true`. Mesmo sem botão no frontend, uma chamada direta poderia inserir conteúdo na galeria compartilhada.

Correção: usuário comum só pode criar/editar template próprio privado. Conteúdo público precisa ser administrado por perfil admin.

### 6. Último administrador podia se desativar/demover
A interface tentava impedir, mas o banco não garantia essa regra.

Correção: trigger no perfil bloqueia a remoção/desativação do último administrador ativo.

### 7. URLs de anexos e referências aceitavam esquemas inseguros
O formulário exigia apenas texto não vazio e a visualização reutilizava o valor diretamente em `href`/`src`.

Correção: somente URLs `http://` ou `https://` são aceitas e renderizadas. Links inválidos não viram elementos clicáveis.

## QUALIDADE / BUILD — corrigidos

### 8. Lint tinha 30 erros
Foram encontrados imports não usados em editor, Home e várias telas administrativas.

Correção: todos removidos. `eslint . --quiet` passa sem erros.

### 9. `typecheck` estava mal configurado para um projeto JavaScript
`checkJs=true` tentava inferir tipos de todos os componentes JSX sem JSDoc/tipagem e gerava uma grande quantidade de falsos positivos. Além disso, `noEmit` não estava explícito.

Correção: `checkJs=false` e `noEmit=true`. O projeto continua validando sintaxe/estrutura pelo Vite/ESLint, sem fingir que JSX sem tipos é TypeScript tipado.

### 10. `.env.example` ainda ensinava configuração Base44
O runtime já era Supabase-only, mas o exemplo ainda dizia para usar `VITE_BACKEND_PROVIDER=base44` e `VITE_BASE44_APP_ID`.

Correção: `.env.example` agora contém somente Supabase e feature flags futuras.

### 11. Dependências instaladas sem qualquer import no código
Foram removidas dependências não utilizadas, incluindo Stripe, Three.js, React Leaflet, React Quill, jsPDF, html2canvas, Moment, Lodash, Zod, React Markdown e outras sem import no `src`. `tailwindcss-animate` foi preservado porque é usado no `tailwind.config.js`.

Benefício: pacote menor, instalação mais simples e menor superfície de vulnerabilidades/manutenção.

## VALIDAÇÕES EXECUTADAS

- Parser Babel em 141 arquivos JS/JSX/TS/TSX: OK.
- ESLint: OK, 0 erros.
- `tsc -p jsconfig.json`: OK com configuração coerente para projeto JS e `noEmit=true`.
- `git diff --check`: OK.
- Scanner de imports externos versus `package.json`: nenhuma dependência importada ficou ausente.
- `npm run check:security`: OK.
- Busca por `service_role`, chaves secretas e private keys no projeto: nenhuma encontrada.

## LIMITAÇÃO DO AMBIENTE DE AUDITORIA

O `vite build` completo não pôde ser executado neste Linux porque o ZIP trouxe `node_modules` do Windows e não contém o pacote nativo opcional `@rollup/rollup-linux-x64-gnu`. Isso é uma limitação do ambiente desta auditoria, não um erro de sintaxe do código. O build deve ser executado no Windows e no Vercel depois da extração.

O endpoint de `npm audit` do registry interno deste ambiente também não está disponível. Por isso não é possível afirmar aqui que não existe advisory CVE em dependências transitivas. A remoção das dependências não usadas reduz bastante a superfície, mas o `npm audit` final deve ser rodado no seu Windows.

## TESTE FINAL RECOMENDADO APÓS DEPLOY

1. login/cadastro/logout e recuperação de senha;
2. criação do zero e criação guiada;
3. edição, reordenação, anexos e referências;
4. duplicação e exclusão de apresentação;
5. ensaio e modo apresentação;
6. modelos, biblioteca, tags e temas;
7. perfil/configurações;
8. conta comum tentando abrir `/admin`;
9. admin desativando uma conta de teste e confirmando que ela perde acesso;
10. Console do navegador sem `/api/apps/undefined` nem erros 400/403 inesperados.
