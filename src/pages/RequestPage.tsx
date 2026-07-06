import { useState, type FormEvent, type ChangeEvent } from 'react';
import { ClipboardList, ArrowRight, Paperclip, X, Image as ImageIcon, FileText } from 'lucide-react';
import { Button } from '../components/Button';
import { PageHero } from '../components/PageHero';
import { Field, TextInput, TextArea, Select } from '../components/Field';
import { SuccessScreen } from '../components/SuccessScreen';
import { useToast } from '../components/Toast';
import { CATEGORIES } from '../data';
import { submitServiceRequest } from '../lib/serviceRequest';

const SERVICE_CATEGORIES = CATEGORIES.filter((c) => c !== 'Todos');

const TIME_SLOTS = ['Manhã (08h–12h)', 'Tarde (12h–17h)', 'Fim de tarde (17h–20h)', 'Sem preferência'];

const MAX_FILES = 5;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/** Lê ?categoria=... do hash (ex.: #/solicitar-servico?categoria=Pintura). */
function categoryFromHash(): string {
  const q = window.location.hash.split('?')[1];
  if (!q) return '';
  const value = new URLSearchParams(q).get('categoria') ?? '';
  return SERVICE_CATEGORIES.includes(value) ? value : '';
}

type Form = {
  nome: string;
  telefone: string;
  email: string;
  endereco: string;
  categoria: string;
  servico: string;
  descricao: string;
  data: string;
  horario: string;
};

const EMPTY: Form = {
  nome: '',
  telefone: '+244 ',
  email: '',
  endereco: '',
  categoria: '',
  servico: '',
  descricao: '',
  data: '',
  horario: '',
};

