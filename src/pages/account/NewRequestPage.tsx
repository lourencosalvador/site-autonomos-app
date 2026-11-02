import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, Crosshair, Loader2, MessageSquarePlus, Search, SearchX, X } from 'lucide-react';
import { TextInput, TextArea, Select } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import { useCategories, useServices } from '../../hooks/useServices';
import { createBroadcast } from '../../lib/broadcasts';
import { POPULAR_SERVICES, searchServices } from '../../lib/serviceSearch';
import { track } from '../../lib/analytics';
import type { Service } from '../../data';
import { navigate, hashParam } from '../../router';
import { Btn, Card, PageHeader, cx } from '../../components/app/ui';
import { FormField, PROVINCES, ProvinceSelect } from '../../components/app/forms';

type Key = 'category' | 'description' | 'province' | 'municipality' | 'neighborhood';
type Step = 'catalog' | 'form';
type Choose = (service: Service | null, media?: HTMLElement | null, title?: HTMLElement | null) => void;

/** Muda de passo com uma View Transition (a imagem do card passa para o topo do formulário). */
function transition(update: () => void) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce) { update(); return null; }
  return document.startViewTransition(() => flushSync(update));
}

function setHashCategory(category: string | null) {
  const hash = '#/conta/pedir' + (category ? `?categoria=${encodeURIComponent(category)}` : '');
  window.history.replaceState(window.history.state, '', hash);
}

export function NewRequestPage() {
  const initial = hashParam('categoria') ?? '';
  const [step, setStep] = useState<Step>(initial ? 'form' : 'catalog');
  const [category, setCategory] = useState(initial);
  // Card que recebe a imagem ao voltar ao catálogo (animação inversa).
  const [returning, setReturning] = useState<string | null>(null);

  const choose: Choose = (service, media, title) => {
    if (media) media.style.viewTransitionName = 'svc-media';
    if (title) title.style.viewTransitionName = 'svc-title';
    if (service) track('service_click', service.category);
    transition(() => {
      setCategory(service?.category ?? '');
      setStep('form');
      setHashCategory(service?.category ?? null);
      window.scrollTo({ top: 0 });
    });
  };

  const back = () => {
    setHashCategory(null);
    const t = transition(() => {
      setReturning(category || null);
      setStep('catalog');
      window.scrollTo({ top: 0 });
    });
    if (t) t.finished.finally(() => setReturning(null));
    else setReturning(null);
  };

  return step === 'catalog'
    ? <Catalog onChoose={choose} returning={returning} />
    : <RequestForm category={category} onCategory={setCategory} onBack={back} />;
}

