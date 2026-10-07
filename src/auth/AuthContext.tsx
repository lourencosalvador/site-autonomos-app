import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, type ProfileRole, type ProfileRow } from '../lib/supabase';

export type Role = ProfileRole;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role | null;
  avatarUrl: string | null;
  phone: string | null;
  workArea: string | null;
  bio: string | null;
  specialty: string | null;
  province: string | null;
  approvalStatus: 'approved' | 'pending' | 'rejected' | null;
};

type SignUpInput = {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string | null;
  workArea?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Mensagens de erro do Supabase traduzidas para o utilizador. */
export function authErrorMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email ou palavra-passe incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme o seu email antes de entrar.';
  if (m.includes('user already registered') || m.includes('already registered')) return 'Já existe uma conta com este email.';
  if (m.includes('password should be at least')) return 'A palavra-passe deve ter pelo menos 6 caracteres.';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'Email inválido.';
  if (m.includes('for security purposes') || m.includes('rate limit')) return 'Demasiadas tentativas. Aguarde um momento e tente novamente.';
  if (m.includes('failed to fetch') || m.includes('networkerror')) return 'Sem ligação. Verifique a internet e tente novamente.';
  return 'Ocorreu um erro. Tente novamente.';
}

/** `work_area` preenchido indica um prestador (mesma regra da app mobile). */
function profileToUser(id: string, email: string, meta: Record<string, unknown>, profile: ProfileRow | null): AuthUser {
  const metaName = (meta.full_name as string) || (meta.name as string) || '';
  const metaAvatar = (meta.avatar_url as string) || (meta.picture as string) || null;
  const workArea = (profile?.work_area ?? null) || null;
  let role: Role | null = profile?.role ?? null;
  if (!role && workArea) role = 'professional';
  return {
    id,
    email,
    name: profile?.name || metaName || email,
    role,
    avatarUrl: profile?.avatar_url || metaAvatar,
    phone: profile?.phone ?? null,
    workArea,
    bio: profile?.bio ?? null,
    specialty: profile?.specialty ?? null,
    province: profile?.province ?? null,
    approvalStatus: profile?.approval_status ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  const applySession = useCallback(async (session: Session | null) => {
    const id = ++seq.current;
    if (!session?.user) {
      if (id === seq.current) {
        setUser(null);
        setLoading(false);
      }
      return;
    }
    const sbUser = session.user;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sbUser.id)
      .maybeSingle();
    if (id !== seq.current) return; // uma mudança de sessão mais recente tomou a frente

    let profile = (data as ProfileRow | null) ?? null;
    if (!error && !profile) {
      // Primeira vez (ex.: conta criada via OAuth): cria a linha mínima.
      const meta = sbUser.user_metadata ?? {};
      await supabase.from('profiles').upsert(
        { id: sbUser.id, role: null, name: (meta.full_name as string) || (meta.name as string) || null, avatar_url: (meta.avatar_url as string) || null },
        { onConflict: 'id' },
      );
      profile = { id: sbUser.id, role: null, name: null, phone: null, avatar_url: null };
    }
    setUser(profileToUser(sbUser.id, sbUser.email ?? '', sbUser.user_metadata ?? {}, profile));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) void applySession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(authErrorMessage(error.message));
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const email = input.email.trim();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: { data: { full_name: input.name.trim() } },
    });
    if (error) throw new Error(authErrorMessage(error.message));

    if (data.user) {
      // Grava o perfil com o papel. Remove colunas que a BD ainda não tenha, sem falhar.
      const full: Record<string, unknown> = {
        id: data.user.id,
        role: input.role,
        name: input.name.trim(),
        phone: input.phone ?? null,
        work_area: input.role === 'professional' ? input.workArea ?? null : null,
        // Prestador entra "por aprovar"; o admin aprova para começar a receber pedidos.
        approval_status: input.role === 'professional' ? 'pending' : null,
      };
      let { error: upErr } = await supabase.from('profiles').upsert(full, { onConflict: 'id' });
      for (let i = 0; i < 4 && upErr; i++) {
        const col = /could not find the '(\w+)' column/i.exec(upErr.message)?.[1];
        if (!col || !(col in full)) break;
        delete full[col];
        ({ error: upErr } = await supabase.from('profiles').upsert(full, { onConflict: 'id' }));
      }
      if (upErr) {
        await supabase.from('profiles').upsert({ id: data.user.id, role: input.role, name: input.name.trim() }, { onConflict: 'id' });
      }
    }
    // Sem sessão → o Supabase exige confirmação de email.
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // a sessão local já foi limpa
    }
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await applySession(data.session);
  }, [applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, configured: isSupabaseConfigured, signIn, signUp, signOut, refresh }),
    [user, loading, signIn, signUp, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth tem de ser usado dentro de <AuthProvider>');
  return ctx;
}
