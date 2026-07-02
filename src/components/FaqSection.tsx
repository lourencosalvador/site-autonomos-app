import { useState } from 'react';
import { Plus } from 'lucide-react';
import { SectionHeading } from './SectionHeading';
import { Button } from './Button';

const FAQS: { q: string; a: string }[] = [
  {
    q: 'O que é a AUTONOMOS?',
    a: 'A AUTONOMOS é uma plataforma que conecta pessoas que precisam de um serviço a profissionais qualificados de forma rápida, simples e segura. Basta solicitar o serviço e encontrar o profissional ideal para o seu problema.',
  },
  {
    q: 'Quais serviços posso encontrar?',
    a: 'A plataforma reúne profissionais de diversas áreas, incluindo eletricistas, canalizadores, pintores, carpinteiros, técnicos de ar condicionado, técnicos de eletrodomésticos, jardineiros, serralheiros, serviços de limpeza, montagem de móveis e muitos outros. Novas categorias são adicionadas continuamente.',
  },
  {
    q: 'Como faço para solicitar um serviço?',
    a: 'Basta criar uma conta, escolher a categoria desejada, escolher o profissional mais qualificado para solucionar o seu problema, descrever o problema e enviar a solicitação.',
  },
  {
    q: 'Preciso pagar para utilizar a plataforma?',
    a: 'Criar uma conta e solicitar serviços é gratuito. O cliente paga apenas a taxa de solicitação e pelo serviço contratado, conforme o valor acordado com o prestador.',
  },
  {
    q: 'Como é definido o preço do serviço?',
    a: 'O valor é definido pelo profissional com base no tipo de serviço, na complexidade do trabalho e nos materiais necessários — mas tudo isso é apresentado na plataforma de forma transparente.',
  },
  {
    q: 'Existe taxa de deslocação?',
    a: 'Sim. Alguns serviços podem incluir uma taxa de deslocação, especialmente quando o profissional precisa percorrer uma distância significativa. O valor é informado antes da confirmação do serviço.',
  },
  {
    q: 'Como sei que o profissional é confiável?',
    a: 'Os profissionais passam por um processo de registo e análise do seu perfil na plataforma e possuem um perfil onde os clientes podem consultar informações, avaliações e histórico de serviços realizados — fator importante para a sua contratação.',
  },
  {
    q: 'Posso avaliar o profissional após o serviço?',
    a: 'Sim. Após a conclusão do trabalho, poderá deixar uma avaliação e um comentário sobre a sua experiência. Isso ajuda outros clientes e contribui para manter a qualidade da plataforma.',
  },
  {
    q: 'O que acontece se eu precisar cancelar um serviço?',
    a: 'O cliente e o prestador podem solicitar o cancelamento antes da conclusão do serviço. Dependendo da fase em que o serviço se encontra, poderão aplicar-se as regras de cancelamento definidas pela plataforma.',
  },
  {
    q: 'Como posso tornar-me um prestador de serviços?',
    a: 'Basta criar uma conta como prestador, preencher os seus dados, escolher as categorias em que trabalha e aguardar a validação do seu perfil. Depois disso, poderá começar a receber solicitações de clientes.',
  },
  {
    q: 'Quem pode ser prestador na AUTONOMOS?',
    a: 'Qualquer profissional que possua experiência na sua área de atuação e cumpra os requisitos da plataforma pode candidatar-se para oferecer os seus serviços.',
  },
  {
    q: 'Em que cidades a AUTONOMOS está disponível?',
    a: 'A plataforma está disponível somente em Luanda, mas com previsão de expansão.',
  },
  {
    q: 'Como entro em contacto com o suporte?',
    a: 'Caso tenha alguma dúvida ou precise de ajuda, utilize os canais de atendimento disponíveis na página de Contacto da plataforma. A nossa equipa terá todo o gosto em ajudar.',
  },
  {
    q: 'A AUTONOMOS garante o serviço realizado?',
    a: 'A AUTONOMOS atua como intermediária entre clientes e profissionais, facilitando a contratação de serviços. A execução do trabalho é da responsabilidade do prestador contratado. No entanto, a plataforma acompanha avaliações, recebe reclamações e toma medidas quando necessário para manter a qualidade dos serviços.',
  },
  {
    q: 'Os meus dados pessoais estão protegidos?',
    a: 'Sim. A AUTONOMOS adota medidas para proteger as informações dos utilizadores e trata os dados pessoais de acordo com a sua Política de Privacidade.',
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="relative overflow-hidden bg-white py-24">
      <div className="absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-lilac-200/40 blur-3xl" />
      <div className="absolute -left-24 bottom-1/4 h-72 w-72 rounded-full bg-brand-cyan/10 blur-3xl" />
      <div className="relative mx-auto max-w-3xl px-5 lg:px-8">
        <SectionHeading
          eyebrow="Perguntas Frequentes"
          title={<>Tudo o que precisa de <span className="text-gradient-cyan">saber.</span></>}
          subtitle="Reunimos as dúvidas mais comuns de clientes e profissionais. Não encontrou a sua? Fale connosco."
        />

        <div className="reveal mt-12 space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                className={`group overflow-hidden rounded-2xl border transition-all duration-300 ${
                  isOpen
                    ? 'border-brand-cyan/40 bg-cloud-50 shadow-cardHover'
                    : 'border-cloud-200 bg-white hover:border-brand-cyan/30 hover:bg-cloud-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left lg:px-6"
                >
                  <span className="font-display text-base font-bold text-ink-900 lg:text-lg">
                    {item.q}
                  </span>
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                      isOpen
                        ? 'rotate-45 bg-brand-cyan text-brand-dark shadow-glow'
                        : 'bg-brand-dark text-brand-cyan group-hover:bg-brand-cyan group-hover:text-brand-dark'
                    }`}
                  >
                    <Plus size={18} />
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-ink-500 lg:px-6 lg:text-base">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="reveal reveal-delay-1 mt-12 flex flex-col items-center gap-4 rounded-3xl border border-cloud-200 bg-cloud-50 px-6 py-10 text-center">
          <h3 className="font-display text-xl font-bold text-ink-900">Ainda tem dúvidas?</h3>
          <p className="max-w-md text-sm text-ink-500">
            A nossa equipa de suporte está pronta para ajudar em qualquer etapa.
          </p>
          <Button to="/contato" size="md" variant="dark">
            Falar com o suporte
          </Button>
        </div>
      </div>
    </section>
  );
}
