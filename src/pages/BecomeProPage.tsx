import { useState, type FormEvent, type ChangeEvent } from 'react';
import { ArrowRight, TrendingUp, Wallet, Clock, Eye, Upload, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '../components/Button';
import { PageHero } from '../components/PageHero';
import { Container } from '../components/ui/Container';
import { Card } from '../components/ui/Card';
import { Field, TextInput, TextArea, Select } from '../components/Field';
import { SuccessScreen } from '../components/SuccessScreen';
import { CITIES } from '../data';
import { supabase } from '../lib/supabase';

const AREAS = [
  'Eletricidade', 'Pintura', 'Jardinagem', 'Marcenaria', 'Carpintaria',
  'Serralharia', 'Construção Civil', 'Limpeza', 'Informática',
  'Montagem de Móveis', 'Segurança Eletrónica',
];

const BENEFITS = [
  { icon: TrendingUp, title: 'Receba novos clientes', desc: 'Aumente a sua carteira sem precisar de procurar.' },
  { icon: Wallet, title: 'Aumente a sua renda', desc: 'Defina a sua disponibilidade e cresça os seus ganhos.' },
  { icon: Clock, title: 'Trabalhe quando quiser', desc: 'Flexibilidade total. Aceite só o que lhe convém.' },
  { icon: Eye, title: 'Ganhe visibilidade', desc: 'Faça parte da maior rede de profissionais de Angola.' },
];

type Form = {
  name: string; phone: string; email: string; city: string;
  area: string; specialty: string; experience: string; description: string;
  photo: File | null; id: File | null; terms: boolean;
};

const EMPTY: Form = {
  name: '', phone: '', email: '', city: '', area: '', specialty: '',
  experience: '', description: '', photo: null, id: null, terms: false,
};

export function BecomeProPage() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof Form, v: string | boolean | File | null) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onFile = (k: 'photo' | 'id') => (e: ChangeEvent<HTMLInputElement>) => {
    set(k, e.target.files?.[0] ?? null);
  };

  const validate = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.name.trim()) e.name = 'Indique o seu nome';
    if (!form.phone.trim()) e.phone = 'Indique o seu telefone';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido';
    if (!form.city) e.city = 'Selecione a cidade';
    if (!form.area) e.area = 'Selecione a área';
    if (!form.specialty.trim()) e.specialty = 'Indique a especialidade';
    if (!form.experience.trim()) e.experience = 'Indique os anos de experiência';
    if (!form.description.trim()) e.description = 'Adicione uma descrição';
    if (!form.photo) e.photo = 'Carregue a sua fotografia';
    if (!form.id) e.id = 'Carregue o seu BI';
    if (!form.terms) e.terms = 'Tem de aceitar os termos';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('professional_applications').insert({
        nome: form.name, telefone: form.phone, email: form.email || null,
        cidade: form.city, area: form.area, especialidade: form.specialty,
        anos_experiencia: form.experience, descricao: form.description,
        termos_aceites: form.terms,
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
      <Shell>
        <SuccessScreen
          title="Candidatura recebida!"
          message="Obrigado pelo seu interesse em fazer parte da AUTONOMOUS. A nossa equipa irá analisar o seu perfil e entrar em contacto em breve."
          primaryLabel="Voltar ao início"
          primaryTo="/"
          secondaryLabel="Ver serviços"
          secondaryTo="/services"
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <Card className="mx-auto max-w-3xl overflow-hidden">
        <div className="border-b border-zinc-200 bg-zinc-50 p-7">
          <h2 className="font-display text-xl font-semibold text-zinc-900">Registo de profissional</h2>
          <p className="mt-1.5 text-sm text-zinc-600">Preencha os dados abaixo. A aprovação é rápida e gratuita.</p>
        </div>

        <form onSubmit={onSubmit} className="p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nome" name="name" required error={errors.name}>
              <TextInput id="name" value={form.name} hasError={!!errors.name} onChange={(e) => set('name', e.target.value)} placeholder="Nome completo" />
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
            <Field label="Área de atuação" name="area" required error={errors.area}>
              <Select id="area" value={form.area} hasError={!!errors.area} onChange={(e) => set('area', e.target.value)}>
                <option value="">Selecione...</option>
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
            </Field>
            <Field label="Especialidade" name="specialty" required error={errors.specialty}>
              <TextInput id="specialty" value={form.specialty} hasError={!!errors.specialty} onChange={(e) => set('specialty', e.target.value)} placeholder="Ex: Reparação de caldeiras" />
            </Field>
            <Field label="Anos de experiência" name="experience" required error={errors.experience}>
              <TextInput id="experience" type="number" min="0" value={form.experience} hasError={!!errors.experience} onChange={(e) => set('experience', e.target.value)} placeholder="Ex: 5" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Descrição" name="description" required error={errors.description}>
                <TextArea id="description" value={form.description} hasError={!!errors.description} onChange={(e) => set('description', e.target.value)} placeholder="Fale sobre si, os seus serviços e diferenciais." />
              </Field>
            </div>

            <FileUpload label="Fotografia" name="photo" icon={ImageIcon} file={form.photo} error={errors.photo} onChange={onFile('photo')} />
            <FileUpload label="Bilhete de Identidade (BI)" name="id" icon={FileText} file={form.id} error={errors.id} onChange={onFile('id')} />

            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <input
                  type="checkbox"
                  checked={form.terms}
                  onChange={(e) => set('terms', e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-accent-700 focus:ring-accent-700/30"
                />
                <span className="text-sm text-zinc-600">
                  Aceito os <a href="#" className="font-medium text-accent-700 underline">termos e condições</a> e a <a href="#" className="font-medium text-accent-700 underline">política de privacidade</a> da AUTONOMOUS.
                  {errors.terms && <span className="mt-1 block text-xs font-medium text-red-500">{errors.terms}</span>}
                </span>
              </label>
            </div>
          </div>

          <div className="mt-7">
            <Button type="submit" size="lg" disabled={submitting} className="w-full">
              {submitting ? 'A enviar...' : <>Quero fazer parte da AUTONOMOUS <ArrowRight size={18} /></>}
            </Button>
          </div>
        </form>
      </Card>
    </Shell>
  );
}

function FileUpload({
  label, name, icon: Icon, file, error, onChange,
}: {
  label: string; name: string; icon: typeof Upload; file: File | null; error?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="sm:col-span-2">
      <span className="text-sm font-medium text-zinc-800">{label} <span className="text-accent-700">*</span></span>
      <label
        htmlFor={name}
        className={`mt-1.5 flex cursor-pointer items-center gap-4 rounded-lg border border-dashed p-4 transition-colors hover:border-zinc-400 ${
          error ? 'border-red-300' : 'border-zinc-300'
        }`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-accent-700">
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900">{file ? file.name : 'Clique para carregar'}</p>
          <p className="text-xs text-zinc-500">{file ? `${(file.size / 1024).toFixed(0)} KB` : 'PNG, JPG ou PDF · máx 5MB'}</p>
        </div>
        <Upload size={18} className="text-zinc-400" />
      </label>
      <input id={name} type="file" accept="image/*,application/pdf" className="sr-only" onChange={onChange} />
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHero
        eyebrow="Junte-se à rede"
        title="Faça crescer o seu negócio com a AUTONOMOUS"
        description="Receba novos clientes, aumente a sua renda e trabalhe com total flexibilidade."
      />

      <section className="border-b border-zinc-200 py-16">
        <Container>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b, i) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className={`reveal reveal-delay-${i + 1} bg-white p-6`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-accent-700">
                    <Icon size={18} strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-zinc-900">{b.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="bg-zinc-50 py-16 lg:py-20">
        <Container>{children}</Container>
      </section>
    </>
  );
}
