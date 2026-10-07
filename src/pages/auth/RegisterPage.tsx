import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Briefcase, Eye, EyeOff, Loader2, UserRound } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Field, TextInput, Select } from '../../components/Field';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { useAuth, type Role } from '../../auth/AuthContext';
import { useCategories } from '../../hooks/useServices';
import { navigate } from '../../router';

export function RegisterPage() {
  const { signUp } = useAuth();
  const { success } = useToast();
  const categories = useCategories();
  const [role, setRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '+244 ', workArea: '', password: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => { setForm((f) => ({ ...f, [k]: v })); setError(null); };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !role) return;
    setError(null);
    if (form.name.trim().length < 2) return setError('Indique o seu nome.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Email inválido.');
    if (role === 'professional' && !form.workArea) return setError('Escolha a sua área de trabalho.');
    if (form.password.length < 6) return setError('A palavra-passe deve ter pelo menos 6 caracteres.');

    setBusy(true);
    try {
      const { needsConfirmation } = await signUp({
        name: form.name,
        email: form.email,
        password: form.password,
        role,
        phone: form.phone.replace(/\D/g, '').length >= 9 ? form.phone.trim() : null,
        workArea: role === 'professional' ? form.workArea : null,
      });
      if (needsConfirmation) {
        success('Conta criada!', 'Confirme o seu email para poder entrar.');
        navigate('/entrar');
      } else {
        navigate('/conta');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a conta.');
    } finally {
      setBusy(false);
    }
  };

  // Passo 1: escolher o tipo de conta
  if (!role) {
    return (
      <AuthShell
        title="Criar conta"
        subtitle="Como quer usar a AUTONOMOUS?"
        footer={<>Já tem conta? <button onClick={() => navigate('/entrar')} className="font-semibold text-brand-dark underline-offset-4 hover:underline">Entrar</button></>}
      >
        <div className="space-y-3">
          <RoleCard
            icon={UserRound} title="Sou cliente" desc="Preciso de contratar profissionais de confiança."
            onClick={() => setRole('client')}
          />
          <RoleCard
            icon={Briefcase} title="Sou profissional" desc="Quero receber pedidos e novos clientes."
            onClick={() => setRole('professional')}
          />
        </div>
      </AuthShell>
    );
  }

  // Passo 2: formulário
  return (
    <AuthShell
      title={role === 'client' ? 'Conta de cliente' : 'Conta de profissional'}
      subtitle="Leva menos de um minuto."
      footer={<>Já tem conta? <button onClick={() => navigate('/entrar')} className="font-semibold text-brand-dark underline-offset-4 hover:underline">Entrar</button></>}
    >
      <button onClick={() => { setRole(null); setError(null); }} className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-900">
        <ArrowLeft size={15} /> Mudar tipo de conta
      </button>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Nome completo" name="name" required>
          <TextInput id="name" value={form.name} hasError={!!error} onChange={(e) => set('name', e.target.value)} placeholder="O seu nome" autoFocus />
        </Field>
        <Field label="Email" name="email" required>
          <TextInput id="email" type="email" autoComplete="email" value={form.email} hasError={!!error} onChange={(e) => set('email', e.target.value)} placeholder="o.seu@email.com" />
        </Field>
        <Field label="Telefone / WhatsApp" name="phone">
          <TextInput id="phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+244 923 456 789" />
        </Field>
        {role === 'professional' && (
          <Field label="Área de trabalho" name="workArea" required>
            <Select id="workArea" value={form.workArea} hasError={!!error} onChange={(e) => set('workArea', e.target.value)}>
              <option value="">Selecione…</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Palavra-passe" name="password" required>
          <div className="relative">
            <TextInput id="password" type={show ? 'text' : 'password'} autoComplete="new-password" value={form.password} hasError={!!error}
              onChange={(e) => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" className="pr-11" />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ocultar' : 'Mostrar'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? <><Loader2 size={18} className="animate-spin" /> A criar…</> : <>Criar conta <ArrowRight size={18} /></>}
        </Button>
        <p className="text-center text-xs leading-relaxed text-ink-400">
          Ao criar conta, aceita os Termos de Serviço e a Política de Privacidade da AUTONOMOUS.
        </p>
      </form>
    </AuthShell>
  );
}

function RoleCard({ icon: Icon, title, desc, onClick }: { icon: typeof UserRound; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border border-cloud-200 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-cyan/50 hover:shadow-card"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-dark transition-colors group-hover:bg-brand-cyan group-hover:text-brand-dark">
        <Icon size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold text-ink-900">{title}</p>
        <p className="mt-0.5 text-sm text-ink-500">{desc}</p>
      </div>
      <ArrowRight size={18} className="shrink-0 text-ink-300 transition-colors group-hover:text-brand-dark" />
    </button>
  );
}
