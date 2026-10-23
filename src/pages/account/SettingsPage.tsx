import { useState, type FormEvent } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Field, TextInput, TextArea } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { useCategories } from '../../hooks/useServices';
import { updateMyProfile } from '../../lib/hub';
import { navigate } from '../../router';
import { AreaPicker, CompanyField } from '../../components/app/AreaPicker';
import { Badge, Btn, Card, CardHeader, PageHeader } from '../../components/app/ui';

const APPROVAL = {
  approved: { label: 'Perfil aprovado', tone: 'success' },
  pending: { label: 'Em verificação', tone: 'warning' },
  rejected: { label: 'Não aprovado', tone: 'danger' },
} as const;

export function SettingsPage() {
  const { user, refresh, signOut } = useAuth();
  const { success, error: toastError } = useToast();
  const categories = useCategories();
  const isPro = user?.role === 'professional';

  const [form, setForm] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    specialty: user?.specialty ?? '',
    bio: user?.bio ?? '',
    province: user?.province ?? '',
  });
  const [areas, setAreas] = useState<string[]>(user?.workAreas ?? []);
  const [isCompany, setIsCompany] = useState(!!user?.companyName);
  const [company, setCompany] = useState(user?.companyName ?? '');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (!user) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (form.name.trim().length < 2) { toastError('Indique o seu nome.'); return; }
    if (isPro && areas.length === 0) { toastError('Escolha pelo menos uma área de atuação.'); return; }
    if (isPro && isCompany && company.trim().length < 2) { toastError('Indique o nome da empresa.'); return; }
    setBusy(true);
    try {
      await updateMyProfile({
        name: form.name,
        phone: form.phone.trim() || null,
        workAreas: isPro ? areas : null,
        specialty: isPro ? form.specialty.trim() || null : null,
        bio: form.bio.trim() || null,
        province: form.province.trim() || null,
        companyName: isPro && isCompany ? company.trim() : null,
      });
      await refresh();
      success('Alterações guardadas');
    } catch (err) {
      toastError('Não foi possível guardar', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const approval = isPro && user.approvalStatus ? APPROVAL[user.approvalStatus] : null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Conta" description="Os seus dados e preferências." actions={approval ? <Badge tone={approval.tone} className="px-3 py-1 text-sm">{approval.label}</Badge> : undefined} />

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader title="Dados pessoais" />
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <Field label="Nome" name="name" required>
              <TextInput id="name" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Email" name="email">
              <TextInput id="email" value={user.email} disabled />
            </Field>
            <Field label="Telefone" name="phone">
              <TextInput id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+244 9XX XXX XXX" />
            </Field>
            <Field label="Província / Cidade" name="province">
              <TextInput id="province" value={form.province} onChange={(e) => set('province', e.target.value)} placeholder="Ex.: Luanda" />
            </Field>
          </div>
        </Card>

        {isPro && (
          <Card>
            <CardHeader title="Atividade profissional" description="Recebe pedidos apenas das áreas que escolher." />
            <div className="space-y-5 p-5 sm:p-6">
              <Field label="Áreas de atuação" name="areas" required>
                <AreaPicker options={categories} value={areas} onChange={setAreas} />
              </Field>
              <CompanyField enabled={isCompany} name={company} onToggle={setIsCompany} onName={setCompany} />
              <Field label="Especialidade" name="specialty">
                <TextInput id="specialty" value={form.specialty} onChange={(e) => set('specialty', e.target.value)} placeholder="Ex.: Deteção e reparação de fugas" />
              </Field>
              <Field label="Sobre si" name="bio">
                <TextArea id="bio" value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Conte a sua experiência." />
              </Field>
            </div>
          </Card>
        )}

        <div className="flex justify-end">
          <Btn type="submit" loading={busy} className="w-full sm:w-auto sm:min-w-[200px]">{busy ? 'A guardar…' : 'Guardar alterações'}</Btn>
        </div>
      </form>

      <Card className="mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-base font-semibold text-ink-900">Terminar sessão</p>
          <p className="text-[15px] text-ink-500">Sai da sua conta neste dispositivo.</p>
        </div>
        <Btn variant="danger" onClick={async () => { await signOut(); navigate('/'); }}><LogOut size={18} /> Terminar sessão</Btn>
      </Card>
    </div>
  );
}
