import React, {
  useMemo,
  useState,
} from 'react';

import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
  FileText,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const SUPPORT_EMAIL = 'suporte@apresentamais.app';
const LAST_UPDATED_AT = '14 de julho de 2026';

const SECTIONS = [
  {
    id: 'introduction',
    title: '1. Introdução',
    icon: ShieldCheck,
    content: [
      {
        type: 'paragraph',
        text: 'Esta Política de Privacidade explica como o Apresenta+ pode coletar, utilizar, armazenar, compartilhar e proteger informações relacionadas aos usuários do aplicativo.',
      },
      {
        type: 'paragraph',
        text: 'O Apresenta+ foi desenvolvido para ajudar pessoas a construir, organizar, ensaiar e realizar apresentações. O tratamento de dados deve ocorrer apenas na medida necessária para oferecer essas funcionalidades, manter a segurança da conta e melhorar a experiência de uso.',
      },
      {
        type: 'paragraph',
        text: 'Ao utilizar o aplicativo, o usuário declara que leu e compreendeu esta Política de Privacidade.',
      },
    ],
  },
  {
    id: 'controller',
    title: '2. Responsável pelo tratamento dos dados',
    icon: UserRound,
    content: [
      {
        type: 'paragraph',
        text: 'Enquanto o aplicativo estiver em fase de desenvolvimento e estruturação, o responsável pelo produto será identificado comercialmente como Apresenta+.',
      },
      {
        type: 'paragraph',
        text: `Solicitações relacionadas à privacidade podem ser encaminhadas para ${SUPPORT_EMAIL}. Esse contato é provisório e poderá ser substituído quando a empresa responsável pelo aplicativo for formalmente definida.`,
      },
    ],
  },
  {
    id: 'data-collected',
    title: '3. Dados que podem ser coletados',
    icon: Database,
    content: [
      {
        type: 'subtitle',
        text: '3.1 Dados de cadastro',
      },
      {
        type: 'list',
        items: [
          'Nome informado pelo usuário.',
          'Endereço de e-mail.',
          'Telefone, quando preenchido.',
          'Foto ou URL de avatar, quando adicionada.',
          'Identificador interno da conta.',
          'Função e status do perfil.',
        ],
      },
      {
        type: 'subtitle',
        text: '3.2 Dados de autenticação',
      },
      {
        type: 'paragraph',
        text: 'A autenticação pode ser realizada por e-mail e senha ou por serviços de terceiros, como login com Google, quando esse recurso estiver disponível. Senhas devem ser tratadas pelo provedor de autenticação e não devem ser armazenadas diretamente em formato legível pelo aplicativo.',
      },
      {
        type: 'subtitle',
        text: '3.3 Conteúdo criado pelo usuário',
      },
      {
        type: 'list',
        items: [
          'Títulos, temas e descrições de apresentações.',
          'Tópicos, subtópicos, resumos e textos.',
          'Notas pessoais do apresentador.',
          'Referências, links e anexos cadastrados.',
          'Modelos pessoais.',
          'Itens da biblioteca.',
          'Etiquetas e preferências de organização.',
        ],
      },
      {
        type: 'subtitle',
        text: '3.4 Dados de ensaio e apresentação',
      },
      {
        type: 'list',
        items: [
          'Data e horário de início e encerramento.',
          'Tempo planejado e tempo realizado.',
          'Tópicos concluídos, pulados ou marcados para revisitar.',
          'Quantidade de visitas a cada tópico.',
          'Observações registradas na sessão.',
          'Progresso da apresentação.',
        ],
      },
      {
        type: 'subtitle',
        text: '3.5 Preferências',
      },
      {
        type: 'list',
        items: [
          'Tema visual padrão.',
          'Tamanho de fonte.',
          'Nível de detalhes.',
          'Visualização preferida.',
          'Modo claro ou escuro.',
          'Exibição de cronômetro e progresso.',
          'Preferências de acessibilidade.',
        ],
      },
      {
        type: 'subtitle',
        text: '3.6 Dados técnicos e de uso',
      },
      {
        type: 'paragraph',
        text: 'Dependendo da infraestrutura utilizada, poderão ser processados dados técnicos como endereço IP, tipo de navegador, sistema operacional, modelo do dispositivo, registros de acesso, falhas do aplicativo e informações necessárias para segurança e desempenho.',
      },
      {
        type: 'subtitle',
        text: '3.7 Dados de pagamento',
      },
      {
        type: 'paragraph',
        text: 'O aplicativo ainda poderá receber recursos pagos no futuro. Quando isso ocorrer, os dados de pagamento poderão ser processados por plataformas especializadas. O Apresenta+ não deverá armazenar diretamente números completos de cartão ou credenciais bancárias quando o pagamento for realizado por um provedor externo.',
      },
    ],
  },
  {
    id: 'purposes',
    title: '4. Finalidades do tratamento',
    icon: FileText,
    content: [
      {
        type: 'paragraph',
        text: 'Os dados podem ser utilizados para:',
      },
      {
        type: 'list',
        items: [
          'Criar e administrar a conta do usuário.',
          'Permitir autenticação e recuperação de acesso.',
          'Salvar apresentações, blocos e estruturas.',
          'Permitir criação guiada.',
          'Registrar ensaios e apresentações.',
          'Continuar uma sessão interrompida.',
          'Aplicar preferências do usuário.',
          'Disponibilizar modelos e temas.',
          'Manter a biblioteca de conteúdos.',
          'Proteger a segurança do aplicativo.',
          'Prevenir abuso, fraude e acesso indevido.',
          'Corrigir erros e melhorar desempenho.',
          'Atender solicitações de suporte.',
          'Cumprir obrigações legais.',
          'Gerenciar planos e recursos premium futuramente.',
        ],
      },
    ],
  },
  {
    id: 'legal-basis',
    title: '5. Bases legais',
    icon: BookOpen,
    content: [
      {
        type: 'paragraph',
        text: 'Dependendo do contexto e da legislação aplicável, o tratamento dos dados poderá se basear em:',
      },
      {
        type: 'list',
        items: [
          'Execução do serviço solicitado pelo usuário.',
          'Cumprimento de obrigação legal ou regulatória.',
          'Exercício regular de direitos.',
          'Proteção da segurança do usuário e do sistema.',
          'Legítimo interesse, quando aplicável e respeitados os direitos do titular.',
          'Consentimento, quando exigido.',
        ],
      },
    ],
  },
  {
    id: 'presentations',
    title: '6. Apresentações e blocos',
    icon: FileText,
    content: [
      {
        type: 'paragraph',
        text: 'As apresentações são armazenadas separadamente dos blocos que formam sua estrutura. Essa organização permite mudar a ordem, criar subtópicos e utilizar diferentes visualizações sem duplicar o conteúdo.',
      },
      {
        type: 'paragraph',
        text: 'O conteúdo pertence ao usuário que o criou, respeitadas as regras dos Termos de Uso e eventuais direitos de terceiros.',
      },
      {
        type: 'paragraph',
        text: 'Notas pessoais do apresentador devem permanecer privadas e não devem ser exibidas no modo público da apresentação.',
      },
    ],
  },
  {
    id: 'sessions',
    title: '7. Ensaios e apresentações',
    icon: FileText,
    content: [
      {
        type: 'paragraph',
        text: 'Cada ensaio ou apresentação pode gerar uma sessão separada. O histórico da sessão pode incluir tempo, progresso, tópico atual, tópicos concluídos, pulados e observações.',
      },
      {
        type: 'paragraph',
        text: 'Recomeçar uma apresentação não deve apagar o conteúdo original nem as sessões anteriores. Uma nova sessão poderá ser criada para preservar o histórico.',
      },
    ],
  },
  {
    id: 'library',
    title: '8. Biblioteca, modelos e etiquetas',
    icon: BookOpen,
    content: [
      {
        type: 'paragraph',
        text: 'O usuário pode salvar conteúdos reutilizáveis em sua biblioteca, como citações, histórias, referências, exemplos e aplicações.',
      },
      {
        type: 'paragraph',
        text: 'Etiquetas podem ser usadas para organizar apresentações. As etiquetas particulares devem ficar vinculadas somente ao usuário que as criou.',
      },
      {
        type: 'paragraph',
        text: 'Modelos oficiais podem ser disponibilizados pelo aplicativo. Modelos privados criados pelo usuário não devem ser disponibilizados publicamente sem autorização.',
      },
    ],
  },
  {
    id: 'sharing',
    title: '9. Compartilhamento de dados',
    icon: ExternalLink,
    content: [
      {
        type: 'paragraph',
        text: 'Os dados poderão ser compartilhados somente quando necessário para oferecer o serviço, proteger o sistema ou cumprir obrigação legal.',
      },
      {
        type: 'paragraph',
        text: 'O compartilhamento poderá ocorrer com:',
      },
      {
        type: 'list',
        items: [
          'Provedores de hospedagem e banco de dados.',
          'Serviços de autenticação.',
          'Serviços de armazenamento.',
          'Ferramentas de análise de falhas e desempenho.',
          'Provedores de pagamento futuramente.',
          'Autoridades públicas, quando houver obrigação legal.',
          'Prestadores de suporte técnico sujeitos a obrigações de confidencialidade.',
        ],
      },
      {
        type: 'paragraph',
        text: 'O Apresenta+ não deve vender dados pessoais para fins de publicidade de terceiros.',
      },
    ],
  },
  {
    id: 'third-parties',
    title: '10. Serviços de terceiros',
    icon: ExternalLink,
    content: [
      {
        type: 'paragraph',
        text: 'Algumas funções podem depender de serviços externos, como autenticação, hospedagem, vídeos, links, imagens, pagamentos ou integrações futuras.',
      },
      {
        type: 'paragraph',
        text: 'Cada serviço externo pode possuir seus próprios termos e políticas de privacidade. O usuário deve avaliar essas condições ao acessar links ou conteúdos de terceiros.',
      },
    ],
  },
  {
    id: 'cookies',
    title: '11. Cookies e armazenamento local',
    icon: Database,
    content: [
      {
        type: 'paragraph',
        text: 'O aplicativo pode utilizar cookies, armazenamento local e armazenamento de sessão para manter autenticação, preferências, rascunhos e informações necessárias ao funcionamento.',
      },
      {
        type: 'paragraph',
        text: 'Exemplos incluem preferência de tema, estado do menu lateral, e-mail lembrado e rota de retorno após o login.',
      },
      {
        type: 'paragraph',
        text: 'Esses dados podem ser removidos pelo usuário por meio das configurações do navegador ou do dispositivo, o que poderá afetar algumas funcionalidades.',
      },
    ],
  },
  {
    id: 'security',
    title: '12. Segurança',
    icon: LockKeyhole,
    content: [
      {
        type: 'paragraph',
        text: 'Serão adotadas medidas razoáveis para proteger os dados contra acesso não autorizado, alteração, perda, destruição ou divulgação indevida.',
      },
      {
        type: 'paragraph',
        text: 'Entre as medidas esperadas estão controle de acesso, autenticação, separação de dados por usuário, validação de permissões e proteção de rotas administrativas.',
      },
      {
        type: 'paragraph',
        text: 'Nenhum sistema é completamente imune a falhas. O usuário também deve proteger sua senha, seu dispositivo e não compartilhar credenciais.',
      },
    ],
  },
  {
    id: 'retention',
    title: '13. Retenção dos dados',
    icon: Database,
    content: [
      {
        type: 'paragraph',
        text: 'Os dados poderão ser mantidos enquanto a conta estiver ativa ou enquanto forem necessários para prestar o serviço.',
      },
      {
        type: 'paragraph',
        text: 'Algumas informações poderão ser mantidas por período adicional quando necessário para cumprir obrigações legais, prevenir fraude, resolver disputas ou exercer direitos.',
      },
      {
        type: 'paragraph',
        text: 'Apresentações arquivadas permanecem vinculadas à conta até serem excluídas definitivamente ou até o encerramento da conta, conforme o funcionamento disponível.',
      },
    ],
  },
  {
    id: 'deletion',
    title: '14. Exclusão da conta e dos dados',
    icon: UserRound,
    content: [
      {
        type: 'paragraph',
        text: 'O usuário poderá solicitar exclusão de sua conta e dos dados vinculados por meio do canal de suporte, enquanto não existir uma função automática de exclusão no aplicativo.',
      },
      {
        type: 'paragraph',
        text: 'Antes da exclusão, poderá ser solicitada confirmação de identidade para proteger a conta contra solicitações indevidas.',
      },
      {
        type: 'paragraph',
        text: 'A exclusão pode não ser imediata em cópias de segurança, registros técnicos ou informações que precisem ser mantidas por obrigação legal.',
      },
    ],
  },
  {
    id: 'rights',
    title: '15. Direitos do titular',
    icon: ShieldCheck,
    content: [
      {
        type: 'paragraph',
        text: 'De acordo com a legislação aplicável, o usuário poderá solicitar:',
      },
      {
        type: 'list',
        items: [
          'Confirmação da existência de tratamento.',
          'Acesso aos dados.',
          'Correção de dados incompletos ou incorretos.',
          'Informações sobre compartilhamento.',
          'Portabilidade, quando aplicável.',
          'Exclusão de dados tratados com consentimento, quando aplicável.',
          'Revogação de consentimento.',
          'Oposição a determinado tratamento, quando cabível.',
          'Revisão de decisões automatizadas, caso esse recurso seja implementado.',
        ],
      },
      {
        type: 'paragraph',
        text: `As solicitações podem ser encaminhadas para ${SUPPORT_EMAIL}.`,
      },
    ],
  },
  {
    id: 'children',
    title: '16. Dados de menores',
    icon: UserRound,
    content: [
      {
        type: 'paragraph',
        text: 'O aplicativo não deve ser direcionado intencionalmente a crianças sem a participação e autorização de seus responsáveis.',
      },
      {
        type: 'paragraph',
        text: 'Caso seja identificado tratamento indevido de dados de menor, o responsável poderá solicitar análise e exclusão pelos canais de contato.',
      },
    ],
  },
  {
    id: 'international',
    title: '17. Transferência internacional',
    icon: ExternalLink,
    content: [
      {
        type: 'paragraph',
        text: 'Alguns fornecedores de infraestrutura podem armazenar ou processar dados em outros países.',
      },
      {
        type: 'paragraph',
        text: 'Quando isso ocorrer, deverão ser adotadas medidas compatíveis com a legislação aplicável e com a proteção dos dados pessoais.',
      },
    ],
  },
  {
    id: 'changes',
    title: '18. Alterações desta política',
    icon: FileText,
    content: [
      {
        type: 'paragraph',
        text: 'Esta Política de Privacidade poderá ser atualizada para refletir mudanças no aplicativo, na legislação, nos fornecedores ou nas práticas de tratamento de dados.',
      },
      {
        type: 'paragraph',
        text: 'A data da última atualização será exibida no início da página. Alterações relevantes poderão ser comunicadas pelo aplicativo ou por e-mail, quando necessário.',
      },
    ],
  },
  {
    id: 'contact',
    title: '19. Contato',
    icon: Mail,
    content: [
      {
        type: 'paragraph',
        text: 'Dúvidas, solicitações ou reclamações relacionadas à privacidade podem ser encaminhadas para:',
      },
      {
        type: 'contact',
        email: SUPPORT_EMAIL,
      },
      {
        type: 'paragraph',
        text: 'O contato acima é provisório e deve ser atualizado antes da publicação comercial definitiva do aplicativo.',
      },
    ],
  },
];

