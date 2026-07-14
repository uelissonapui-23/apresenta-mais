import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const SUPPORT_CONTACT = 'contato@apresentamais.app';

const LAST_UPDATED = '14 de julho de 2026';

const SECTIONS = [
  {
    id: 'controlador',
    title: 'Quem controla os dados',
    content: [
      'O aplicativo Apresenta+ é o controlador dos dados pessoais coletados através da plataforma.',
      `Para questões relacionadas a privacidade, entre em contato através do e-mail: ${SUPPORT_CONTACT}`,
    ],
  },
  {
    id: 'dados-coletados',
    title: 'Quais dados podem ser coletados',
    content: [
      'O aplicativo coleta apenas os dados necessários para o funcionamento dos recursos oferecidos.',
      'As categorias de dados estão descritas nas seções a seguir.',
    ],
  },
  {
    id: 'dados-cadastro',
    title: 'Dados de cadastro',
    content: [
      'Ao criar uma conta, coletamos seu endereço de e-mail e senha (armazenada de forma criptografada).',
      'O e-mail é utilizado para identificação, comunicação e recuperação de acesso.',
    ],
  },
  {
    id: 'dados-perfil',
    title: 'Dados de perfil',
    content: [
      'Você pode fornecer dados opcionais de perfil, como nome de exibição e preferências de uso.',
      'Esses dados são utilizados para personalizar a experiência no aplicativo.',
    ],
  },
  {
    id: 'conteudo-apresentacoes',
    title: 'Conteúdo criado nas apresentações',
    content: [
      'Os textos, blocos, resumos, notas e demais conteúdos que você cria são armazenados para que possa acessá-los e utilizá-los.',
      'Esses dados são associados à sua conta e não são compartilhados com outros usuários, exceto se você decidir compartilhar.',
    ],
  },
  {
    id: 'dados-uso',
    title: 'Dados de uso',
    content: [
      'Podemos coletar informações sobre como você utiliza o aplicativo (como apresentações criadas, sessões realizadas e preferências configuradas) para melhorar a plataforma.',
      'Esses dados são agregados e não identificam individualmente o usuário quando utilizados para análise.',
    ],
  },
  {
    id: 'dados-tecnicos',
    title: 'Dados técnicos do dispositivo',
    content: [
      'Podemos registrar informações técnicas como tipo de dispositivo, navegador e versão do aplicativo.',
      'Essas informações são utilizadas para garantir compatibilidade e estabilidade.',
    ],
  },
  {
    id: 'dados-autenticacao',
    title: 'Dados de autenticação',
    content: [
      'Quando você faz login, o aplicativo gera tokens de sessão que permitem manter você autenticado.',
      'Esses tokens são protegidos e expiram após um período de inatividade.',
    ],
  },
  {
    id: 'dados-pagamentos',
    title: 'Dados de pagamentos (futuramente)',
    content: [
      'Atualmente, a funcionalidade de pagamentos não está implementada.',
      'Quando disponível, os dados de pagamento serão processados por provedores especializados e o Apresenta+ não armazenará informações completas de cartão de crédito.',
    ],
  },
  {
    id: 'finalidades',
    title: 'Finalidades do tratamento',
    content: [
      'Os dados são tratados com as seguintes finalidades: permitir o cadastro e o acesso à conta; armazenar e sincronizar o conteúdo criado; personalizar a experiência; garantir a segurança da plataforma; e cumprir obrigações legais.',
    ],
  },
  {
    id: 'base-legal',
    title: 'Base legal aplicável',
    content: [
      'O tratamento dos dados pessoais é fundamentado no consentimento do titular, na execução de contrato, no cumprimento de obrigação legal e no legítimo interesse do controlador, conforme a LGPD (Lei nº 13.709/2018).',
    ],
  },
  {
    id: 'autenticacao-funcionamento',
    title: 'Funcionamento da autenticação',
    content: [
      'A autenticação é realizada por e-mail e senha ou por provedores externos (como Google).',
      'Em ambos os casos, o aplicativo recebe um token de acesso que identifica sua sessão sem expor sua senha.',
    ],
  },
  {
    id: 'armazenamento-apresentacoes',
    title: 'Armazenamento de apresentações e blocos',
    content: [
      'Apresentações, blocos hierárquicos, anexos (por URL) e referências são armazenados nos servidores da plataforma.',
      'Cada usuário acessa apenas o conteúdo que criou.',
    ],
  },
  {
    id: 'sessoes',
    title: 'Sessões de ensaio e apresentação',
    content: [
      'Durante ensaios e apresentações, o aplicativo registra dados como tempo decorrido, blocos concluídos, pulados e revisitados.',
      'Esses dados compõem o histórico de sessões e são visíveis apenas para o usuário que os gerou.',
    ],
  },
  {
    id: 'preferencias',
    title: 'Preferências do usuário',
    content: [
      'As preferências configuradas na página de Configurações (como tema padrão, modo de visualização e acessibilidade) são armazenadas e aplicadas em suas sessões.',
    ],
  },
  {
    id: 'biblioteca',
    title: 'Biblioteca de conteúdos',
    content: [
      'Itens salvos na Biblioteca (citações, histórias, exemplos, referências) são armazenados para reutilização.',
      'Esses dados são associados à sua conta e acessíveis apenas por você.',
    ],
  },
  {
    id: 'fornecedores',
    title: 'Compartilhamento com fornecedores de infraestrutura',
    content: [
      'Para operar a plataforma, utilizamos provedores de infraestrutura em nuvem que processam dados em nosso nome.',
      'Esses provedores estão vinculados por contratos que exigem confidencialidade e proteção dos dados.',
    ],
  },
  {
    id: 'servicos-terceiros',
    title: 'Serviços de terceiros',
    content: [
      'Se você optar por login com Google, seus dados de autenticação são processados pelo Google de acordo com a política deles.',
      'Não compartilhamos o conteúdo de suas apresentações com terceiros para fins publicitários.',
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies e armazenamento local',
    content: [
      'O aplicativo utiliza armazenamento local do navegador para guardar preferências (como o e-mail lembrado na tela de login) e tokens de sessão.',
      'Não utilizamos cookies de rastreamento publicitário de terceiros.',
    ],
  },
  {
    id: 'seguranca',
    title: 'Segurança',
    content: [
      'Adotamos medidas técnicas e organizacionais para proteger os dados, como criptografia de senhas, controle de acesso e monitoramento.',
      'Nenhum sistema é totalmente seguro. Em caso de incidente, tomaremos as medidas cabíveis e comunicaremos os afetados quando exigido por lei.',
    ],
  },
  {
    id: 'retencao',
    title: 'Retenção dos dados',
    content: [
      'Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas ou conforme obrigação legal.',
      'Apresentações arquivadas permanecem associadas à sua conta até que você as exclua.',
    ],
  },
  {
    id: 'exclusao-conta',
    title: 'Exclusão da conta',
    content: [
      'Você pode solicitar a exclusão de sua conta a qualquer momento.',
      'Após a exclusão, seus dados serão removidos dentro do prazo tecnicamente viável, ressalvadas as retenções obrigatórias por lei.',
    ],
  },
  {
    id: 'direitos',
    title: 'Direitos do titular',
    content: [
      'Conforme a LGPD, você possui direitos sobre seus dados: acesso, correção, exclusão, portabilidade e revogação de consentimento.',
      'Para exercer esses direitos, entre em contato através do canal informado ao final desta política.',
    ],
  },
  {
    id: 'solicitacoes',
    title: 'Solicitação de acesso, correção ou exclusão',
    content: [
      'Suas solicitações serão atendidas dentro dos prazos legais.',
      'Pode ser necessário verificar sua identidade antes de processar a solicitação.',
    ],
  },
  {
    id: 'menores',
    title: 'Dados de menores',
    content: [
      'O aplicativo não é direcionado a menores de idade sem a devida supervisão.',
      'Se você for menor, utilize o aplicativo com o consentimento dos responsáveis.',
    ],
  },
  {
    id: 'transferencia-internacional',
    title: 'Transferência internacional',
    content: [
      'Os servidores da plataforma podem estar localizados fora do Brasil.',
      'Quando houver transferência internacional de dados, buscaremos garantir níveis adequados de proteção.',
    ],
  },
  {
    id: 'atualizacoes',
    title: 'Atualizações da política',
    content: [
      'Esta política pode ser atualizada periodicamente.',
      'Alterações significativas serão comunicadas sempre que possível. O uso continuado após a atualização implica ciência da nova versão.',
    ],
  },
  {
    id: 'contato',
    title: 'Canal de contato',
    content: [
      `Para exercer seus direitos ou tirar dúvidas sobre privacidade, escreva para: ${SUPPORT_CONTACT}`,
    ],
  },
];

export default function Privacy() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-muted/20">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <Card className="overflow-hidden border-border/70">
          <CardContent className="p-5 sm:p-8">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">Política de Privacidade</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Última atualização: {LAST_UPDATED}
                </p>
              </div>
            </div>

            <nav className="mb-8 rounded-2xl border border-border/70 bg-muted/40 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Índice
              </p>
              <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                {SECTIONS.map((section, index) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block truncate text-primary hover:underline"
                    >
                      {index + 1}. {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-8">
              {SECTIONS.map((section, index) => (
                <section key={section.id} id={section.id} className="scroll-mt-6">
                  <h2 className="mb-3 text-lg font-bold sm:text-xl">
                    {index + 1}. {section.title}
                  </h2>
                  <div className="space-y-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {section.content.map((paragraph, pIndex) => (
                      <p key={pIndex}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-start gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Dúvidas? Escreva para{' '}
                  <a
                    href={`mailto:${SUPPORT_CONTACT}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {SUPPORT_CONTACT}
                  </a>
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/terms">Ver Termos de Uso</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}