export function RequestPage() {
  const [form, setForm] = useState<Form>(() => ({ ...EMPTY, categoria: categoryFromHash() }));
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { success, error } = useToast();

  const set = (k: keyof Form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    const valid = picked.filter((f) => f.size <= MAX_SIZE);
    if (valid.length < picked.length) {
      error('Ficheiro muito grande', 'Cada anexo pode ter no máximo 5 MB.');
    }
    setFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES));
  };

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const validate = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.nome.trim()) e.nome = 'Indique o seu nome';
    if (form.telefone.replace(/\D/g, '').length < 9) e.telefone = 'Indique um telefone válido';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido';
    if (!form.endereco.trim()) e.endereco = 'Indique o endereço';
    if (!form.categoria) e.categoria = 'Selecione a categoria';
    if (!form.servico.trim()) e.servico = 'Indique o serviço pretendido';
    if (!form.descricao.trim()) e.descricao = 'Descreva a necessidade';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      error('Confere os dados', 'Preenche os campos obrigatórios assinalados.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitServiceRequest({
        name: form.nome,
        phone: form.telefone,
        email: form.email || undefined,
        address: form.endereco,
        category: form.categoria,
        service: form.servico,
        description: form.descricao,
        desiredDate: form.data || undefined,
        timePreference: form.horario || undefined,
        attachments: files,
      });
      setDone(true);
      success('Pedido enviado!', 'Um profissional vai analisar a sua solicitação em breve.');
    } catch (err) {
      console.error('submit error', err);
      setSubmitError('Não foi possível enviar o pedido. Verifique a ligação e tente novamente.');
      error('Falha ao enviar', 'Verifica a ligação e tenta novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Shell>
        <SuccessScreen
          title="Pedido recebido!"
          message="A sua solicitação foi registada com sucesso. Um profissional qualificado irá analisá-la e entrar em contacto consigo em breve."
          primaryLabel="Voltar ao início"
          primaryTo="/"
          secondaryLabel="Ver serviços"
          secondaryTo="/services"
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-3xl border border-brand-dark/10 bg-white shadow-card">
          <div className="border-b border-brand-dark/10 bg-gradient-to-br from-brand-dark to-brand-dark2 p-7 text-white">
            <h2 className="font-display text-2xl font-extrabold">Detalhes do pedido</h2>
            <p className="mt-2 text-sm text-white/70">
              Quanto mais informação der, melhor o profissional entende a sua necessidade.
            </p>
          </div>

          <form onSubmit={onSubmit} className="p-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nome completo" name="nome" required error={errors.nome}>
                <TextInput id="nome" value={form.nome} hasError={!!errors.nome} onChange={(e) => set('nome', e.target.value)} placeholder="O seu nome" />
              </Field>
              <Field label="Número de telefone" name="telefone" required error={errors.telefone}>
                <TextInput id="telefone" type="tel" value={form.telefone} hasError={!!errors.telefone} onChange={(e) => set('telefone', e.target.value)} placeholder="+244 923 456 789" />
              </Field>
              <Field label="E-mail" name="email" error={errors.email}>
                <TextInput id="email" type="email" value={form.email} hasError={!!errors.email} onChange={(e) => set('email', e.target.value)} placeholder="opcional" />
              </Field>
              <Field label="Categoria do serviço" name="categoria" required error={errors.categoria}>
                <Select id="categoria" value={form.categoria} hasError={!!errors.categoria} onChange={(e) => set('categoria', e.target.value)}>
                  <option value="">Selecione...</option>
                  {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Endereço completo" name="endereco" required error={errors.endereco}>
                  <TextInput id="endereco" value={form.endereco} hasError={!!errors.endereco} onChange={(e) => set('endereco', e.target.value)} placeholder="Rua, bairro, município, referência…" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Serviço específico pretendido" name="servico" required error={errors.servico}>
                  <TextInput id="servico" value={form.servico} hasError={!!errors.servico} onChange={(e) => set('servico', e.target.value)} placeholder="Ex: Reparação de fuga de água na cozinha" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Descrição detalhada da necessidade" name="descricao" required error={errors.descricao}>
                  <TextArea id="descricao" value={form.descricao} hasError={!!errors.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="Descreva o problema, o contexto e o que espera do serviço." />
                </Field>
              </div>
              <Field label="Data desejada para execução" name="data" error={errors.data}>
                <TextInput id="data" type="date" value={form.data} onChange={(e) => set('data', e.target.value)} />
              </Field>
              <Field label="Horário preferencial" name="horario">
                <Select id="horario" value={form.horario} onChange={(e) => set('horario', e.target.value)}>
                  <option value="">Selecione...</option>
                  {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>

              {/* Anexos */}
              <div className="sm:col-span-2">
                <span className="text-sm font-semibold text-brand-dark">
                  Anexar imagens ou documentos <span className="font-normal text-ink-700/50">(opcional)</span>
                </span>
                <label
                  htmlFor="anexos"
                  className="mt-1.5 flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed border-brand-dark/20 p-5 transition-all duration-200 hover:border-brand-cyan hover:bg-brand-cyan/[0.03]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan/10 text-brand-cyan2">
                    <Paperclip size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-brand-dark">Clique para carregar</p>
                    <p className="text-xs text-ink-700/55">Fotos do problema ou documentos · PNG, JPG ou PDF · máx 5MB · até {MAX_FILES}</p>
                  </div>
                </label>
                <input id="anexos" type="file" accept="image/*,application/pdf" multiple className="sr-only" onChange={onFiles} />

                {files.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {files.map((f, i) => (
                      <li key={i} className="flex items-center gap-3 rounded-xl border border-cloud-200 bg-cloud-50 px-3.5 py-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-dark">
                          {f.type.startsWith('image/') ? <ImageIcon size={16} /> : <FileText size={16} />}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-ink-700">{f.name}</span>
                        <span className="shrink-0 text-xs text-ink-400">{(f.size / 1024).toFixed(0)} KB</span>
                        <button type="button" onClick={() => removeFile(i)} aria-label="Remover anexo" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-red-50 hover:text-red-500">
                          <X size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {submitError && (
              <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {submitError}
              </p>
            )}

            <div className="mt-7">
              <Button type="submit" size="lg" disabled={submitting} className="w-full">
                {submitting ? 'A enviar...' : <>Enviar pedido <ArrowRight size={18} /></>}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHero
        icon={ClipboardList}
        eyebrow="Solicitar serviço"
        title={<>Diga-nos o que precisa. <span className="text-gradient-cyan">Nós tratamos do resto.</span></>}
        subtitle="Preencha o pedido e ligamos a um profissional qualificado e verificado perto de si."
      />
      <section className="bg-cloud-50 py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">{children}</div>
      </section>
    </>
  );
}
