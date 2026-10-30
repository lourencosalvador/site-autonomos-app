import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, type ProfileRole, type ProfileRow } from '../lib/supabase';
import { formatAoPhone, isPhoneEmail, isValidAoPhone, phoneEmail } from '../lib/phone';

export type Role = ProfileRole;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role | null;
  isProfessional: boolean;
  activeRole: Role;
  avatarUrl: string | null;
  phone: string | null;
  workArea: string | null;
  workAreas: string[];
  companyId: string | null;
  companyName: string | null;
  iban: string | null;
  ibanHolder: string | null;
  experienceYears: number | null;
  idDocumentUrl: string | null;
  bio: string | null;
  specialty: string | null;
  province: string | null;
  approvalStatus: 'approved' | 'pending' | 'rejected' | null;
};

export type SignUpInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  password: string;
  role: Role;
  workAreas?: string[];
  companyId?: string | null;
  companyName?: string | null;
  specialty?: string | null;
  experienceYears?: number | null;
  bio?: string | null;
  province?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  configured: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setMode: (mode: Role) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const MODE_KEY = 'autonomous:mode:';

export function authErrorMessage(raw: string, byPhone = false): string {
  const m = raw.toLowerCase();
  if (m.includes('invalid login credentials')) return byPhone ? 'Telefone ou palavra-passe incorretos.' : 'Email ou palavra-passe incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme o seu email antes de entrar.';
  if (m.includes('user already registered') || m.includes('already registered'))
    return byPhone ? 'Já existe uma conta com este número de telefone.' : 'Já existe uma conta com este email. Entre e ative o perfil que precisa nas definições da conta.';
  if (m.includes('password should be at least')) return 'A palavra-passe deve ter pelo menos 6 caracteres.';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'Email inválido.';
  if (m.includes('for security purposes') || m.includes('rate limit')) return 'Demasiadas tentativas. Aguarde um momento e tente novamente.';
  if (m.includes('failed to fetch') || m.includes('networkerror')) return 'Sem ligação. Verifique a internet e tente novamente.';
  return 'Ocorreu um erro. Tente novamente.';
}

function readMode(uid: string): Role | null {
  try {
    const v = window.localStorage.getItem(MODE_KEY + uid);
    return v === 'client' || v === 'professional' ? v : null;
  } catch { return null; }
}

function profileToUser(id: string, email: string, meta: Record<string, unknown>, profile: ProfileRow | null): AuthUser {
  const metaName = (meta.full_name as string) || (meta.name as string) || '';
  const metaAvatar = (meta.avatar_url as string) || (meta.picture as string) || null;
  const workArea = (profile?.work_area ?? null) || null;
  const workAreas = profile?.work_areas?.length ? profile.work_areas : workArea ? [workArea] : [];
  let role: Role | null = profile?.role ?? null;
  if (!role && workArea) role = 'professional';
  const isProfessional = role === 'professional';
  const realEmail = isPhoneEmail(email) ? '' : email;
  return {
    id,
    email: realEmail,
    name: profile?.name || metaName || realEmail || 'Utilizador',
    role,
    isProfessional,
    activeRole: isProfessional ? readMode(id) ?? 'professional' : 'client',
    avatarUrl: profile?.avatar_url || metaAvatar,
    phone: profile?.phone ?? null,
    workArea,
    workAreas,
    companyId: profile?.company_id ?? null,
    companyName: profile?.company_name ?? null,
    iban: profile?.iban ?? null,
    ibanHolder: profile?.iban_holder ?? null,
    experienceYears: profile?.experience_years ?? null,
    idDocumentUrl: profile?.id_document_url ?? null,
    bio: profile?.bio ?? null,
    specialty: profile?.specialty ?? null,
    province: profile?.province ?? null,
    approvalStatus: profile?.approval_status ?? null,
  };
}

