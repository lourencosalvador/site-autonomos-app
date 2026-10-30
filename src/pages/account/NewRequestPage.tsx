import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Crosshair, Loader2, X } from 'lucide-react';
import { TextInput, TextArea, Select } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import { useCategories } from '../../hooks/useServices';
import { createBroadcast } from '../../lib/broadcasts';
import { navigate, hashParam } from '../../router';
import { Btn, Card, PageHeader } from '../../components/app/ui';
import { FormField, PROVINCES, ProvinceSelect } from '../../components/app/forms';

type Key = 'category' | 'description' | 'province' | 'municipality' | 'neighborhood';

export function NewRequestPage() {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const categories = useCategories();
  const [form, setForm] = useState({
    category: hashParam('categoria') ?? '',
    description: '',
    date: '',
    time: '',
    province: user?.province && PROVINCES.includes(user.province) ? user.province : 'Luanda',
    municipality: '',
    neighborhood: '',
    address: '',
  });
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});

  const set = (k: keyof typeof form, v: string) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const locate = () => {
    if (!('geolocation' in navigator)) { toastError('Localização indisponível', 'O seu navegador não permite obter a localização.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGps({ lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) }); setLocating(false); },
      () => { setLocating(false); toastError('Não foi possível obter a localização', 'Autorize o acesso à localização ou preencha a morada.'); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const err: Partial<Record<Key, string>> = {};
    if (!form.category) err.category = 'Escolha a categoria do serviço.';
    if (form.description.trim().length < 10) err.description = 'Descreva o que precisa (mínimo 10 caracteres).';
    if (!form.province) err.province = 'Escolha a província.';
    if (form.municipality.trim().length < 2) err.municipality = 'Indique o município.';
    if (form.neighborhood.trim().length < 2) err.neighborhood = 'Indique o bairro.';
    setErrors(err);
    if (Object.keys(err).length) return;

    setBusy(true);
    try {
      const b = await createBroadcast({
        category: form.category,
        description: form.description,
        serviceDate: form.date || null,
        serviceTime: form.time || null,
        province: form.province,
        municipality: form.municipality.trim(),
        neighborhood: form.neighborhood.trim(),
        address: form.address.trim() || null,
        lat: gps?.lat ?? null,
        lng: gps?.lng ?? null,
      });
      navigate(`/conta/pedido/${b.id}`);
    } catch (e2) {
      toastError('Não foi possível enviar', e2 instanceof Error ? e2.message : 'Tente novamente.');
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ label: 'Início', to: '/conta' }}
        title="Novo pedido"
        description="Diga-nos o que precisa. Enviamos o pedido aos profissionais verificados da área."
      />

      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <Card className="space-y-6 p-5 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight text-ink-900">O serviço</h2>
          <FormField label="Categoria" htmlFor="category" required error={errors.category}>
            <Select id="category" value={form.category} hasError={!!errors.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">Selecione a categoria</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormField>
          <FormField label="O que precisa?" htmlFor="description" required error={errors.description}>
            <TextArea id="description" placeholder="Ex.: Tenho uma fuga de água debaixo da pia da cozinha e preciso de reparação."
              value={form.description} hasError={!!errors.description} onChange={(e) => set('description', e.target.value)} />
          </FormField>
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField label="Data pretendida" htmlFor="date" optional>
              <TextInput id="date" type="date" value={form.date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set('date', e.target.value)} />
            </FormField>
            <FormField label="Hora" htmlFor="time" optional>
              <TextInput id="time" type="time" value={form.time} onChange={(e) => set('time', e.target.value)} />
            </FormField>
          </div>
        </Card>

        <Card className="space-y-6 p-5 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink-900">Onde é o serviço</h2>
            <p className="mt-1 text-[15px] text-ink-500">Só o profissional que aceitar o pedido vê a morada completa.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField label="Província" htmlFor="province" required error={errors.province}>
              <ProvinceSelect id="province" value={form.province} onChange={(v) => set('province', v)} hasError={!!errors.province} />
            </FormField>
            <FormField label="Município" htmlFor="municipality" required error={errors.municipality}>
              <TextInput id="municipality" placeholder="Ex.: Talatona" value={form.municipality} hasError={!!errors.municipality} onChange={(e) => set('municipality', e.target.value)} />
            </FormField>
            <FormField label="Bairro" htmlFor="neighborhood" required error={errors.neighborhood}>
              <TextInput id="neighborhood" placeholder="Ex.: Benfica" value={form.neighborhood} hasError={!!errors.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
            </FormField>
            <FormField label="Rua e ponto de referência" htmlFor="address" optional>
              <TextInput id="address" placeholder="Ex.: Rua 21, casa 4, perto da escola" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </FormField>
          </div>
          {gps ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="flex items-center gap-2 text-[15px] font-medium text-emerald-800"><Check size={18} /> Localização GPS adicionada</span>
              <button type="button" onClick={() => setGps(null)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-emerald-800 hover:bg-emerald-100">
                <X size={15} /> Remover
              </button>
            </div>
          ) : (
            <Btn type="button" variant="outline" onClick={locate} disabled={locating} className="w-full sm:w-auto">
              {locating ? <Loader2 size={18} className="animate-spin" /> : <Crosshair size={18} />} Usar a minha localização atual
            </Btn>
          )}
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-500">Recebe o orçamento antes de pagar. Só paga depois de o serviço estar feito.</p>
          <Btn type="submit" loading={busy} className="w-full sm:w-auto">
            {busy ? 'A enviar…' : <>Enviar pedido <ArrowRight size={18} /></>}
          </Btn>
        </div>
      </form>
    </div>
  );
}
