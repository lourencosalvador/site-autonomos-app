import { useState } from 'react';
import { Plus } from 'lucide-react';
import { SectionHeading } from './SectionHeading';
import { Button } from './Button';

export const FAQS: { q: string; a: string }[] = [
  {
    q: 'O que é a AUTONOMOUS?',
    a: 'A AUTONOMOUS é uma plataforma que conecta pessoas que precisam de um serviço a profissionais qualificados de forma rápida, simples e segura. Basta solicitar o serviço e encontrar o profissional ideal para o seu problema.',
  },
  {
    q: 'Quais serviços posso encontrar?',
    a: 'A plataforma reúne profissionais de diversas áreas, incluindo eletricistas, canalizadores, pintores, carpinteiros, técnicos de ar condicionado, técnicos de eletrodomésticos, jardineiros, serralheiros, serviços de limpeza, montagem de móveis e muitos outros. Novas categorias são adicionadas continuamente.',
  },
  {
    q: 'Como faço para solicitar um serviço?',
    a: 'Basta criar uma conta, escolher a categoria, descrever o que precisa e enviar o pedido. O pedido chega aos profissionais verificados da área e o primeiro a aceitar envia-lhe um orçamento.',
  },
  {
    q: 'Preciso pagar para utilizar a plataforma?',
    a: 'Criar uma conta e pedir serviços é gratuito. Só paga depois de o serviço estar concluído: o valor do orçamento mais uma taxa de serviço de 10%.',
  },
  {
    q: 'Como é definido o preço do serviço?',
    a: 'O profissional envia um orçamento que mostra o que está incluído (mão de obra, deslocação, materiais…). Se precisar de ver o local, propõe datas para uma visita de diagnóstico gratuita. Só avança se aceitar o valor.',
  },
  {
    q: 'Quando e como pago?',
    a: 'Só paga depois de o profissional concluir e de confirmar que está tudo feito. Faz uma transferência para a conta da AUTONOMOUS (os dados aparecem na app) e envia o comprovativo. Nunca pague antes de o trabalho estar terminado.',
  },
  {
    q: 'Quanto cobra a AUTONOMOUS aos profissionais?',
    a: 'Uma comissão de 10% sobre o valor do serviço. Depois de confirmarmos o pagamento do cliente, o restante entra no saldo da sua carteira e pode sacá-lo para a sua conta bancária quando quiser.',
  },
  {
    q: 'Como sei que o profissional é confiável?',
    a: 'Os profissionais passam por um processo de registo e análise do seu perfil na plataforma e possuem um perfil onde os clientes podem consultar informações, avaliações e histórico de serviços realizados. Assim escolhe com confiança.',
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
    q: 'Quem pode ser prestador na AUTONOMOUS?',
    a: 'Qualquer profissional que possua experiência na sua área de atuação e cumpra os requisitos da plataforma pode candidatar-se para oferecer os seus serviços.',
  },
  {
    q: 'Em que cidades a AUTONOMOUS está disponível?',
    a: 'A plataforma está disponível somente em Luanda, mas com previsão de expansão.',
  },
  {
    q: 'Como entro em contacto com o suporte?',
    a: 'Caso tenha alguma dúvida ou precise de ajuda, utilize os canais de atendimento disponíveis na página de Contacto da plataforma. A nossa equipa terá todo o gosto em ajudar.',
  },
  {
    q: 'A AUTONOMOUS garante o serviço realizado?',
    a: 'A AUTONOMOUS atua como intermediária entre clientes e profissionais, facilitando a contratação de serviços. A execução do trabalho é da responsabilidade do prestador contratado. No entanto, a plataforma acompanha avaliações, recebe reclamações e toma medidas quando necessário para manter a qualidade dos serviços.',
  },
  {
    q: 'Os meus dados pessoais estão protegidos?',
    a: 'Sim. A AUTONOMOUS adota medidas para proteger as informações dos utilizadores e trata os dados pessoais de acordo com a sua Política de Privacidade.',
  },
];

export function FaqSection({ contactCard = true }: { contactCard?: boolean }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-white py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-8">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            center={false}
            eyebrow="Perguntas frequentes"
            title="Tudo o que precisa de saber."
            subtitle={contactCard ? 'As dúvidas mais comuns de clientes e profissionais. Não encontrou a sua? Fale connosco.' : 'As dúvidas mais comuns de clientes e profissionais.'}
          />
          {contactCard && (
          <div className="reveal mt-8 rounded-2xl border border-cloud-300 bg-cloud-50 p-6">
            <p className="font-display text-lg font-bold text-ink-900">Ainda tem dúvidas?</p>
            <p className="mt-1 text-[15px] leading-relaxed text-ink-500">A nossa equipa responde por WhatsApp, telefone ou email.</p>
            <Button to="/contato" size="md" variant="secondary" className="mt-5">Falar connosco</Button>
          </div>
          )}
        </div>

        <div className="reveal border-t border-cloud-300">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="border-b border-cloud-300">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="group flex w-full items-center justify-between gap-6 py-5 text-left"
                >
                  <span className={`text-base font-semibold transition-colors sm:text-[17px] ${isOpen ? 'text-brand-dark' : 'text-ink-900 group-hover:text-brand-dark'}`}>
                    {item.q}
                  </span>
                  <Plus size={20} strokeWidth={1.8} className={`shrink-0 text-ink-400 transition-transform duration-300 ${isOpen ? 'rotate-45 text-brand-dark' : ''}`} />
                </button>
                <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <p className="pb-6 pr-10 text-[15px] leading-relaxed text-ink-500 sm:text-base">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
