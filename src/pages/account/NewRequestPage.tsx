import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Loader2, MapPin } from 'lucide-react';
import { Field, TextInput, TextArea, Select } from '../../components/Field';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import { useCategories } from '../../hooks/useServices';
import { createBroadcast } from '../../lib/broadcasts';
import { navigate } from '../../router';

export function NewRequestPage() {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const categories = useCategories();
  const [form, setForm] = useState({
    category: '',
    description: '',
    date: '',
    time: '',
    city: user?.province ?? '',
    address: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => { setForm((f) => ({ ...f, [k]: v })); setError(null); };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!form.category) return setError('Escolha a categoria do serviço.');
    if (form.description.trim().length < 10) return setError('Descreva o que precisa (mínimo 10 caracteres).');

    setBusy(true);
    try {
      const b = await createBroadcast({
        category: form.category,
        description: form.description,
        serviceDate: form.date || null,
        serviceTime: form.time || null,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
      });
      navigate(`/conta/pedido/${b.id}`);
    } catch (err) {
      toastError('Não foi possível enviar', err instanceof Error ? err.message : 'Tente novamente.');
      setBusy(false);
    }
  };

  return (
    <section className="bg-cloud-50 pb-28 pt-28 lg:pt-32">
      <div className="mx-auto max-w-2xl px-5 lg:px-8">
        <button onClick={() => navigate('/conta')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition-colors hover:text-ink-900">
          <ArrowLeft size={16} /> Voltar ao painel
        </button>

        <div className="rounded-3xl border border-cloud-200 bg-white p-6 shadow-soft sm:p-8">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Solicitar serviço</h1>
          <p className="mt-1.5 text-ink-500">
            Diga-nos o que precisa. Vamos avisar os profissionais da área e o primeiro a aceitar fala consigo.
          </p>

          <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-5">
            <Field label="Categoria do serviço" name="category" required>
              <Select id="category" value={form.category} hasError={!!error && !form.category} onChange={(e) => set('category', e.target.value)}>
                <option value="">Selecione a categoria…</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>

            <Field label="Descrição" name="description" required>
              <TextArea
                id="description"
                placeholder="Ex.: Tenho uma fuga de água debaixo da pia da cozinha. Preciso de reparação com urgência."
                value={form.description}
                hasError={!!error && form.description.trim().length < 10}
                onChange={(e) => set('description', e.target.value)}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Data pretendida" name="date">
                <TextInput id="date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
              </Field>
              <Field label="Hora" name="time">
                <TextInput id="time" type="time" value={form.time} onChange={(e) => set('time', e.target.value)} />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Cidade / Província" name="city">
                <TextInput id="city" placeholder="Ex.: Luanda" value={form.city} onChange={(e) => set('city', e.target.value)} />
              </Field>
              <Field label="Morada (opcional)" name="address">
                <TextInput id="address" placeholder="Bairro, rua, referência" value={form.address} onChange={(e) => set('address', e.target.value)} />
              </Field>
            </div>

            {error && <p className="-mt-1 text-sm font-medium text-red-500">{error}</p>}

            <div className="mt-1 flex items-center gap-2 rounded-xl bg-brand-cyan/10 px-4 py-3 text-sm text-brand-dark">
              <MapPin size={16} className="shrink-0 text-brand-dark/70" />
              Assim que enviar, procuramos um profissional durante <strong>1 minuto</strong>.
            </div>

            <Button type="submit" size="lg" disabled={busy} className="w-full">
              {busy ? <><Loader2 size={18} className="animate-spin" /> A enviar…</> : <>Procurar profissional <ArrowRight size={18} /></>}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
