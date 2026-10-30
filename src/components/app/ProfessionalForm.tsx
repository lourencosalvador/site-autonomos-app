import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, FileText, ImageIcon } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../Toast';
import { useCategories } from '../../hooks/useServices';
import { isValidAoPhone, formatAoPhone } from '../../lib/phone';
import { activateProfessional, profileErrorMessage } from '../../lib/hub';
import { changeAvatar, saveIdDocument, uploadIdDocument } from '../../lib/profile';
import { TextArea, TextInput } from '../Field';
import { AreaPicker } from './AreaPicker';
import { CompanyPicker, FilePick, FormField, PasswordInput, PhoneInput, ProvinceSelect } from './forms';
import { Btn } from './ui';

type Mode = 'signup' | 'activate';
type Key = 'name' | 'phone' | 'email' | 'province' | 'areas' | 'specialty' | 'experience' | 'bio' | 'company' | 'photo' | 'bi' | 'password' | 'confirm';

export function ProfessionalForm({ mode = 'signup', onDone, submitLabel }: { mode?: Mode; onDone: () => void; submitLabel?: string }) {
  const { user, signUp, refresh } = useAuth();
  const { error: toastError } = useToast();
  const categories = useCategories();
  const [f, setF] = useState({
    name: user?.name ?? '', phone: user?.phone ?? '', email: '', province: user?.province ?? '',
    specialty: '', experience: '', bio: user?.bio ?? '', password: '', confirm: '',
  });
  const [areas, setAreas] = useState<string[]>([]);
  const [isCompany, setIsCompany] = useState(false);
  const [company, setCompany] = useState<{ id: string; name: string }>({ id: '', name: '' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [bi, setBi] = useState<File | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof f, v: string) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); setFormError(null); };

  const validate = () => {
    const e: Partial<Record<Key, string>> = {};
    if (mode === 'signup' && f.name.trim().length < 2) e.name = 'Indique o seu nome completo.';
    if (!isValidAoPhone(f.phone)) e.phone = 'Indique 9 dígitos, a começar por 9.';
    if (mode === 'signup' && f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Email inválido.';
    if (!f.province) e.province = 'Escolha a província.';
    if (areas.length === 0) e.areas = 'Escolha pelo menos uma área.';
    if (f.specialty.trim().length < 2) e.specialty = 'Indique a sua especialidade.';
    const exp = Number(f.experience);
    if (f.experience === '' || !Number.isInteger(exp) || exp < 0 || exp > 70) e.experience = 'Indique os anos de experiência.';
    if (f.bio.trim().length < 20) e.bio = 'Conte um pouco sobre si (mínimo 20 caracteres).';
    if (isCompany && !company.id) e.company = 'Escolha a empresa.';
    if (!photo) e.photo = 'A fotografia é obrigatória.';
    if (!bi) e.bi = 'O BI é obrigatório.';
    if (mode === 'signup') {
      if (f.password.length < 6) e.password = 'Mínimo 6 caracteres.';
      if (f.confirm !== f.password) e.confirm = 'As palavras-passe não coincidem.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (busy || !validate()) { if (!busy) setFormError('Corrija os campos assinalados.'); return; }
    setBusy(true);
    setFormError(null);
    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await signUp({
          role: 'professional',
          name: f.name,
          phone: f.phone,
          email: f.email.trim() || null,
          password: f.password,
          province: f.province,
          bio: f.bio,
          workAreas: areas,
          companyId: isCompany ? company.id : null,
          companyName: isCompany ? company.name : null,
          specialty: f.specialty,
          experienceYears: Number(f.experience),
        });
        if (needsConfirmation) { setFormError('Conta criada. Confirme o seu email para continuar.'); setBusy(false); return; }
        await uploadDocs();
      } else {
        const biUrl = bi ? await uploadIdDocument(bi) : null;
        await activateProfessional({
          workAreas: areas, phone: formatAoPhone(f.phone)!, specialty: f.specialty, experienceYears: Number(f.experience),
          bio: f.bio, companyId: isCompany ? company.id : null, province: f.province, idDocumentUrl: biUrl,
        });
        if (photo) await changeAvatar(photo).catch(() => {});
        await refresh();
      }
      onDone();
    } catch (err) {
      const m = err instanceof Error ? err.message : '';
      setFormError(/[A-Z_]{6,}/.test(m) ? profileErrorMessage(err) : m || 'Não foi possível concluir.');
      setBusy(false);
    }
  };

  const uploadDocs = async () => {
    try {
      if (photo) await changeAvatar(photo);
      if (bi) await saveIdDocument(await uploadIdDocument(bi));
      await refresh();
    } catch (e) {
      toastError('Conta criada, mas faltou um documento', e instanceof Error ? e.message : 'Pode enviá-lo no seu perfil.');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-8" noValidate>
      <Section title="Dados pessoais">
        {mode === 'signup' && (
          <FormField label="Nome completo" htmlFor="pf-name" required error={errors.name}>
            <TextInput id="pf-name" value={f.name} hasError={!!errors.name} onChange={(e) => set('name', e.target.value)} placeholder="O seu nome" />
          </FormField>
        )}
        <FormField label="Telefone / WhatsApp" htmlFor="pf-phone" required error={errors.phone} hint={mode === 'signup' ? 'Vai usá-lo para entrar na sua conta.' : undefined}>
          <PhoneInput id="pf-phone" value={f.phone} onChange={(v) => set('phone', v)} hasError={!!errors.phone} />
        </FormField>
        {mode === 'signup' && (
          <FormField label="Email" htmlFor="pf-email" optional error={errors.email}>
            <TextInput id="pf-email" type="email" autoComplete="email" value={f.email} hasError={!!errors.email} onChange={(e) => set('email', e.target.value)} placeholder="o.seu@email.com" />
          </FormField>
        )}
        <FormField label="Província" htmlFor="pf-province" required error={errors.province}>
          <ProvinceSelect id="pf-province" value={f.province} onChange={(v) => set('province', v)} hasError={!!errors.province} />
        </FormField>
      </Section>

      <Section title="Atividade profissional">
        <FormField label="Áreas de atuação" required error={errors.areas} hint="Recebe pedidos apenas destas áreas (máximo 3).">
          <AreaPicker options={categories} value={areas} onChange={(v) => { setAreas(v); setErrors((e) => ({ ...e, areas: undefined })); }} hasError={!!errors.areas} />
        </FormField>
        <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
          <FormField label="Especialidade" htmlFor="pf-spec" required error={errors.specialty}>
            <TextInput id="pf-spec" value={f.specialty} hasError={!!errors.specialty} onChange={(e) => set('specialty', e.target.value)} placeholder="Ex.: Reparação de fugas de água" />
          </FormField>
          <FormField label="Anos de experiência" htmlFor="pf-exp" required error={errors.experience}>
            <TextInput id="pf-exp" type="number" inputMode="numeric" min={0} max={70} value={f.experience} hasError={!!errors.experience} onChange={(e) => set('experience', e.target.value)} placeholder="Ex.: 5" />
          </FormField>
        </div>
        <FormField label="Descrição" htmlFor="pf-bio" required error={errors.bio}>
          <TextArea id="pf-bio" value={f.bio} hasError={!!errors.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Fale sobre si, os seus serviços e o que o diferencia." />
        </FormField>
        <CompanyPicker enabled={isCompany} companyId={company.id} hasError={!!errors.company}
          onToggle={(v) => { setIsCompany(v); setErrors((e) => ({ ...e, company: undefined })); }}
          onCompany={(id, name) => { setCompany({ id, name }); setErrors((e) => ({ ...e, company: undefined })); }} />
      </Section>

      <Section title="Documentos" description="Usados apenas para verificar o seu perfil.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Fotografia" required error={errors.photo}>
            <FilePick label="Escolher fotografia" icon={ImageIcon} accept="image/jpeg,image/png,image/webp" file={photo} hasError={!!errors.photo}
              onChange={(file) => { setPhoto(file); setErrors((e) => ({ ...e, photo: undefined })); }} hint="JPG ou PNG, rosto visível" />
          </FormField>
          <FormField label="Bilhete de Identidade (BI)" required error={errors.bi}>
            <FilePick label="Escolher BI" icon={FileText} accept="image/jpeg,image/png,image/webp,application/pdf" file={bi} hasError={!!errors.bi}
              onChange={(file) => { setBi(file); setErrors((e) => ({ ...e, bi: undefined })); }} hint="PDF ou foto legível" />
          </FormField>
        </div>
      </Section>

      {mode === 'signup' && (
        <Section title="Acesso à conta">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Palavra-passe" htmlFor="pf-pw" required error={errors.password}>
              <PasswordInput id="pf-pw" value={f.password} onChange={(v) => set('password', v)} hasError={!!errors.password} placeholder="Mínimo 6 caracteres" />
            </FormField>
            <FormField label="Confirmar palavra-passe" htmlFor="pf-pw2" required error={errors.confirm}>
              <PasswordInput id="pf-pw2" value={f.confirm} onChange={(v) => set('confirm', v)} hasError={!!errors.confirm} placeholder="Repita a palavra-passe" />
            </FormField>
          </div>
        </Section>
      )}

      {formError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-700">{formError}</p>}

      <div className="space-y-3">
        <Btn type="submit" loading={busy} className="w-full">
          {busy ? 'A enviar…' : <>{submitLabel ?? 'Criar conta de profissional'} <ArrowRight size={18} /></>}
        </Btn>
        <p className="text-center text-sm leading-relaxed text-ink-400">
          A nossa equipa verifica o seu perfil antes de começar a receber pedidos.
          {mode === 'signup' && ' Ao continuar, aceita os Termos de Serviço e a Política de Privacidade.'}
        </p>
      </div>
    </form>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-5">
      <div>
        <legend className="text-base font-semibold text-ink-900">{title}</legend>
        {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
      </div>
      {children}
    </fieldset>
  );
}