function renderContentItem(item, index) {
  if (item.type === 'subtitle') {
    return (
      <h3
        key={`${item.type}-${index}`}
        className="mt-5 text-base font-semibold"
      >
        {item.text}
      </h3>
    );
  }

  if (item.type === 'list') {
    return (
      <ul
        key={`${item.type}-${index}`}
        className="ml-5 list-disc space-y-2 text-sm leading-relaxed text-muted-foreground"
      >
        {item.items.map((listItem) => (
          <li key={listItem}>
            {listItem}
          </li>
        ))}
      </ul>
    );
  }

  if (item.type === 'contact') {
    return (
      <a
        key={`${item.type}-${index}`}
        href={`mailto:${item.email}`}
        className="inline-flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm font-medium text-primary hover:bg-muted"
      >
        <Mail className="h-4 w-4" />
        {item.email}
      </a>
    );
  }

  return (
    <p
      key={`${item.type}-${index}`}
      className="text-sm leading-7 text-muted-foreground"
    >
      {item.text}
    </p>
  );
}

function SectionCard({
  section,
  expanded,
  onToggle,
}) {
  const Icon = section.icon;

  return (
    <Card
      id={section.id}
      className="scroll-mt-24 border-border/70"
    >
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-start gap-3 text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <CardTitle className="text-base sm:text-lg">
              {section.title}
            </CardTitle>
          </div>

          {expanded ? (
            <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
          )}
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {section.content.map(renderContentItem)}
        </CardContent>
      )}
    </Card>
  );
}

