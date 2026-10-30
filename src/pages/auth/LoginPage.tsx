import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { TextInput } from '../../components/Field';
import { Btn, Notice } from '../../components/app/ui';
import { FormField, PasswordInput } from '../../components/app/forms';
import { useToast } from '../../components/Toast';
import { useAuth, authErrorMessage } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabase';
import { isValidAoPhone } from '../../lib/phone';
import { hashParam, navigate } from '../../router';

export function LoginPage() {
  const { signIn } = useAuth();
  const { success, error: toastError } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = hashParam('next');
  const wantsRequest = !!next && next.startsWith('/conta/pedir');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Preencha o email (ou telefone) e a palavra-passe.');
      return;
    }
    setBusy(true);
    try {
      await signIn(identifier, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  };

  const onForgot = async () => {
    const value = identifier.trim();
    if (!value) { setError('Escreva o seu email para receber o link de recuperação.'); return; }
    if (!value.includes('@') && isValidAoPhone(value)) {
      setError('Contas criadas com telefone: fale com o nosso apoio para repor a palavra-passe.');
      return;
    }
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(value);
      if (err) throw err;
      success('Email enviado', 'Veja a sua caixa de entrada para repor a palavra-passe.');
    } catch (err) {
      toastError('Não foi possível enviar', err instanceof Error ? authErrorMessage(err.message) : undefined);
    }
  };

  const registerPath = next ? `/criar-conta?next=${encodeURIComponent(next)}` : '/criar-conta';

  return (
    <AuthShell
      title={wantsRequest ? 'Entre para pedir o serviço' : 'Bem-vindo de volta'}
      subtitle={wantsRequest ? 'Precisa de uma conta para enviar o pedido e falar com o profissional.' : 'Entre na sua conta para continuar.'}
      footer={<>Ainda não tem conta? <button onClick={() => navigate(registerPath)} className="font-semibold text-brand-dark underline-offset-4 hover:underline">Criar conta</button></>}
    >
      {wantsRequest && (
        <Notice tone="info" className="mb-6" action={<Btn variant="outline" size="md" onClick={() => navigate(registerPath)}>Criar conta grátis</Btn>}>
          Ainda não tem conta? Crie uma em menos de um minuto e o seu pedido continua de onde ficou.
        </Notice>
      )}
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormField label="Email ou telefone" htmlFor="identifier" required>
          <TextInput id="identifier" autoComplete="username" value={identifier} hasError={!!error}
            onChange={(e) => { setIdentifier(e.target.value); setError(null); }} placeholder="o.seu@email.com ou 9XX XXX XXX" autoFocus />
        </FormField>
        <FormField label="Palavra-passe" htmlFor="password" required>
          <PasswordInput id="password" autoComplete="current-password" value={password} hasError={!!error}
            onChange={(v) => { setPassword(v); setError(null); }} placeholder="A sua palavra-passe" />
        </FormField>

        <div className="flex justify-end">
          <button type="button" onClick={onForgot} className="text-sm font-medium text-ink-500 hover:text-brand-dark">
            Esqueceu-se da palavra-passe?
          </button>
        </div>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-700">{error}</p>}

        <Btn type="submit" loading={busy} className="w-full">
          {busy ? 'A entrar…' : <>Entrar <ArrowRight size={18} /></>}
        </Btn>
      </form>
    </AuthShell>
  );
}
