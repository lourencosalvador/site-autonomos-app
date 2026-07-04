import { useState, type FormEvent } from 'react';
import { ArrowRight, BellRing, CheckCircle2, LogIn, ShieldCheck, Smartphone } from 'lucide-react';
import { Button } from './Button';
import { Field, TextInput, Select } from './Field';
import { CITIES } from '../data';
import { submitClientSignup } from '../lib/clientSignup';

const AVATARS = [
  'https://images.pexels.com/photos/33569519/pexels-photo-33569519.jpeg?auto=compress&cs=tinysrgb&w=96',
  'https://images.pexels.com/photos/19379640/pexels-photo-19379640.jpeg?auto=compress&cs=tinysrgb&w=96',
  'https://images.pexels.com/photos/37038761/pexels-photo-37038761.jpeg?auto=compress&cs=tinysrgb&w=96',
  'https://images.pexels.com/photos/19039168/pexels-photo-19039168.jpeg?auto=compress&cs=tinysrgb&w=96',
];

const PERKS = [
  { icon: LogIn, title: 'Conta pronta no lançamento', desc: 'Quando a app chegar, só fazes login. Zero configuração.' },
  { icon: BellRing, title: 'Aviso em primeira mão', desc: 'És dos primeiros a saber quando abrirmos.' },
  { icon: ShieldCheck, title: 'Lugar reservado', desc: 'O teu acesso à rede de profissionais fica garantido.' },
];

type Form = { nome: string; telefone: string; email: string; cidade: string };
const EMPTY: Form = { nome: '', telefone: '+244 ', email: '', cidade: '' };

export function ClientSignupSection() {
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
    if (form.telefone.replace(/\D/g, '').length < 9) e.telefone = 'Indique um telefone válido';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      // Best-effort: the welcome experience is shown regardless of persistence.
      await submitClientSignup({
        name: form.nome,
        phone: form.telefone,
        email: form.email || undefined,
        city: form.cidade || undefined,
      });
    } finally {
      setSubmitting(false);
      setDone(true);
    }
  };

  return (
    <section className="relative overflow-hidden bg-brand-dark py-24">
      {/* ambient glow / grid */}
      <div className="absolute inset-0 bg-grid-dark opacity-25" />
      <div className="absolute -left-20 top-0 h-96 w-96 animate-blob rounded-full bg-brand-cyan/15 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-lilac-200/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8">
        {/* ===== LEFT — value proposition ===== */}
        <div className="reveal-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-cyan ring-1 ring-inset ring-white/10">
            <Smartphone size={13} />
            App AUTONOMOUS · Em breve
          </span>

          <h2 className="mt-5 font-display text-3xl font-extrabold leading-[1.1] text-white sm:text-4xl lg:text-[2.75rem]">
            Crie a sua conta de cliente <span className="text-gradient-cyan">antes de todos.</span>
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            Estamos a preparar a app da AUTONOMOUS. Regista-te agora como cliente e,
            quando lançarmos, só tens de fazer login — a tua conta já está à espera.
          </p>

          <ul className="mt-8 space-y-4">
            {PERKS.map((p) => {
              const Icon = p.icon;
              return (
                <li key={p.title} className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-cyan/12 text-brand-cyan ring-1 ring-inset ring-brand-cyan/20">
                    <Icon size={20} />
                  </span>
                  <div>
                    <p className="font-semibold text-white">{p.title}</p>
                    <p className="mt-0.5 text-sm text-white/55">{p.desc}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-9 flex items-center gap-4">
            <div className="flex -space-x-3">
              {AVATARS.map((src) => (
                <img key={src} src={src} alt="" loading="lazy" className="h-9 w-9 rounded-full object-cover ring-2 ring-brand-dark" />
              ))}
            </div>
            <p className="text-sm text-white/60">
              <span className="font-bold text-white">+1.200</span> pessoas já reservaram o lugar.
            </p>
          </div>
        </div>

        {/* ===== RIGHT — form / success ===== */}
        <div className="reveal-right">
          <div className="relative rounded-[2rem] bg-white p-2 shadow-cardDark">
            {/* glowing border accent */}
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-brand-cyan/20" />

            {done ? (
              <div className="animate-scaleIn rounded-[1.6rem] px-7 py-12 text-center sm:px-9">
                <div className="mx-auto flex h-20 w-20 animate-pulseGlow items-center justify-center rounded-full bg-brand-cyan/15">
                  <CheckCircle2 className="h-11 w-11 text-brand-cyan2" />
                </div>
                <h3 className="mt-6 font-display text-2xl font-extrabold text-brand-dark">
                  Bem-vindo à AUTONOMOUS! 🎉
                </h3>
                <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-ink-700/75">
                  Agora fazes parte da <span className="font-semibold text-brand-dark">rede de clientes</span> da
                  AUTONOMOUS. Entraremos em contacto assim que a app estiver disponível
                  para começares a solicitar serviços.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-cyan/10 px-4 py-2 text-sm font-medium text-brand-dark">
                  <BellRing size={15} className="text-brand-cyan2" />
                  Vais receber o aviso de lançamento em primeira mão.
                </div>
                <div className="mt-8">
                  <Button to="/solicitar-servico" size="md" className="w-full sm:w-auto">
                    Solicitar um serviço agora <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="rounded-[1.6rem] p-6 sm:p-8">
                <h3 className="font-display text-xl font-extrabold text-brand-dark">Junta-te à rede de clientes</h3>
                <p className="mt-1.5 text-sm text-ink-700/70">
                  Leva menos de um minuto. É grátis.
                </p>

                <div className="mt-6 grid gap-4">
                  <Field label="Nome" name="nome" required error={errors.nome}>
                    <TextInput id="nome" value={form.nome} hasError={!!errors.nome} onChange={(e) => set('nome', e.target.value)} placeholder="O seu nome completo" />
                  </Field>
                  <Field label="Telefone / WhatsApp" name="telefone" required error={errors.telefone}>
                    <TextInput id="telefone" type="tel" value={form.telefone} hasError={!!errors.telefone} onChange={(e) => set('telefone', e.target.value)} placeholder="+244 923 456 789" />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Email" name="email" error={errors.email}>
                      <TextInput id="email" type="email" value={form.email} hasError={!!errors.email} onChange={(e) => set('email', e.target.value)} placeholder="opcional" />
                    </Field>
                    <Field label="Cidade" name="cidade">
                      <Select id="cidade" value={form.cidade} onChange={(e) => set('cidade', e.target.value)}>
                        <option value="">Selecione...</option>
                        {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </Select>
                    </Field>
                  </div>
                </div>

                <div className="mt-6">
                  <Button type="submit" size="lg" disabled={submitting} className="w-full">
                    {submitting ? 'A reservar o seu lugar...' : <>Quero fazer parte <ArrowRight size={18} /></>}
                  </Button>
                </div>
                <p className="mt-3 text-center text-xs text-ink-700/55">
                  Ao continuar aceita a nossa Política de Privacidade. Sem spam — prometido.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
