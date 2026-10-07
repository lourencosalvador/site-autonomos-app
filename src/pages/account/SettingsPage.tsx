import { useState, type FormEvent } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Field, TextInput, TextArea, Select } from '../../components/Field';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { useCategories } from '../../hooks/useServices';
import { updateMyProfile } from '../../lib/hub';
import { navigate } from '../../router';

export function SettingsPage() {
  const { user, refresh, signOut } = useAuth();
  const { success, error: toastError } = useToast();
  const categories = useCategories();
  const isPro = user?.role === 'professional';

  const [form, setForm] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    workArea: user?.workArea ?? '',
    specialty: user?.specialty ?? '',
    bio: user?.bio ?? '',
    province: user?.province ?? '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (!user) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (form.name.trim().length < 2) { toastError('Indique o seu nome.'); return; }
    setBusy(true);
    try {
      await updateMyProfile({
        name: form.name,
        phone: form.phone.trim() || null,
        workArea: isPro ? form.workArea || null : null,
        specialty: isPro ? form.specialty.trim() || null : null,
        bio: form.bio.trim() || null,
        province: form.province.trim() || null,
      });
      await refresh();
      success('Perfil atualizado');
    } catch (err) {
      toastError('Não foi possível guardar', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-cloud-50 pb-28 pt-28 lg:pt-32">
      <div className="mx-auto max-w-xl px-5 lg:px-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">A minha conta</h1>
        <p className="mt-1 text-ink-500">Atualize os seus dados.</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-5 rounded-3xl border border-cloud-200 bg-white p-6 shadow-soft">
          <Field label="Nome" name="name" required>
            <TextInput id="name" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Email" name="email">
            <TextInput id="email" value={user.email} disabled className="opacity-60" />
          </Field>
          <Field label="Telefone" name="phone">
            <TextInput id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+244 9XX XXX XXX" />
          </Field>
          <Field label="Província / Cidade" name="province">
            <TextInput id="province" value={form.province} onChange={(e) => set('province', e.target.value)} placeholder="Ex.: Luanda" />
          </Field>

          {isPro && (
            <>
              <Field label="Área de trabalho" name="workArea">
                <Select id="workArea" value={form.workArea} onChange={(e) => set('workArea', e.target.value)}>
                  <option value="">Selecione…</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Especialidade" name="specialty">
                <TextInput id="specialty" value={form.specialty} onChange={(e) => set('specialty', e.target.value)} placeholder="Ex.: Deteção e reparação de fugas" />
              </Field>
              <Field label="Sobre si" name="bio">
                <TextArea id="bio" value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Conte a sua experiência…" />
              </Field>
            </>
          )}

          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? <><Loader2 size={18} className="animate-spin" /> A guardar…</> : 'Guardar alterações'}
          </Button>
        </form>

        <button
          onClick={async () => { await signOut(); navigate('/'); }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-cloud-200 bg-white px-4 py-3.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut size={17} /> Terminar sessão
        </button>
      </div>
    </section>
  );
}