export default function Privacy() {
  const navigate = useNavigate();

  const [expandedIds, setExpandedIds] = useState(
    () => new Set(SECTIONS.map((section) => section.id)),
  );

  const [mobileIndexOpen, setMobileIndexOpen] = useState(false);

  const allExpanded = useMemo(
    () => expandedIds.size === SECTIONS.length,
    [expandedIds],
  );

  const handleToggle = (sectionId) => {
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }

      return next;
    });
  };

  const handleToggleAll = () => {
    setExpandedIds(
      allExpanded
        ? new Set()
        : new Set(SECTIONS.map((section) => section.id)),
    );
  };

  const handleGoToSection = (sectionId) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      next.add(sectionId);
      return next;
    });

    setMobileIndexOpen(false);

    window.setTimeout(() => {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
    }, 60);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-muted/20">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="truncate font-bold">
                Apresenta+
              </p>

              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                Política de Privacidade
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <section className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary">
            Documento público
          </Badge>

          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
            Política de Privacidade
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            Entenda quais dados podem ser utilizados, por que eles
            são necessários e quais direitos você possui ao usar o
            Apresenta+.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">
              Última atualização: {LAST_UPDATED_AT}
            </Badge>

            <Badge variant="outline">
              Linguagem clara
            </Badge>

            <Badge variant="outline">
              Aplicável ao aplicativo
            </Badge>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <Card className="sticky top-24 border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Índice
                </CardTitle>
              </CardHeader>

              <CardContent className="max-h-[calc(100vh-9rem)] overflow-y-auto">
                <nav className="space-y-1">
                  {SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => handleGoToSection(section.id)}
                      className="w-full rounded-lg px-3 py-2 text-left text-xs leading-relaxed text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          <div className="min-w-0 space-y-4">
            <Card className="border-border/70 lg:hidden">
              <CardHeader className="pb-3">
                <button
                  type="button"
                  onClick={() => setMobileIndexOpen((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <CardTitle className="text-base">
                    Índice da política
                  </CardTitle>

                  {mobileIndexOpen ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>
              </CardHeader>

              {mobileIndexOpen && (
                <CardContent className="space-y-1 pt-0">
                  {SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => handleGoToSection(section.id)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {section.title}
                    </button>
                  ))}
                </CardContent>
              )}
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold">
                      Controle de leitura
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Expanda ou recolha todas as seções.
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleToggleAll}
                  >
                    {allExpanded
                      ? 'Recolher todas'
                      : 'Expandir todas'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {SECTIONS.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                expanded={expandedIds.has(section.id)}
                onToggle={() => handleToggle(section.id)}
              />
            ))}

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="font-semibold">
                      Consulte também os Termos de Uso
                    </h2>

                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Os Termos de Uso explicam as regras de utilização
                      do aplicativo e as responsabilidades de cada parte.
                    </p>
                  </div>

                  <Button
                    asChild
                    variant="outline"
                    className="w-full shrink-0 sm:w-auto"
                  >
                    <Link to="/terms">
                      <FileText className="mr-2 h-4 w-4" />
                      Ver Termos de Uso
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Separator />

            <div className="flex flex-col items-center justify-between gap-4 pb-8 text-center sm:flex-row sm:text-left">
              <p className="text-xs text-muted-foreground">
                © 2026 Apresenta+. Documento provisório para a fase
                atual do projeto.
              </p>

              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Mail className="h-4 w-4" />
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}