import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Field, TextInput } from '../../components/Field';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { useAuth, authErrorMessage } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabase';
import { hashParam, navigate } from '../../router';

export function LoginPage() {
  const { signIn } = useAuth();
  const { success, error: toastError } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!email.trim() || !password) {
      setError('Preencha o email e a palavra-passe.');
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      const next = hashParam('next');
      navigate(next && next.startsWith('/') ? next : '/conta');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  };

  const onForgot = async () => {
    if (!email.trim()) {
      setError('Escreva o seu email para receber o link de recuperação.');
      return;
    }
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (err) throw err;
      success('Email enviado', 'Veja a sua caixa de entrada para repor a palavra-passe.');
    } catch (err) {
      toastError('Não foi possível enviar', err instanceof Error ? authErrorMessage(err.message) : undefined);
    }
  };

  return (
    <AuthShell
      title="Bem-vindo de volta"
      subtitle="Entre na sua conta para continuar."
      footer={<>Ainda não tem conta? <button onClick={() => navigate('/criar-conta')} className="font-semibold text-brand-dark underline-offset-4 hover:underline">Criar conta</button></>}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Email" name="email" required>
          <TextInput id="email" type="email" autoComplete="email" value={email} hasError={!!error}
            onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="o.seu@email.com" autoFocus />
        </Field>
        <Field label="Palavra-passe" name="password" required>
          <div className="relative">
            <TextInput id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} hasError={!!error}
              onChange={(e) => { setPassword(e.target.value); setError(null); }} placeholder="A sua palavra-passe" className="pr-11" />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ocultar' : 'Mostrar'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>

        <div className="flex justify-end">
          <button type="button" onClick={onForgot} className="text-sm font-medium text-ink-500 hover:text-brand-dark">
            Esqueceu-se da palavra-passe?
          </button>
        </div>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? <><Loader2 size={18} className="animate-spin" /> A entrar…</> : <>Entrar <ArrowRight size={18} /></>}
        </Button>
      </form>
    </AuthShell>
  );
}
