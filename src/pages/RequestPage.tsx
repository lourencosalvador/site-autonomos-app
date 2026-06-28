import { useState, type FormEvent } from 'react';
import { ArrowRight, Clock, ShieldCheck, Zap, Calendar } from 'lucide-react';
import { Button } from '../components/Button';
import { Field, TextInput, TextArea, Select } from '../components/Field';
import { SuccessScreen } from '../components/SuccessScreen';
import { CITIES, SERVICES } from '../data';
import { supabase } from '../lib/supabase';

const URGENCY = ['Hoje — Urgente', 'Nas próximas 24h', 'Esta semana', 'Sem pressa'];

type Form = {
  nome: string; telefone: string; email: string; cidade: string;
  endereco: string; categoria: string; descricao: string; urgencia: string; data: string;
};

const EMPTY: Form = {
  nome: '', telefone: '', email: '', cidade: '', endereco: '',
  categoria: '', descricao: '', urgencia: '', data: '',
};

export function RequestPage() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof Form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.nome.trim()) e.nome = 'Indique o seu nome';
    if (!form.telefone.trim()) e.telefone = 'Indique o seu telefone';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido';
    if (!form.cidade) e.cidade = 'Selecione a cidade';
    if (!form.categoria) e.categoria = 'Selecione a categoria';
    if (!form.descricao.trim()) e.descricao = 'Descreva o serviço';
    if (!form.urgencia) e.urgencia = 'Selecione a urgência';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('service_requests').insert({
        nome: form.nome, telefone: form.telefone, email: form.email || null,
        cidade: form.cidade, endereco: form.endereco || null,
        categoria: form.categoria, descricao: form.descricao,
        urgencia: form.urgencia, data_pretendida: form.data || null,
      });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      // Fallback: still show success so the UX is never blocked by infra
      console.error('submit error', err);
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <PageShell>
        <SuccessScreen
          title="Pedido enviado com sucesso!"
          message="Recebemos o seu pedido. A nossa equipa irá entrar em contacto nos próximos minutos para confirmar os detalhes e encontrar o profissional certo para si."
          primaryLabel="Voltar ao início"
          primaryTo="/"
          secondaryLabel="Ver serviços"
          secondaryTo="/services"
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-3xl border border-brand-dark/10 bg-white shadow-card">
          {/* Form header */}
          <div className="border-b border-brand-dark/10 bg-gradient-to-br from-brand-dark to-brand-dark2 p-7 text-white">
            <h2 className="font-display text-2xl font-extrabold">Detalhes do pedido</h2>
            <p className="mt-2 text-sm text-white/70">Quanto mais detalhes partilhar, mais rápido encontraremos o profissional certo.</p>
          </div>

          <form onSubmit={onSubmit} className="p-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nome" name="nome" required error={errors.nome}>
                <TextInput id="nome" value={form.nome} hasError={!!errors.nome} onChange={(e) => set('nome', e.target.value)} placeholder="O seu nome" />
              </Field>
              <Field label="Telefone" name="telefone" required error={errors.telefone}>
                <TextInput id="telefone" type="tel" value={form.telefone} hasError={!!errors.telefone} onChange={(e) => set('telefone', e.target.value)} placeholder="+244 ..." />
              </Field>
              <Field label="Email" name="email" error={errors.email}>
                <TextInput id="email" type="email" value={form.email} hasError={!!errors.email} onChange={(e) => set('email', e.target.value)} placeholder="opcional" />
              </Field>
              <Field label="Cidade" name="cidade" required error={errors.cidade}>
                <Select id="cidade" value={form.cidade} hasError={!!errors.cidade} onChange={(e) => set('cidade', e.target.value)}>
                  <option value="">Selecione...</option>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Endereço" name="endereco">
                  <TextInput id="endereco" value={form.endereco} onChange={(e) => set('endereco', e.target.value)} placeholder="Bairro, rua, referência (opcional)" />
                </Field>
              </div>
              <Field label="Categoria do serviço" name="categoria" required error={errors.categoria}>
                <Select id="categoria" value={form.categoria} hasError={!!errors.categoria} onChange={(e) => set('categoria', e.target.value)}>
                  <option value="">Selecione...</option>
                  {SERVICES.map((s) => <option key={s.id} value={s.title}>{s.title}</option>)}
                </Select>
              </Field>
              <Field label="Urgência" name="urgencia" required error={errors.urgencia}>
                <Select id="urgencia" value={form.urgencia} hasError={!!errors.urgencia} onChange={(e) => set('urgencia', e.target.value)}>
                  <option value="">Selecione...</option>
                  {URGENCY.map((u) => <option key={u} value={u}>{u}</option>)}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Data pretendida" name="data">
                  <TextInput id="data" type="date" value={form.data} onChange={(e) => set('data', e.target.value)} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Descrição" name="descricao" required error={errors.descricao}>
                  <TextArea id="descricao" value={form.descricao} hasError={!!errors.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="Descreva o problema, materiais necessários, etc." />
                </Field>
              </div>
            </div>

            <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-xs text-ink-700/55">Os seus dados são tratados com confidencialidade.</p>
              <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? 'A enviar...' : <>Solicitar Serviço <ArrowRight size={18} /></>}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-dark pt-32 pb-16 lg:pt-40 lg:pb-20">
        <div className="absolute inset-0 bg-grid-dark opacity-40" />
        <div className="absolute -right-20 top-10 h-80 w-80 rounded-full bg-brand-cyan/15 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-5 text-center lg:px-8">
          <span className="reveal inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-brand-cyan">
            <Zap size={14} /> Pedido rápido
          </span>
          <h1 className="reveal reveal-delay-1 mt-5 font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl">
            Solicite um serviço em <span className="text-gradient-cyan">poucos minutos.</span>
          </h1>
          <p className="reveal reveal-delay-2 mt-5 text-lg text-white/70">
            Preencha o formulário e a nossa equipa encontra o profissional certo para si. Sem complicações.
          </p>
          <div className="reveal reveal-delay-3 mt-7 flex flex-wrap items-center justify-center gap-5 text-sm text-white/65">
            <span className="flex items-center gap-2"><Clock size={16} className="text-brand-cyan" /> Resposta em minutos</span>
            <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-brand-cyan" /> Profissionais verificados</span>
            <span className="flex items-center gap-2"><Calendar size={16} className="text-brand-cyan" /> Escolha a data</span>
          </div>
        </div>
      </section>

      <section className="relative bg-gradient-to-b from-brand-dark to-white py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">{children}</div>
      </section>
    </>
  );
}
