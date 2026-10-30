import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Briefcase, UserRound } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { TextInput } from '../../components/Field';
import { Btn } from '../../components/app/ui';
import { FormField, PasswordInput, PhoneInput } from '../../components/app/forms';
import { ProfessionalForm } from '../../components/app/ProfessionalForm';
import { useToast } from '../../components/Toast';
import { useAuth, type Role } from '../../auth/AuthContext';
import { isValidAoPhone } from '../../lib/phone';
import { hashParam, navigate } from '../../router';

type Key = 'name' | 'email' | 'phone' | 'password' | 'confirm';

export function nextPath(): string {
  const next = hashParam('next');
  return next && next.startsWith('/conta') ? next : '/conta';
}

function withNext(path: string) {
  const next = hashParam('next');
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}

export function RegisterPage() {
  const initialRole = hashParam('tipo') === 'profissional' ? 'professional' : null;
  const [role, setRole] = useState<Role | null>(initialRole);

  const footer = <>Já tem conta? <button onClick={() => navigate(withNext('/entrar'))} className="font-semibold text-brand-dark underline-offset-4 hover:underline">Entrar</button></>;

  if (!role) {
    return (
      <AuthShell title="Criar conta" subtitle="Como quer usar a AUTONOMOUS?" footer={footer}>
        <div className="space-y-3">
          <RoleCard icon={UserRound} title="Sou cliente" desc="Quero contratar profissionais de confiança." onClick={() => setRole('client')} />
          <RoleCard icon={Briefcase} title="Sou profissional" desc="Quero receber pedidos de clientes." onClick={() => setRole('professional')} />
        </div>
      </AuthShell>
    );
  }

  const back = (
    <button onClick={() => setRole(null)} className="mb-6 inline-flex items-center gap-1.5 text-[15px] font-medium text-ink-500 hover:text-ink-900">
      <ArrowLeft size={16} /> Mudar tipo de conta
    </button>
  );

  if (role === 'professional') {
    return (
      <AuthShell wide title="Conta de profissional" subtitle="Preencha os seus dados. A nossa equipa verifica o perfil antes de começar a receber pedidos." footer={footer}>
        {back}
        <ProfessionalForm onDone={() => navigate('/conta')} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Conta de cliente" subtitle="Leva menos de um minuto." footer={footer}>
      {back}
      <ClientForm />
    </AuthShell>
  );
}

function ClientForm() {
  const { signUp } = useAuth();
  const { success } = useToast();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: Key, v: string) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); setFormError(null); };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (busy) return;
    const e: Partial<Record<Key, string>> = {};
    if (f.name.trim().length < 2) e.name = 'Indique o seu nome.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Email inválido.';
    if (f.phone && !isValidAoPhone(f.phone)) e.phone = 'Indique 9 dígitos, a começar por 9.';
    if (f.password.length < 6) e.password = 'Mínimo 6 caracteres.';
    if (f.confirm !== f.password) e.confirm = 'As palavras-passe não coincidem.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const { needsConfirmation } = await signUp({ role: 'client', name: f.name, email: f.email, phone: f.phone || null, password: f.password });
      if (needsConfirmation) { success('Conta criada', 'Confirme o seu email para poder entrar.'); navigate(withNext('/entrar')); }

    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível criar a conta.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <FormField label="Nome completo" htmlFor="name" required error={errors.name}>
        <TextInput id="name" value={f.name} hasError={!!errors.name} onChange={(e) => set('name', e.target.value)} placeholder="O seu nome" autoFocus />
      </FormField>
      <FormField label="Email" htmlFor="email" required error={errors.email}>
        <TextInput id="email" type="email" autoComplete="email" value={f.email} hasError={!!errors.email} onChange={(e) => set('email', e.target.value)} placeholder="o.seu@email.com" />
      </FormField>
      <FormField label="Telefone / WhatsApp" htmlFor="phone" optional error={errors.phone}>
        <PhoneInput id="phone" value={f.phone} onChange={(v) => set('phone', v)} hasError={!!errors.phone} />
      </FormField>
      <FormField label="Palavra-passe" htmlFor="password" required error={errors.password}>
        <PasswordInput id="password" value={f.password} onChange={(v) => set('password', v)} hasError={!!errors.password} placeholder="Mínimo 6 caracteres" />
      </FormField>
      <FormField label="Confirmar palavra-passe" htmlFor="confirm" required error={errors.confirm}>
        <PasswordInput id="confirm" value={f.confirm} onChange={(v) => set('confirm', v)} hasError={!!errors.confirm} placeholder="Repita a palavra-passe" />
      </FormField>

      {formError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-700">{formError}</p>}

      <Btn type="submit" loading={busy} className="w-full">{busy ? 'A criar conta…' : <>Criar conta <ArrowRight size={18} /></>}</Btn>
      <p className="text-center text-sm leading-relaxed text-ink-400">Ao criar conta, aceita os Termos de Serviço e a Política de Privacidade da AUTONOMOUS.</p>
    </form>
  );
}

function RoleCard({ icon: Icon, title, desc, onClick }: { icon: typeof UserRound; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border border-line bg-white p-5 text-left transition-colors hover:border-brand-dark/30 hover:bg-cloud-50"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cloud-100 text-brand-dark">
        <Icon size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-ink-900">{title}</p>
        <p className="mt-0.5 text-[15px] text-ink-500">{desc}</p>
      </div>
      <ArrowRight size={18} className="shrink-0 text-ink-300 transition-colors group-hover:text-brand-dark" />
    </button>
  );
}
