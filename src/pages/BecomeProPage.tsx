import { useState, type FormEvent, type ChangeEvent } from 'react';
import { ArrowRight, TrendingUp, Wallet, Clock, Eye, Upload, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '../components/Button';
import { Field, TextInput, TextArea, Select } from '../components/Field';
import { SuccessScreen } from '../components/SuccessScreen';
import { CITIES } from '../data';
import { supabase } from '../lib/supabase';

const AREAS = [
  'Canalização', 'Eletricidade', 'Ar Condicionado', 'Refrigeração', 'Pintura',
  'Jardinagem', 'Marcenaria', 'Carpintaria', 'Serralharia', 'Construção Civil',
  'Limpeza', 'Vidraçaria', 'Informática', 'Montagem de Móveis', 'Segurança Eletrônica',
];

const BENEFITS = [
  { icon: TrendingUp, title: 'Receba novos clientes', desc: 'Aumente a sua carteira sem precisar de procurar.' },
  { icon: Wallet, title: 'Aumente sua renda', desc: 'Defina a sua disponibilidade e cresça os seus ganhos.' },
  { icon: Clock, title: 'Trabalhe quando quiser', desc: 'Flexibilidade total. Aceita só o que lhe convém.' },
  { icon: Eye, title: 'Ganhe visibilidade', desc: 'Faça parte da maior rede de profissionais de Angola.' },
];

type Form = {
  nome: string; telefone: string; email: string; cidade: string;
  area: string; especialidade: string; experiencia: string; descricao: string;
  foto: File | null; bi: File | null; termos: boolean;
};

const EMPTY: Form = {
  nome: '', telefone: '', email: '', cidade: '', area: '', especialidade: '',
  experiencia: '', descricao: '', foto: null, bi: null, termos: false,
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

  const onFile = (k: 'foto' | 'bi') => (e: ChangeEvent<HTMLInputElement>) => {
    set(k, e.target.files?.[0] ?? null);
  };

  const validate = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.nome.trim()) e.nome = 'Indique o seu nome';
    if (!form.telefone.trim()) e.telefone = 'Indique o seu telefone';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido';
    if (!form.cidade) e.cidade = 'Selecione a cidade';
    if (!form.area) e.area = 'Selecione a área';
    if (!form.especialidade.trim()) e.especialidade = 'Indique a especialidade';
    if (!form.experiencia.trim()) e.experiencia = 'Indique os anos de experiência';
    if (!form.descricao.trim()) e.descricao = 'Adicione uma descrição';
    if (!form.foto) e.foto = 'Carregue a sua fotografia';
    if (!form.bi) e.bi = 'Carregue o seu BI';
    if (!form.termos) e.termos = 'Tem de aceitar os termos';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('professional_applications').insert({
        nome: form.nome, telefone: form.telefone, email: form.email || null,
        cidade: form.cidade, area: form.area, especialidade: form.especialidade,
        anos_experiencia: form.experiencia, descricao: form.descricao,
        termos_aceites: form.termos,
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
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-3xl border border-brand-dark/10 bg-white shadow-card">
          <div className="border-b border-brand-dark/10 bg-gradient-to-br from-brand-dark to-brand-dark2 p-7 text-white">
            <h2 className="font-display text-2xl font-extrabold">Registo de profissional</h2>
            <p className="mt-2 text-sm text-white/70">Preencha os dados abaixo. A aprovação é rápida e gratuita.</p>
          </div>

          <form onSubmit={onSubmit} className="p-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nome" name="nome" required error={errors.nome}>
                <TextInput id="nome" value={form.nome} hasError={!!errors.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Nome completo" />
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
              <Field label="Área de atuação" name="area" required error={errors.area}>
                <Select id="area" value={form.area} hasError={!!errors.area} onChange={(e) => set('area', e.target.value)}>
                  <option value="">Selecione...</option>
                  {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </Select>
              </Field>
              <Field label="Especialidade" name="especialidade" required error={errors.especialidade}>
                <TextInput id="especialidade" value={form.especialidade} hasError={!!errors.especialidade} onChange={(e) => set('especialidade', e.target.value)} placeholder="Ex: Reparação de caldeiras" />
              </Field>
              <Field label="Anos de experiência" name="experiencia" required error={errors.experiencia}>
                <TextInput id="experiencia" type="number" min="0" value={form.experiencia} hasError={!!errors.experiencia} onChange={(e) => set('experiencia', e.target.value)} placeholder="Ex: 5" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Descrição" name="descricao" required error={errors.descricao}>
                  <TextArea id="descricao" value={form.descricao} hasError={!!errors.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="Fale sobre si, os seus serviços e diferenciais." />
                </Field>
              </div>

              {/* Uploads */}
              <FileUpload label="Fotografia" name="foto" icon={ImageIcon} file={form.foto} error={errors.foto} onChange={onFile('foto')} />
              <FileUpload label="Bilhete de Identidade (BI)" name="bi" icon={FileText} file={form.bi} error={errors.bi} onChange={onFile('bi')} />

              {/* Terms */}
              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-dark/10 bg-brand-dark/[0.02] p-4">
                  <input
                    type="checkbox"
                    checked={form.termos}
                    onChange={(e) => set('termos', e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-brand-dark/30 text-brand-cyan focus:ring-brand-cyan/50"
                  />
                  <span className="text-sm text-ink-700/80">
                    Aceito os <a href="#" className="font-semibold text-brand-cyan2 underline">termos e condições</a> e a <a href="#" className="font-semibold text-brand-cyan2 underline">política de privacidade</a> da AUTONOMOUS.
                    {errors.termos && <span className="mt-1 block text-xs font-medium text-red-500">{errors.termos}</span>}
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
        </div>
      </div>
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
      <span className="text-sm font-semibold text-brand-dark">{label} <span className="text-brand-cyan2">*</span></span>
      <label
        htmlFor={name}
        className={`mt-1.5 flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed p-5 transition-all duration-200 hover:border-brand-cyan hover:bg-brand-cyan/[0.03] ${
          error ? 'border-red-300' : 'border-brand-dark/20'
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan/10 text-brand-cyan2">
          <Icon size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-brand-dark">
            {file ? file.name : 'Clique para carregar'}
          </p>
          <p className="text-xs text-ink-700/55">{file ? `${(file.size / 1024).toFixed(0)} KB` : 'PNG, JPG ou PDF · máx 5MB'}</p>
        </div>
        <Upload size={18} className="text-ink-700/40" />
      </label>
      <input id={name} type="file" accept="image/*,application/pdf" className="sr-only" onChange={onChange} />
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <section className="relative overflow-hidden bg-brand-dark pt-32 pb-16 lg:pt-40 lg:pb-20">
        <div className="absolute inset-0 bg-grid-dark opacity-40" />
        <div className="absolute -left-20 top-10 h-80 w-80 rounded-full bg-brand-cyan/15 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-5 text-center lg:px-8">
          <span className="reveal inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-brand-cyan">
            <TrendingUp size={14} /> Junte-se à rede
          </span>
          <h1 className="reveal reveal-delay-1 mt-5 font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl">
            Faça parte da maior rede de <span className="text-gradient-cyan">profissionais de Angola.</span>
          </h1>
          <p className="reveal reveal-delay-2 mt-5 text-lg text-white/70">
            Receba novos clientes, aumente a sua renda e trabalhe com flexibilidade.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-brand-dark3 py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b, i) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className={`reveal reveal-delay-${i + 1} rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur`}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-cyan/15 text-brand-cyan">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-white">{b.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/65">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-brand-dark3 to-white py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">{children}</div>
      </section>
    </>
  );
}
