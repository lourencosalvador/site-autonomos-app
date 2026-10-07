import { ArrowRight, Bell, Briefcase, CalendarClock, ClipboardList, Clock, MessageSquare, Search, Star, Wallet, Wrench } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button';
import { useNavigate } from '../../router';

export function AccountPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const firstName = user.name.split(/\s+/)[0] || user.name;
  const isPro = user.role === 'professional';

  return (
    <section className="bg-cloud-50 pb-20 pt-28 lg:pt-32">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        {/* Boas-vindas */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} src={user.avatarUrl} />
            <div>
              <p className="text-sm font-medium text-ink-400">
                {isPro ? 'Painel do profissional' : 'A sua conta'}
              </p>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
                Olá, {firstName} 👋
              </h1>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cloud-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-600">
            <span className={`h-1.5 w-1.5 rounded-full ${isPro ? 'bg-brand-cyan2' : 'bg-emerald-500'}`} />
            {isPro ? `Profissional${user.workArea ? ` · ${user.workArea}` : ''}` : 'Cliente'}
          </span>
        </div>

        {isPro && user.approvalStatus === 'pending' && (
          <Banner tone="warning" title="Conta em verificação"
            text="A nossa equipa está a validar o seu perfil. Assim que for aprovado, começa a receber pedidos." />
        )}
        {isPro && user.approvalStatus === 'rejected' && (
          <Banner tone="danger" title="Perfil não aprovado"
            text="A sua candidatura não foi aprovada. Fale connosco pelo WhatsApp para rever a situação." />
        )}

        {/* Conteúdo por papel */}
        {isPro ? <ProviderHome /> : <ClientHome navigate={navigate} />}

        {/* Perfil resumido */}
        <div className="mt-8 rounded-3xl border border-cloud-200 bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg font-bold text-ink-900">O meu perfil</h2>
          <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <Row label="Nome" value={user.name} />
            <Row label="Email" value={user.email} />
            <Row label="Telefone" value={user.phone || '—'} />
            <Row label="Tipo de conta" value={isPro ? 'Profissional' : 'Cliente'} />
            {isPro && <Row label="Área de trabalho" value={user.workArea || '—'} />}
            {isPro && <Row label="Especialidade" value={user.specialty || '—'} />}
          </dl>
        </div>
      </div>
    </section>
  );
}

function ClientHome({ navigate }: { navigate: (p: string) => void }) {
  return (
    <>
      <div className="mt-8 overflow-hidden rounded-3xl bg-brand-dark p-7 text-white shadow-cardDark sm:p-9">
        <div className="relative z-10 max-w-lg">
          <h2 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">
            Precisa de um profissional?
          </h2>
          <p className="mt-2 text-white/70">
            Diga-nos o que precisa e ligamos ao profissional certo, perto de si.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button to="/solicitar-servico" size="lg">Solicitar serviço <ArrowRight size={18} /></Button>
            <Button to="/services" variant="outline-light" size="lg">Ver serviços</Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Tile icon={ClipboardList} title="Os meus pedidos" desc="Acompanhe os pedidos e o seu estado." soon />
        <Tile icon={MessageSquare} title="Mensagens" desc="Converse com os profissionais." soon />
        <Tile icon={Search} title="Explorar serviços" desc="Veja todas as categorias disponíveis." onClick={() => navigate('/services')} />
      </div>
    </>
  );
}

function ProviderHome() {
  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Bell} label="Novos pedidos" value="—" hint="em breve" />
        <Stat icon={CalendarClock} label="Em curso" value="—" hint="em breve" />
        <Stat icon={Star} label="Avaliação" value="—" hint="sem avaliações" />
        <Stat icon={Wallet} label="Saldo" value="—" hint="em breve" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Tile icon={Briefcase} title="Pedidos disponíveis" desc="Receba e aceite pedidos da sua área." soon />
        <Tile icon={MessageSquare} title="Mensagens" desc="Converse com os seus clientes." soon />
        <Tile icon={Wrench} title="O meu catálogo" desc="Mostre os seus trabalhos e preços." soon />
      </div>
    </>
  );
}

/* ---------------- Blocos ---------------- */

function Tile({ icon: Icon, title, desc, soon, onClick }: {
  icon: typeof ClipboardList; title: string; desc: string; soon?: boolean; onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-cyan/12 text-brand-dark">
        <Icon size={20} />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <h3 className="font-display text-base font-bold text-ink-900">{title}</h3>
        {soon && <span className="rounded-full bg-cloud-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400">Em breve</span>}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-ink-500">{desc}</p>
    </>
  );
  const base = 'rounded-3xl border border-cloud-200 bg-white p-6 text-left shadow-soft transition-all duration-300';
  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} hover:-translate-y-1 hover:border-brand-cyan/40 hover:shadow-cardHover`}>
        {inner}
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-dark">Abrir <ArrowRight size={14} /></span>
      </button>
    );
  }
  return <div className={`${base} ${soon ? 'opacity-80' : ''}`}>{inner}</div>;
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Bell; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-cloud-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <Icon size={16} className="text-ink-400" />
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold text-ink-900">{value}</p>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400"><Clock size={11} /> {hint}</p>
    </div>
  );
}

function Banner({ tone, title, text }: { tone: 'warning' | 'danger'; title: string; text: string }) {
  const styles = tone === 'warning'
    ? 'border-amber-200 bg-amber-50 text-amber-900'
    : 'border-red-200 bg-red-50 text-red-800';
  return (
    <div className={`mt-6 rounded-2xl border px-5 py-4 ${styles}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-0.5 text-sm opacity-90">{text}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-cloud-100 py-2 last:border-0 sm:border-0">
      <dt className="text-sm text-ink-400">{label}</dt>
      <dd className="text-sm font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-dark text-lg font-bold text-white">
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials}
    </div>
  );
}
