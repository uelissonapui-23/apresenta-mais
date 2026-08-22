# Apresenta+ — Coleta, Editor e Apresentador V1

## 1. Nova área Coleta

Fluxo novo pensado para palestra, aula, reunião, estudo e pesquisa.

- Nova rota `/capture` e item **Coleta** no menu principal.
- Várias coletas independentes por usuário.
- Título, origem e palestrante/autor opcionais.
- Entrada rápida de notas com atalho Ctrl/Cmd + Enter.
- Classificação simples: Ponto principal, Ideia, Citação, Exemplo, Pergunta e Pesquisar depois.
- Busca local nas anotações.
- Seleção múltipla.
- Transformação das notas selecionadas em uma apresentação editável.
- As notas originais permanecem salvas e recebem marcação de que já foram reaproveitadas.

## 2. Construtor de apresentação

A lógica existente foi preservada. A mudança é principalmente de hierarquia visual.

- Área útil ampliada de `max-w-5xl` para `max-w-7xl`.
- Modos renomeados para verbos mais naturais: Organizar, Escrever, Visualizar e Roteiro.
- Cada modo mostra uma pequena explicação visual.
- Métricas deixaram de ocupar quatro cards grandes e viraram uma faixa de resumo discreta.
- Mais espaçamento entre os conteúdos para reduzir sensação de formulário compacto.

## 3. Modo Apresentador

A sessão, progresso, atalhos, salvamento, notas e navegação existentes foram preservados.

- Conteúdo atual passou a ocupar um palco visual próprio.
- Em telas grandes existe um painel lateral discreto **A seguir**.
- O painel mostra próximo tópico, resumo e duração estimada quando disponível.
- Notas do apresentador podem ser abertas pelo painel lateral.
- Em celular/tablet o comportamento antigo de “Próximo” continua compacto, evitando perda de espaço.

## Segurança e compatibilidade

- Schema usado: `apresenta_mais`.
- Nenhum schema de outro aplicativo é tocado.
- Novas tabelas usam `auth.uid()` e RLS.
- `anon` não recebe acesso às novas tabelas.
- Não houve alteração destrutiva em apresentações, blocos ou sessões existentes.