function signupProfile(id: string, meta: Record<string, unknown>): Record<string, unknown> {
  const role = meta.role === 'professional' ? 'professional' : meta.role === 'client' ? 'client' : null;
  const areas = Array.isArray(meta.work_areas) ? (meta.work_areas as string[]).filter(Boolean).slice(0, 3) : [];
  const row: Record<string, unknown> = {
    id,
    role,
    name: (meta.full_name as string) || (meta.name as string) || null,
  };
  if (meta.avatar_url) row.avatar_url = meta.avatar_url;
  if (meta.phone) row.phone = meta.phone;
  if (meta.province) row.province = meta.province;
  if (meta.bio) row.bio = meta.bio;
  if (role === 'professional') {
    row.work_area = areas[0] ?? null;
    row.work_areas = areas;
    row.company_id = (meta.company_id as string) || null;
    row.company_name = (meta.company_name as string) || null;
    row.specialty = (meta.specialty as string) || null;
    row.experience_years = typeof meta.experience_years === 'number' ? meta.experience_years : null;
    row.approval_status = 'pending';
  }
  return row;
}

async function writeProfile(row: Record<string, unknown>, insertOnly: boolean) {
  const full = { ...row };
  const write = () => supabase.from('profiles').upsert(full, { onConflict: 'id', ignoreDuplicates: insertOnly });
  let { error } = await write();
  for (let i = 0; i < 8 && error; i++) {
    const col = /could not find the '(\w+)' column/i.exec(error.message)?.[1];
    if (!col || !(col in full)) break;
    delete full[col];
    ({ error } = await write());
  }
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
    if (id !== seq.current) return;

    let profile = (data as ProfileRow | null) ?? null;
    const meta = sbUser.user_metadata ?? {};
    const metaRole = meta.role === 'professional' || meta.role === 'client';
    if (!error && (!profile || (!profile.role && !profile.work_area && metaRole))) {
      const fromMeta = signupProfile(sbUser.id, meta);
      await writeProfile(fromMeta, !profile);
      const again = await supabase.from('profiles').select('*').eq('id', sbUser.id).maybeSingle();
      if (id !== seq.current) return;
      profile = (again.data as ProfileRow | null) ?? (fromMeta as unknown as ProfileRow);
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

  const signIn = useCallback(async (identifier: string, password: string) => {
    const raw = identifier.trim();
    const byPhone = !raw.includes('@') && isValidAoPhone(raw);
    const email = byPhone ? phoneEmail(raw) : raw;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(authErrorMessage(error.message, byPhone));
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const isPro = input.role === 'professional';
    const phone = formatAoPhone(input.phone);
    const typedEmail = input.email?.trim() || '';
    const byPhone = !typedEmail;
    if (byPhone && !phone) throw new Error('Indique um email ou um número de telefone.');
    const email = typedEmail || phoneEmail(phone!);
    const meta = {
      full_name: input.name.trim(),
      role: input.role,
      phone,
      province: input.province?.trim() || null,
      bio: input.bio?.trim() || null,
      work_areas: isPro ? (input.workAreas ?? []).slice(0, 3) : [],
      company_id: isPro ? input.companyId ?? null : null,
      company_name: isPro ? input.companyName?.trim() || null : null,
      specialty: isPro ? input.specialty?.trim() || null : null,
      experience_years: isPro ? input.experienceYears ?? null : null,
    };
    const { data, error } = await supabase.auth.signUp({ email, password: input.password, options: { data: meta } });
    if (error) throw new Error(authErrorMessage(error.message, byPhone));
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error(authErrorMessage('already registered', byPhone));
    }

    if (data.user && data.session) {
      await writeProfile(signupProfile(data.user.id, meta), false);
      await applySession(data.session);
    }

    return { needsConfirmation: !data.session };
  }, [applySession]);

  const signOut = useCallback(async () => {
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch {}
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await applySession(data.session);
  }, [applySession]);

  const setMode = useCallback((mode: Role) => {
    setUser((u) => {
      if (!u || !u.isProfessional) return u;
      try { window.localStorage.setItem(MODE_KEY + u.id, mode); } catch {}
      return { ...u, activeRole: mode };
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, configured: isSupabaseConfigured, signIn, signUp, signOut, refresh, setMode }),
    [user, loading, signIn, signUp, signOut, refresh, setMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth tem de ser usado dentro de <AuthProvider>');
  return ctx;
}