function Steps({ step }: { step: Step }) {
  const items: { id: Step; label: string }[] = [{ id: 'catalog', label: 'Serviço' }, { id: 'form', label: 'Detalhes' }];
  const at = items.findIndex((i) => i.id === step);
  return (
    <ol className="mb-6 flex items-center gap-3 text-sm font-medium" aria-label="Passos do pedido">
      {items.map((it, i) => (
        <li key={it.id} className="flex items-center gap-3">
          {i > 0 && <span className={cx('h-px w-8 sm:w-12', i <= at ? 'bg-brand-dark' : 'bg-line')} />}
          <span className={cx('flex items-center gap-2', i <= at ? 'text-ink-900' : 'text-ink-400')} aria-current={i === at ? 'step' : undefined}>
            <span className={cx('flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors',
              i < at ? 'bg-brand-dark text-white' : i === at ? 'bg-brand-cyan text-brand-dark' : 'bg-cloud-200 text-ink-500')}>
              {i < at ? <Check size={13} strokeWidth={3} /> : i + 1}
            </span>
            {it.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Catalog({ onChoose, returning }: { onChoose: Choose; returning: string | null }) {
  const services = useServices();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchServices(services, query), [services, query]);
  const searching = query.trim().length > 0;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    const t = window.setTimeout(() => track('search', q), 1200);
    return () => window.clearTimeout(t);
  }, [query]);

  return (
    <>
      <PageHeader back={{ label: 'Início', to: '/conta' }} title="Novo pedido" description="Escolha o serviço de que precisa. A seguir, conte-nos os detalhes." />
      <Steps step="catalog" />

      <div className="relative">
        <label htmlFor="svc-search" className="sr-only">Pesquisar serviços</label>
        <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          id="svc-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Que serviço procura?"
          autoComplete="off"
          className="h-14 w-full rounded-2xl border border-line bg-white pl-12 pr-12 text-base text-ink-900 transition-colors placeholder:text-ink-400 focus:border-brand-cyan2 focus:outline-none focus:ring-4 focus:ring-brand-cyan/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {searching && (
          <button type="button" onClick={() => setQuery('')} aria-label="Limpar pesquisa"
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-ink-400 transition-colors hover:bg-cloud-100 hover:text-ink-700">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="-mx-4 mt-4 flex min-h-9 items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden [&>*]:shrink-0">
        {searching ? (
          <p className="text-[15px] text-ink-500" aria-live="polite">
            {results.length === 0 ? 'Nenhum serviço encontrado' : `${results.length} ${results.length === 1 ? 'serviço encontrado' : 'serviços encontrados'}`}
          </p>
        ) : (
          <>
            <span className="mr-1 text-sm font-medium text-ink-400">Mais procurados</span>
            {POPULAR_SERVICES.map((p) => (
              <button key={p} type="button" onClick={() => setQuery(p)}
                className="h-9 rounded-xl border border-line bg-white px-3.5 text-sm font-medium text-ink-700 transition-colors hover:border-brand-cyan2 hover:text-brand-dark">
                {p}
              </button>
            ))}
          </>
        )}
      </div>

      {results.length > 0 ? (
        <div className="ui-stagger mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {results.map((s) => <ServiceTile key={s.id} service={s} named={returning === s.category} onChoose={onChoose} />)}
          <button type="button" onClick={() => onChoose(null)}
            className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-white/60 p-6 text-center transition-colors hover:border-brand-cyan2 hover:bg-white">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cloud-100 text-brand-dark"><MessageSquarePlus size={22} /></span>
            <span className="text-base font-semibold text-ink-900">Não encontra o serviço?</span>
            <span className="max-w-[240px] text-[15px] text-ink-500">Descreva o que precisa e nós encontramos o profissional certo.</span>
          </button>
        </div>
      ) : (
        <Card className="mt-6 px-6 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-cloud-100 text-ink-500"><SearchX size={22} /></span>
          <h3 className="mt-4 text-lg font-semibold text-ink-900">Não encontrámos “{query.trim()}”</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-[15px] text-ink-500">Descreva o que precisa no pedido e nós encontramos o profissional certo para si.</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Btn onClick={() => onChoose(null)}>Descrever o pedido <ArrowRight size={18} /></Btn>
            <Btn variant="ghost" onClick={() => setQuery('')}>Limpar pesquisa</Btn>
          </div>
        </Card>
      )}
    </>
  );
}

function ServiceTile({ service, named, onChoose }: { service: Service; named: boolean; onChoose: Choose }) {
  const media = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  return (
    <button type="button" onClick={() => onChoose(service, media.current, title.current)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white text-left transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan2/60">
      <div ref={media} className="relative h-40 w-full overflow-hidden bg-cloud-100" style={named ? { viewTransitionName: 'svc-media' } : undefined}>
        <img src={service.image} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      </div>
      <div className="flex w-full flex-1 flex-col p-5">
        <h3 ref={title} className="w-fit text-lg font-semibold tracking-tight text-ink-900" style={named ? { viewTransitionName: 'svc-title' } : undefined}>{service.title}</h3>
        <p className="mt-1 line-clamp-2 text-[15px] leading-relaxed text-ink-500">{service.description}</p>
        <span className="mt-auto flex items-center justify-between pt-4">
          <span className="text-sm text-ink-400">Orçamento grátis</span>
          <span className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-dark px-4 text-[15px] font-semibold text-white transition-colors group-hover:bg-brand-dark2">
            Solicitar <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>
      </div>
    </button>
  );
}

function RequestForm({ category, onCategory, onBack }: { category: string; onCategory: (c: string) => void; onBack: () => void }) {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const services = useServices();
  const categories = useCategories();
  const service = services.find((s) => s.category === category) ?? null;
  // O banner só aparece quando o serviço veio do catálogo; escolher na lista não o faz aparecer a meio.
  const [fromCatalog] = useState(!!service);
  const showBanner = !!service && fromCatalog;
  const [form, setForm] = useState({
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
    if (!category) err.category = 'Escolha a categoria do serviço.';
    if (form.description.trim().length < 10) err.description = 'Descreva o que precisa (mínimo 10 caracteres).';
    if (!form.province) err.province = 'Escolha a província.';
    if (form.municipality.trim().length < 2) err.municipality = 'Indique o município.';
    if (form.neighborhood.trim().length < 2) err.neighborhood = 'Indique o bairro.';
    setErrors(err);
    if (Object.keys(err).length) return;

    setBusy(true);
    try {
      const b = await createBroadcast({
        category,
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
      <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-[15px] font-medium text-ink-500 transition-colors hover:text-ink-900">
        <ArrowLeft size={17} /> Escolher outro serviço
      </button>
      <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[2rem]">Novo pedido</h1>
      <p className="mb-6 mt-1.5 text-base text-ink-500">Diga-nos o que precisa. Enviamos o pedido aos profissionais verificados da área.</p>
      <Steps step="form" />

      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {showBanner && service && (
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="relative h-36 bg-cloud-100 sm:h-44" style={{ viewTransitionName: 'svc-media' }}>
              <img src={service.image} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/75 via-ink-950/10 to-transparent" />
              <button type="button" onClick={onBack}
                className="absolute right-3 top-3 inline-flex h-9 items-center rounded-xl bg-white/90 px-3 text-sm font-semibold text-ink-900 backdrop-blur transition-colors hover:bg-white">
                Trocar
              </button>
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-white/70">Serviço escolhido</p>
                <h2 className="mt-0.5 w-fit text-xl font-semibold tracking-tight text-white sm:text-2xl" style={{ viewTransitionName: 'svc-title' }}>{service.title}</h2>
              </div>
            </div>
            <p className="px-5 py-4 text-[15px] leading-relaxed text-ink-500">{service.description}</p>
          </div>
        )}

        <Card className="ui-fade-up space-y-6 p-5 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight text-ink-900">{showBanner ? 'O que precisa' : 'O serviço'}</h2>
          {!showBanner && (
            <FormField label="Categoria" htmlFor="category" required error={errors.category}>
              <Select id="category" value={category} hasError={!!errors.category} onChange={(e) => { onCategory(e.target.value); setErrors((x) => ({ ...x, category: undefined })); }}>
                <option value="">Selecione a categoria</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormField>
          )}
          <FormField label="Descreva o problema" htmlFor="description" required error={errors.description}>
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

        <Card className="ui-fade-up space-y-6 p-5 sm:p-8">
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
