import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const SUPPORT_CONTACT = 'contato@apresentamais.app';

const LAST_UPDATED = '14 de julho de 2026';

const SECTIONS = [
  {
    id: 'introducao',
    title: 'Introdução',
    content: [
      'Estes Termos de Uso regulam a utilização do aplicativo Apresenta+, uma ferramenta para criar, organizar, ensaiar e realizar apresentações.',
      'Ao criar uma conta ou utilizar o aplicativo, você concorda integralmente com estes termos. Se não concorda, não utilize o aplicativo.',
    ],
  },
  {
    id: 'aceitacao',
    title: 'Aceitação dos termos',
    content: [
      'O uso do aplicativo implica a aceitação destes Termos de Uso e da Política de Privacidade.',
      'Se você não concorda com qualquer disposição aqui descrita, deve cessar imediatamente o uso da plataforma.',
    ],
  },
  {
    id: 'uso-permitido',
    title: 'Uso permitido do aplicativo',
    content: [
      'O aplicativo destina-se ao uso pessoal e profissional para construção e condução de apresentações.',
      'Você concorda em utilizar a plataforma de forma ética, respeitando a legislação aplicável e os direitos de terceiros.',
    ],
  },
  {
    id: 'cadastro',
    title: 'Cadastro e segurança da conta',
    content: [
      'Para utilizar os recursos do aplicativo, é necessário criar uma conta com endereço de e-mail válido e senha segura.',
      'Você é responsável por manter a confidencialidade de seus dados de acesso e por todas as atividades realizadas em sua conta.',
      'Comunique imediatamente qualquer uso não autorizado de sua conta.',
    ],
  },
  {
    id: 'responsabilidade-conteudo',
    title: 'Responsabilidade pelo conteúdo criado',
    content: [
      'Todo o conteúdo criado pelo usuário (apresentações, blocos, anexos, referências e biblioteca) é de inteira responsabilidade de quem o criou.',
      'O Apresenta+ não monitora ativamente o conteúdo criado pelos usuários e não se responsabiliza por sua precisão, legalidade ou adequação.',
    ],
  },
  {
    id: 'condutas-proibidas',
    title: 'Condutas proibidas',
    content: [
      'É proibido utilizar o aplicativo para: criar ou armazenar conteúdo ilegal, difamatório, discriminatório ou que viole direitos de terceiros; tentar comprometer a segurança da plataforma; utilizar bots ou scripts automatizados sem autorização; e ceder ou vender sua conta.',
      'O descumprimento pode resultar em suspensão ou encerramento da conta sem aviso prévio.',
    ],
  },
  {
    id: 'modelos-temas',
    title: 'Modelos, temas e conteúdos disponibilizados',
    content: [
      'O aplicativo oferece modelos de estrutura, temas visuais e tipos de bloco para auxiliar na criação de apresentações.',
      'Esses recursos são fornecidos "no estado em que se encontram" e podem ser atualizados, modificados ou removidos a qualquer momento.',
      'Alguns recursos podem ser identificados como premium e depender de um plano compatível.',
    ],
  },
  {
    id: 'planos',
    title: 'Planos gratuitos e pagos',
    content: [
      'O aplicativo oferece um plano gratuito com recursos básicos.',
      'Planos pagos, quando disponibilizados, oferecerão recursos adicionais. A contratação de planos pagos é opcional.',
      'Não associamos automaticamente usuários a planos pagos.',
    ],
  },
  {
    id: 'pagamentos',
    title: 'Pagamentos, cancelamentos e reembolsos',
    content: [
      'Quando os pagamentos forem implementados, os detalhes de preço, cobrança e períodos de teste serão exibidos antes da contratação.',
      'Atualmente, a funcionalidade de pagamentos não está ativa. Esta seção será atualizada quando os pagamentos forem disponibilizados.',
    ],
  },
  {
    id: 'armazenamento',
    title: 'Armazenamento e sincronização',
    content: [
      'O conteúdo criado pelo usuário é armazenado nos servidores da plataforma e sincronizado entre os dispositivos conectados à mesma conta.',
      'A disponibilidade dos dados depende de uma conexão de internet estável.',
    ],
  },
  {
    id: 'terceiros',
    title: 'Serviços de terceiros',
    content: [
      'O aplicativo pode utilizar serviços de terceiros (como provedores de infraestrutura e autenticação).',
      'Esses serviços possuem seus próprios termos e políticas de privacidade, não controlados pelo Apresenta+.',
    ],
  },
  {
    id: 'propriedade-intelectual',
    title: 'Propriedade intelectual do aplicativo',
    content: [
      'A marca, o design, o código e os recursos originais do Apresenta+ são protegidos por direitos autorais e outras leis de propriedade intelectual.',
      'Você não deve copiar, modificar, distribuir ou explorar comercialmente o aplicativo sem autorização expressa.',
    ],
  },
  {
    id: 'propriedade-conteudo',
    title: 'Propriedade do conteúdo do usuário',
    content: [
      'Você mantém a propriedade de todo o conteúdo que criar no aplicativo.',
      'Ao criar conteúdo, você concede ao Apresenta+ uma licença limitada para hospedar, processar e exibir esse conteúdo conforme necessário para o funcionamento da plataforma.',
    ],
  },
  {
    id: 'limitacoes',
    title: 'Limitações de responsabilidade',
    content: [
      'O aplicativo é fornecido "no estado em que se encontra", sem garantias de disponibilidade contínua, ausência de erros ou adequação a um propósito específico.',
      'O Apresenta+ não se responsabiliza por perdas decorrentes de interrupções, falhas técnicas ou perda de dados não imputáveis à plataforma.',
    ],
  },
  {
    id: 'disponibilidade',
    title: 'Disponibilidade e manutenção do serviço',
    content: [
      'O aplicativo pode passar por manutenções programadas ou não programadas.',
      'Buscamos minimizar impactos, mas não garantimos que o serviço estará ininterruptamente disponível.',
    ],
  },
  {
    id: 'suspensao',
    title: 'Suspensão e encerramento da conta',
    content: [
      'Podemos suspender ou encerrar contas que violem estes Termos de Uso ou que apresentem atividade suspeita.',
      'Você pode solicitar o encerramento de sua conta a qualquer momento através do canal de contato.',
    ],
  },
  {
    id: 'exclusao-dados',
    title: 'Exclusão de dados',
    content: [
      'Ao encerrar a conta, os dados associados serão tratados conforme a Política de Privacidade.',
      'Alguns dados podem ser retidos pelo período necessário para cumprir obrigações legais ou técnicas.',
    ],
  },
  {
    id: 'privacidade',
    title: 'Privacidade e proteção de dados',
    content: [
      'O tratamento de dados pessoais é regido pela nossa Política de Privacidade, disponível ',
      'link:Nossa Política de Privacidade descreve quais dados coletamos, como utilizamos e quais são seus direitos.',
    ],
  },
  {
    id: 'alteracoes',
    title: 'Alterações futuras nos termos',
    content: [
      'Estes Termos de Uso podem ser atualizados periodicamente.',
      'Alterações significativas serão comunicadas sempre que possível. O uso continuado após a atualização implica aceitação dos novos termos.',
    ],
  },
  {
    id: 'legislacao',
    title: 'Legislação aplicável',
    content: [
      'Estes termos são regidos pela legislação brasileira.',
      'Eventuais disputas serão dirimidas no foro competente, respeitadas as regras de proteção ao consumidor.',
    ],
  },
  {
    id: 'contato',
    title: 'Canal de contato',
    content: [
      `Para dúvidas, solicitações ou comunicados relacionados a estes Termos de Uso, entre em contato através do e-mail: ${SUPPORT_CONTACT}`,
    ],
  },
];

export default function Terms() {
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
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">Termos de Uso</h1>
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
                      <p key={pIndex}>
                        {paragraph}
                        {paragraph.endsWith('disponível ') && (
                          <Link
                            to="/privacy"
                            className="font-semibold text-primary hover:underline"
                          >
                            Política de Privacidade
                          </Link>
                        )}
                        {paragraph.endsWith('disponível ') && '.'}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-start gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
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
                <Link to="/privacy">Ver Política de Privacidade</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}