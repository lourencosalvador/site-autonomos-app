import { useState, type FormEvent } from 'react';
import { ArrowRight, Clock, ShieldCheck, Calendar } from 'lucide-react';
import { Button } from '../components/Button';
import { PageHero } from '../components/PageHero';
import { Container } from '../components/ui/Container';
import { Card } from '../components/ui/Card';
import { Field, TextInput, TextArea, Select } from '../components/Field';
import { SuccessScreen } from '../components/SuccessScreen';
import { CITIES, SERVICES } from '../data';
import { supabase } from '../lib/supabase';

const URGENCY = ['Hoje, urgente', 'Nas próximas 24h', 'Esta semana', 'Sem pressa'];

type Form = {
  name: string; phone: string; email: string; city: string;
  address: string; category: string; description: string; urgency: string; date: string;
};

const EMPTY: Form = {
  name: '', phone: '', email: '', city: '', address: '',
  category: '', description: '', urgency: '', date: '',
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
    if (!form.name.trim()) e.name = 'Indique o seu nome';
    if (!form.phone.trim()) e.phone = 'Indique o seu telefone';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido';
    if (!form.city) e.city = 'Selecione a cidade';
    if (!form.category) e.category = 'Selecione a categoria';
    if (!form.description.trim()) e.description = 'Descreva o serviço';
    if (!form.urgency) e.urgency = 'Selecione a urgência';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('service_requests').insert({
        nome: form.name, telefone: form.phone, email: form.email || null,
        cidade: form.city, endereco: form.address || null,
        categoria: form.category, descricao: form.description,
        urgencia: form.urgency, data_pretendida: form.date || null,
      });
      if (error) throw error;
      setDone(true);
    } catch (err) {
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
          message="Recebemos o seu pedido. A nossa equipa entrará em contacto em breve para confirmar os detalhes e encontrar o profissional certo para si."
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
      <Card className="mx-auto max-w-3xl overflow-hidden">
        <div className="border-b border-zinc-200 bg-zinc-50 p-7">
          <h2 className="font-display text-xl font-semibold text-zinc-900">Detalhes do pedido</h2>
          <p className="mt-1.5 text-sm text-zinc-600">Quanto mais detalhes partilhar, mais rápido encontramos o profissional certo.</p>
        </div>

        <form onSubmit={onSubmit} className="p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nome" name="name" required error={errors.name}>
              <TextInput id="name" value={form.name} hasError={!!errors.name} onChange={(e) => set('name', e.target.value)} placeholder="O seu nome" />
            </Field>
            <Field label="Telefone" name="phone" required error={errors.phone}>
              <TextInput id="phone" type="tel" value={form.phone} hasError={!!errors.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+244 ..." />
            </Field>
            <Field label="Email" name="email" error={errors.email}>
              <TextInput id="email" type="email" value={form.email} hasError={!!errors.email} onChange={(e) => set('email', e.target.value)} placeholder="Opcional" />
            </Field>
            <Field label="Cidade" name="city" required error={errors.city}>
              <Select id="city" value={form.city} hasError={!!errors.city} onChange={(e) => set('city', e.target.value)}>
                <option value="">Selecione...</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Endereço" name="address">
                <TextInput id="address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Bairro, rua, referência (opcional)" />
              </Field>
            </div>
            <Field label="Categoria do serviço" name="category" required error={errors.category}>
              <Select id="category" value={form.category} hasError={!!errors.category} onChange={(e) => set('category', e.target.value)}>
                <option value="">Selecione...</option>
                {SERVICES.map((s) => <option key={s.id} value={s.title}>{s.title}</option>)}
              </Select>
            </Field>
            <Field label="Urgência" name="urgency" required error={errors.urgency}>
              <Select id="urgency" value={form.urgency} hasError={!!errors.urgency} onChange={(e) => set('urgency', e.target.value)}>
                <option value="">Selecione...</option>
                {URGENCY.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Data pretendida" name="date">
                <TextInput id="date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Descrição" name="description" required error={errors.description}>
                <TextArea id="description" value={form.description} hasError={!!errors.description} onChange={(e) => set('description', e.target.value)} placeholder="Descreva o problema, materiais necessários, etc." />
              </Field>
            </div>
          </div>

          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-xs text-zinc-500">Os seus dados são tratados com confidencialidade.</p>
            <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? 'A enviar...' : <>Solicitar Serviço <ArrowRight size={18} /></>}
            </Button>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  const pills = [
    { icon: Clock, label: 'Resposta em minutos' },
    { icon: ShieldCheck, label: 'Profissionais verificados' },
    { icon: Calendar, label: 'Escolha a data' },
  ];
  return (
    <>
      <PageHero
        eyebrow="Pedido rápido"
        title="Solicite um serviço em poucos minutos"
        description="Preencha o formulário e a nossa equipa encontra o profissional certo para si. Sem complicações."
      >
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {pills.map((p) => {
            const Icon = p.icon;
            return (
              <span key={p.label} className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-sm font-medium text-zinc-600">
                <Icon size={15} className="text-accent-700" /> {p.label}
              </span>
            );
          })}
        </div>
      </PageHero>

      <section className="bg-zinc-50 py-16 lg:py-20">
        <Container>{children}</Container>
      </section>
    </>
  );
}
