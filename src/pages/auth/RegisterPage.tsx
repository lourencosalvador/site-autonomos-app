import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Briefcase, Eye, EyeOff, UserRound } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Field, TextInput } from '../../components/Field';
import { Btn } from '../../components/app/ui';
import { AreaPicker, CompanyField } from '../../components/app/AreaPicker';
import { useToast } from '../../components/Toast';
import { useAuth, type Role } from '../../auth/AuthContext';
import { useCategories } from '../../hooks/useServices';
import { navigate } from '../../router';

type FieldKey = 'name' | 'email' | 'areas' | 'company' | 'password';

export function RegisterPage() {
  const { signUp } = useAuth();
  const { success } = useToast();
  const categories = useCategories();
  const [role, setRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '+244 ', password: '' });
  const [areas, setAreas] = useState<string[]>([]);
  const [isCompany, setIsCompany] = useState(false);
  const [company, setCompany] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: FieldKey | null; message: string } | null>(null);

  const set = (k: keyof typeof form, v: string) => { setForm((f) => ({ ...f, [k]: v })); setError(null); };
  const fail = (field: FieldKey, message: string) => setError({ field, message });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !role) return;
    const isPro = role === 'professional';
    if (form.name.trim().length < 2) return fail('name', 'Indique o seu nome.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return fail('email', 'Email inválido.');
    if (isPro && areas.length === 0) return fail('areas', 'Escolha pelo menos uma área de atuação.');
    if (isPro && isCompany && company.trim().length < 2) return fail('company', 'Indique o nome da empresa.');
    if (form.password.length < 6) return fail('password', 'A palavra-passe deve ter pelo menos 6 caracteres.');

    setBusy(true);
    try {
      const { needsConfirmation } = await signUp({
        name: form.name,
        email: form.email,
        password: form.password,
        role,
        phone: form.phone.replace(/\D/g, '').length >= 9 ? form.phone.trim() : null,
        workAreas: isPro ? areas : [],
        companyName: isPro && isCompany ? company.trim() : null,
      });
      if (needsConfirmation) {
        success('Conta criada', 'Confirme o seu email para poder entrar.');
        navigate('/entrar');
      } else {
        navigate('/conta');
      }
    } catch (err) {
      setError({ field: null, message: err instanceof Error ? err.message : 'Não foi possível criar a conta.' });
    } finally {
      setBusy(false);
    }
  };

  const footer = <>Já tem conta? <button onClick={() => navigate('/entrar')} className="font-semibold text-brand-dark underline-offset-4 hover:underline">Entrar</button></>;

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

  const err = (f: FieldKey) => error?.field === f;

  return (
    <AuthShell
      title={role === 'client' ? 'Conta de cliente' : 'Conta de profissional'}
      subtitle={role === 'client' ? 'Leva menos de um minuto.' : 'Depois de criar a conta, a nossa equipa verifica o seu perfil.'}
      footer={footer}
    >
      <button onClick={() => { setRole(null); setError(null); }} className="mb-5 inline-flex items-center gap-1.5 text-[15px] font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft size={16} /> Mudar tipo de conta
      </button>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field label="Nome completo" name="name" required error={err('name') ? error?.message : undefined}>
          <TextInput id="name" value={form.name} hasError={err('name')} onChange={(e) => set('name', e.target.value)} placeholder="O seu nome" autoFocus />
        </Field>
        <Field label="Email" name="email" required error={err('email') ? error?.message : undefined}>
          <TextInput id="email" type="email" autoComplete="email" value={form.email} hasError={err('email')} onChange={(e) => set('email', e.target.value)} placeholder="o.seu@email.com" />
        </Field>
        <Field label="Telefone / WhatsApp" name="phone">
          <TextInput id="phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+244 923 456 789" />
        </Field>

        {role === 'professional' && (
          <>
            <Field label="Áreas de atuação" name="areas" required error={err('areas') ? error?.message : undefined}>
              <AreaPicker options={categories} value={areas} onChange={(v) => { setAreas(v); setError(null); }} hasError={err('areas')} />
            </Field>
            <div>
              <CompanyField
                enabled={isCompany}
                name={company}
                onToggle={(v) => { setIsCompany(v); setError(null); }}
                onName={(v) => { setCompany(v); setError(null); }}
                hasError={err('company')}
              />
              {err('company') && <p className="mt-1.5 text-sm font-medium text-red-600">{error?.message}</p>}
            </div>
          </>
        )}

        <Field label="Palavra-passe" name="password" required error={err('password') ? error?.message : undefined}>
          <div className="relative">
            <TextInput id="password" type={show ? 'text' : 'password'} autoComplete="new-password" value={form.password} hasError={err('password')}
              onChange={(e) => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" className="pr-12" />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ocultar' : 'Mostrar'}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 hover:text-ink-700">
              {show ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
        </Field>

        {error && !error.field && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-700">{error.message}</p>}

        <Btn type="submit" loading={busy} className="w-full">
          {busy ? 'A criar conta…' : <>Criar conta <ArrowRight size={18} /></>}
        </Btn>
        <p className="text-center text-sm leading-relaxed text-ink-400">
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
