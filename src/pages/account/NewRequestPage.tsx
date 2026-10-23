import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { Field, TextInput, TextArea, Select } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import { useCategories } from '../../hooks/useServices';
import { createBroadcast } from '../../lib/broadcasts';
import { navigate, hashParam } from '../../router';
import { Btn, Card, PageHeader } from '../../components/app/ui';

type FieldKey = 'category' | 'description';

export function NewRequestPage() {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const categories = useCategories();
  const [form, setForm] = useState({
    category: hashParam('categoria') ?? '',
    description: '',
    date: '',
    time: '',
    city: user?.province ?? '',
    address: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: FieldKey; message: string } | null>(null);

  const set = (k: keyof typeof form, v: string) => { setForm((f) => ({ ...f, [k]: v })); setError(null); };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!form.category) return setError({ field: 'category', message: 'Escolha a categoria do serviço.' });
    if (form.description.trim().length < 10) return setError({ field: 'description', message: 'Descreva o que precisa (mínimo 10 caracteres).' });

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

  const err = (f: FieldKey) => (error?.field === f ? error.message : undefined);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ label: 'Início', to: '/conta' }}
        title="Novo pedido"
        description="Diga-nos o que precisa. Enviamos o pedido aos profissionais verificados da área."
      />

      <Card className="p-5 sm:p-8">
        <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
          <Field label="Categoria" name="category" required error={err('category')}>
            <Select id="category" value={form.category} hasError={!!err('category')} onChange={(e) => set('category', e.target.value)}>
              <option value="">Selecione a categoria</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>

          <Field label="O que precisa?" name="description" required error={err('description')}>
            <TextArea
              id="description"
              placeholder="Ex.: Tenho uma fuga de água debaixo da pia da cozinha e preciso de reparação."
              value={form.description}
              hasError={!!err('description')}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Data pretendida" name="date">
              <TextInput id="date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </Field>
            <Field label="Hora" name="time">
              <TextInput id="time" type="time" value={form.time} onChange={(e) => set('time', e.target.value)} />
            </Field>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Cidade / Província" name="city">
              <TextInput id="city" placeholder="Ex.: Luanda" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="Morada" name="address">
              <TextInput id="address" placeholder="Bairro, rua, ponto de referência" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-500">Recebe o orçamento antes de pagar qualquer valor.</p>
            <Btn type="submit" loading={busy} className="w-full sm:w-auto">
              {busy ? 'A enviar…' : <>Enviar pedido <ArrowRight size={18} /></>}
            </Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
