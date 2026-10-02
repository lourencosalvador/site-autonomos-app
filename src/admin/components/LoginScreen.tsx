import { useEffect, useRef, useState } from 'react';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { DotField } from './DotField';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '../ui/misc';
import { login } from '../lib/api';
import type { AdminSession } from '../lib/session';
import { cn } from '../lib/utils';

const KEY_LENGTH = 8;

export function LoginScreen({ onSuccess }: { onSuccess: (s: AdminSession) => void }) {
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const inputRef = useRef<HTMLInputElement | null>(null);

  const locked = lockedUntil !== null && lockedUntil > now;
  const remaining = locked ? Math.ceil((lockedUntil - now) / 1000) : 0;

  useEffect(() => {
    if (!lockedUntil) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [lockedUntil]);

  useEffect(() => {
    if (lockedUntil && !locked) {
      setLockedUntil(null);
      setError(null);
      inputRef.current?.focus();
    }
  }, [locked, lockedUntil]);

  const submit = async (key: string) => {
    if (key.length !== KEY_LENGTH || pending || locked) return;
    setPending(true);
    setError(null);
    const result = await login(key.toUpperCase());
    setPending(false);

    if (result.ok) {
      onSuccess(result.session);
      return;
    }
    setValue('');
    setShake((n) => n + 1);
    if (result.error === 'locked') {
      setLockedUntil(Date.now() + result.retryAfter * 1000);
      setNow(Date.now());
      setError('Demasiadas tentativas falhadas.');
    } else if (result.error === 'invalid_key') {
      setError(
        result.attemptsLeft > 0
          ? `Chave incorreta. ${result.attemptsLeft === 1 ? 'Resta 1 tentativa' : `Restam ${result.attemptsLeft} tentativas`}.`
          : 'Chave incorreta.',
      );
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setError(result.message);
    }
  };

  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, '0');

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-black text-white">
      <DotField className="absolute inset-0 h-full w-full" />
      {/* vinheta: escurece as margens e dá foco ao formulário */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.55)_55%,#000_100%)]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-8">
        <img src="/admin-logo-light.svg" alt="AUTONOMOUS" className="h-[22px] w-auto" />
        <a href="#/" className="inline-flex items-center gap-1.5 text-[13px] text-white/50 transition-colors hover:text-white">
          <ArrowLeft className="size-3.5" /> Voltar ao site
        </a>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-[26rem]">
          <div className="mx-auto mb-7 flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <ShieldCheck className="size-5 text-brand-cyan" />
          </div>
          <h1 className="text-center text-2xl font-semibold tracking-tight">Painel de administração</h1>
          <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-white/55">
            Introduza a sua chave de acesso de {KEY_LENGTH} caracteres.
          </p>

          <form
            className="mt-9 flex flex-col items-center"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(value);
            }}
          >
            <div key={shake} className={cn(shake > 0 && 'animate-[otp-shake_0.4s_ease-in-out]')}>
              <InputOTP
                ref={inputRef}
                autoFocus
                maxLength={KEY_LENGTH}
                value={value}
                disabled={pending || locked}
                pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                inputMode="text"
                autoComplete="one-time-code"
                aria-label="Chave de acesso"
                pasteTransformer={(text) => text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}
                onChange={(v) => {
                  setValue(v.toUpperCase());
                  if (error && !locked) setError(null);
                }}
                onComplete={(v: string) => void submit(v)}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3].map((i) => <InputOTPSlot key={i} index={i} invalid={!!error && !locked} />)}
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  {[4, 5, 6, 7].map((i) => <InputOTPSlot key={i} index={i} invalid={!!error && !locked} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="mt-4 min-h-[20px] text-center text-[13px]" aria-live="polite">
              {locked ? (
                <span className="text-red-300">
                  {error} Tente novamente dentro de <span className="tabular-nums">{minutes}:{seconds}</span>.
                </span>
              ) : error ? (
                <span className="text-red-300">{error}</span>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={value.length !== KEY_LENGTH || pending || locked}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> A verificar…
                </>
              ) : (
                <>
                  Entrar <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      <footer className="relative z-10 px-6 pb-6 text-center text-xs text-white/30">
        Acesso restrito à equipa AUTONOMOUS. As tentativas de acesso são registadas.
      </footer>
    </div>
  );
}
