import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Bell, BellOff, Briefcase, Building2, ChevronDown, ChevronLeft, HelpCircle, KeyRound, LogOut, Mail, MapPin, Pencil,
  PencilLine, ShieldCheck, Smartphone, Tags, UserRound, type LucideIcon,
} from 'lucide-react';
import { useAuth, type AuthUser } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { TextArea, TextInput } from '../../components/Field';
import { FAQS } from '../../components/FaqSection';
import { useCategories } from '../../hooks/useServices';
import { updateMyProfile, providerReviews, type ProviderReviews } from '../../lib/hub';
import { type CatalogItem, addCatalogItem, deleteCatalogItem, myCatalog, updateCatalogItem, uploadCatalogImage } from '../../lib/catalog';
import { changeAvatar, changePassword } from '../../lib/profile';
import { hashParam, navigate } from '../../router';
import { AreaPicker, CompanyField } from '../../components/app/AreaPicker';
import { HeaderIconButton, Modal, Portfolio, ProfileHeader, ProfileTabs, ReviewsView, StarsButton } from '../../components/app/profile';
import { Badge, Btn, Card, EmptyState, Spinner, cx } from '../../components/app/ui';

type Tab = 'info' | 'portfolio' | 'reviews';
type Panel = 'pessoais' | 'password' | 'privacidade' | 'telefone' | 'faq';

const MENU: { id: Panel | 'sair'; label: string; icon: LucideIcon; editable?: boolean }[] = [
  { id: 'pessoais', label: 'Informações pessoais', icon: UserRound, editable: true },
  { id: 'password', label: 'Palavra-passe', icon: KeyRound, editable: true },
  { id: 'privacidade', label: 'Privacidade', icon: ShieldCheck, editable: true },
  { id: 'telefone', label: 'Número de telefone', icon: Smartphone, editable: true },
  { id: 'faq', label: 'Perguntas frequentes', icon: HelpCircle },
  { id: 'sair', label: 'Sair', icon: LogOut },
];

const APPROVAL = {
  approved: { label: 'Perfil aprovado', tone: 'success' },
  pending: { label: 'Em verificação', tone: 'warning' },
  rejected: { label: 'Não aprovado', tone: 'danger' },
} as const;

export function ProfilePage() {
  const { user, refresh, signOut } = useAuth();
  const { success, error: toastError } = useToast();
  const isPro = user?.role === 'professional';
  const initialTab = hashParam('tab');
  const [tab, setTab] = useState<Tab>(isPro && (initialTab === 'portfolio' || initialTab === 'avaliacoes') ? (initialTab === 'portfolio' ? 'portfolio' : 'reviews') : 'info');
  const [panel, setPanel] = useState<Panel | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [reviews, setReviews] = useState<ProviderReviews | null>(null);

  const loadCatalog = useCallback(async () => {
    try { setItems(await myCatalog()); } catch { setItems((v) => v ?? []); }
  }, []);
  useEffect(() => {
    if (!isPro) return;
    void loadCatalog();
    providerReviews().then(setReviews).catch(() => setReviews({ average: 0, count: 0, items: [] }));
  }, [isPro, loadCatalog]);

  if (!user) return null;

  const onAvatar = async (file: File) => {
    setUploading(true);
    try { await changeAvatar(file); await refresh(); success('Foto atualizada'); }
    catch (e) { toastError('Não foi possível mudar a foto', e instanceof Error ? e.message : undefined); }
    finally { setUploading(false); }
  };

  const openMenu = (id: Panel | 'sair') => {
    if (id === 'sair') { void signOut().then(() => navigate('/')); return; }
    setPanel(id);
  };

  const subtitle = isPro
    ? [user.specialty || user.workAreas[0], user.companyName].filter(Boolean).join(' · ') || 'Profissional'
    : 'Cliente';
  const approval = isPro && user.approvalStatus ? APPROVAL[user.approvalStatus] : null;

  return (
    <>
      <ProfileHeader
        name={user.name}
        email={user.email}
        subtitle={subtitle}
        avatarUrl={user.avatarUrl}
        onAvatar={onAvatar}
        uploading={uploading}
        actions={
          <>
            <HeaderIconButton label="Editar perfil" onClick={() => { setTab('info'); setPanel('pessoais'); }}><PencilLine size={21} /></HeaderIconButton>
            <HeaderIconButton label="Notificações" onClick={() => setNotifOpen(true)}><Bell size={21} /></HeaderIconButton>
          </>
        }
      />

      <div className="my-5 flex flex-col items-center gap-2 sm:my-6 sm:flex-row sm:justify-between">
        {isPro ? (
          <ProfileTabs value={tab === 'reviews' ? 'info' : tab} onChange={(v) => setTab(v)} tabs={[{ value: 'info', label: 'Informações' }, { value: 'portfolio', label: 'Portfólio' }]} />
        ) : <span className="hidden sm:block" />}
        <div className="flex items-center gap-2">
          {approval && <Badge tone={approval.tone} className="hidden px-3 py-1 text-sm sm:inline-flex">{approval.label}</Badge>}
          {isPro && <StarsButton average={reviews?.average ?? 0} count={reviews?.count ?? 0} onClick={() => setTab('reviews')} />}
        </div>
      </div>

      {tab === 'portfolio' && isPro && (
        items === null ? <div className="flex justify-center py-12"><Spinner /></div> : (
          <Portfolio
            items={items}
            editable
            onUpload={async (file, caption, album) => {
              const url = await uploadCatalogImage(file);
              await addCatalogItem(url, caption, album);
              await loadCatalog();
              success('Foto publicada');
            }}
            onUpdate={async (id, caption, album) => {
              try { await updateCatalogItem(id, caption, album); await loadCatalog(); success('Foto atualizada'); }
              catch (e) { toastError('Não foi possível guardar', e instanceof Error ? e.message : undefined); }
            }}
            onDelete={async (id) => {
              try { await deleteCatalogItem(id); await loadCatalog(); success('Foto apagada'); }
              catch (e) { toastError('Não foi possível apagar', e instanceof Error ? e.message : undefined); }
            }}
          />
        )
      )}

      {tab === 'reviews' && isPro && (
        <div>
          <button onClick={() => setTab('info')} className="mb-4 inline-flex items-center gap-1 text-[15px] font-medium text-ink-500 hover:text-ink-900">
            <ChevronLeft size={18} /> Voltar ao perfil
          </button>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-ink-900">Avaliações</h2>
          {reviews === null ? <div className="flex justify-center py-12"><Spinner /></div> : <ReviewsView average={reviews.average} count={reviews.count} items={reviews.items} />}
        </div>
      )}

      {tab === 'info' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(260px,320px)_1fr]">
          <nav className={cx('space-y-2', panel && 'hidden md:block')}>
            {MENU.map((m) => {
              const active = (panel ?? 'pessoais') === m.id;
              const Icon = m.icon;
              return (
                <button key={m.id} onClick={() => openMenu(m.id)}
                  className={cx(
                    'flex h-14 w-full items-center gap-3 rounded-xl border border-line bg-white px-4 text-left transition-colors hover:bg-cloud-50',
                    active && 'md:border-brand-cyan2 md:bg-brand-cyan/[0.06]',
                  )}>
                  <Icon size={20} className={m.id === 'sair' ? 'text-red-500' : 'text-ink-400'} />
                  <span className={cx('flex-1 text-[15px] font-medium', m.id === 'sair' ? 'text-red-600' : 'text-ink-700')}>{m.label}</span>
                  {m.editable && <Pencil size={17} className="text-brand-cyan2" />}
                </button>
              );
            })}
          </nav>

          <section className={cx(!panel && 'hidden md:block')}>
            <button onClick={() => setPanel(null)} className="mb-4 inline-flex items-center gap-1 text-[15px] font-medium text-ink-500 hover:text-ink-900 md:hidden">
              <ChevronLeft size={18} /> Informações
            </button>
            <PanelView panel={panel ?? 'pessoais'} user={user} />
          </section>
        </div>
      )}

      <Modal open={notifOpen} onClose={() => setNotifOpen(false)} className="max-w-md">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-lg font-semibold text-ink-900">Notificações</h3>
          <button onClick={() => setNotifOpen(false)} aria-label="Fechar" className="rounded-lg p-2 text-ink-400 hover:bg-cloud-100">✕</button>
        </div>
        <EmptyState icon={BellOff} title="Sem notificações" description="Quando houver novidades sobre os seus pedidos, aparecem aqui." />
      </Modal>
    </>
  );
}

function PanelView({ panel, user }: { panel: Panel; user: AuthUser }) {
  switch (panel) {
    case 'pessoais': return <PersonalPanel user={user} />;
    case 'password': return <PasswordPanel />;
    case 'privacidade': return <PrivacyPanel isPro={user.role === 'professional'} />;
    case 'telefone': return <PhonePanel user={user} />;
    case 'faq': return <FaqPanel />;
  }
}

function PanelTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold tracking-tight text-ink-900">{title}</h2>
      {description && <p className="mt-1 text-[15px] text-ink-500">{description}</p>}
    </div>
  );
}

function useSaveProfile(user: AuthUser) {
  const { refresh } = useAuth();
  const { success, error: toastError } = useToast();
  return async (patch: Partial<{ name: string; phone: string | null; province: string | null; specialty: string | null; bio: string | null; workAreas: string[]; companyName: string | null }>) => {
    const isPro = user.role === 'professional';
    try {
      await updateMyProfile({
        name: patch.name ?? user.name,
        phone: 'phone' in patch ? patch.phone : user.phone,
        province: 'province' in patch ? patch.province : user.province,
        bio: 'bio' in patch ? patch.bio : user.bio,
        specialty: isPro ? ('specialty' in patch ? patch.specialty : user.specialty) : null,
        workAreas: isPro ? patch.workAreas ?? user.workAreas : null,
        companyName: isPro ? ('companyName' in patch ? patch.companyName : user.companyName) : null,
      });
      await refresh();
      success('Alteração guardada');
      return true;
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      toastError('Não foi possível guardar', m.includes('AREAS_REQUIRED') ? 'Escolha pelo menos uma área.' : m.includes('TOO_MANY_AREAS') ? 'Máximo de 3 áreas.' : undefined);
      return false;
    }
  };
}

function FieldCard({ icon: Icon, label, value, placeholder, editable = true, renderEdit, onSave, hint }: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  placeholder?: string;
  editable?: boolean;
  hint?: string;
  renderEdit?: () => ReactNode;
  onSave?: () => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const empty = value === null || value === undefined || value === '';
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <Icon size={19} className="shrink-0 text-ink-400" />
        <p className="flex-1 text-[15px] font-semibold text-ink-900">{label}</p>
        {editable && !editing && (
          <button onClick={() => setEditing(true)} aria-label={`Editar ${label}`} className="rounded-lg p-2 text-brand-cyan2 transition-colors hover:bg-cloud-100">
            <PencilLine size={18} />
          </button>
        )}
      </div>
      {editing && renderEdit ? (
        <div className="mt-3 space-y-3">
          {renderEdit()}
          <div className="flex gap-2">
            <Btn size="md" loading={busy} onClick={async () => {
              if (!onSave) return;
              setBusy(true);
              const ok = await onSave();
              setBusy(false);
              if (ok) setEditing(false);
            }}>Guardar</Btn>
            <Btn size="md" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>Cancelar</Btn>
          </div>
        </div>
      ) : (
        <div className={cx('mt-2 pl-8 text-[15px] leading-relaxed', empty ? 'text-ink-400' : 'text-ink-600')}>
          {empty ? placeholder ?? 'Por preencher' : value}
        </div>
      )}
      {hint && !editing && <p className="mt-1.5 pl-8 text-sm text-ink-400">{hint}</p>}
    </Card>
  );
}

function PersonalPanel({ user }: { user: AuthUser }) {
  const save = useSaveProfile(user);
  const categories = useCategories();
  const isPro = user.role === 'professional';
  const [name, setName] = useState(user.name);
  const [province, setProvince] = useState(user.province ?? '');
  const [specialty, setSpecialty] = useState(user.specialty ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [areas, setAreas] = useState<string[]>(user.workAreas);
  const [isCompany, setIsCompany] = useState(!!user.companyName);
  const [company, setCompany] = useState(user.companyName ?? '');
  const { error: toastError } = useToast();

  return (
    <div>
      <PanelTitle title="Informações pessoais" description="Toque no lápis para editar cada dado." />
      <div className="space-y-3">
        <FieldCard icon={UserRound} label="Nome" value={user.name}
          renderEdit={() => <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />}
          onSave={async () => { if (name.trim().length < 2) { toastError('Indique o seu nome.'); return false; } return save({ name: name.trim() }); }} />
        <FieldCard icon={Mail} label="E-mail" value={user.email} editable={false} hint="O email da conta não pode ser alterado." />
        <FieldCard icon={MapPin} label="Província / Cidade" value={user.province} placeholder="Ex.: Luanda"
          renderEdit={() => <TextInput value={province} onChange={(e) => setProvince(e.target.value)} placeholder="Ex.: Luanda" autoFocus />}
          onSave={() => save({ province: province.trim() || null })} />
        {isPro && (
          <>
            <FieldCard icon={Briefcase} label="Profissão / especialidade" value={user.specialty} placeholder="Ex.: Canalizador, fotógrafo…"
              renderEdit={() => <TextInput value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ex.: Deteção e reparação de fugas" autoFocus />}
              onSave={() => save({ specialty: specialty.trim() || null })} />
            <FieldCard icon={Tags} label="Áreas de atuação" value={user.workAreas.length ? user.workAreas.join(' · ') : null}
              hint="Recebe pedidos apenas destas áreas (máximo 3)."
              renderEdit={() => <AreaPicker options={categories} value={areas} onChange={setAreas} />}
              onSave={async () => { if (!areas.length) { toastError('Escolha pelo menos uma área.'); return false; } return save({ workAreas: areas }); }} />
            <FieldCard icon={Building2} label="Empresa" value={user.companyName ?? 'Trabalho individual'}
              renderEdit={() => <CompanyField enabled={isCompany} name={company} onToggle={setIsCompany} onName={setCompany} />}
              onSave={async () => {
                if (isCompany && company.trim().length < 2) { toastError('Indique o nome da empresa.'); return false; }
                return save({ companyName: isCompany ? company.trim() : null });
              }} />
          </>
        )}
        <FieldCard icon={PencilLine} label="Sobre si" value={user.bio} placeholder={isPro ? 'Conte a sua experiência aos clientes.' : 'Uma breve apresentação.'}
          renderEdit={() => <TextArea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Conte a sua experiência." autoFocus />}
          onSave={() => save({ bio: bio.trim() || null })} />
      </div>
    </div>
  );
}

function PhonePanel({ user }: { user: AuthUser }) {
  const save = useSaveProfile(user);
  const [phone, setPhone] = useState(user.phone ?? '+244 ');
  return (
    <div>
      <PanelTitle title="Número de telefone" description="Usado para o contacto entre cliente e profissional." />
      <FieldCard icon={Smartphone} label="Telefone / WhatsApp" value={user.phone} placeholder="Adicione o seu número"
        hint="Só é partilhado com a outra parte depois de um pedido ser aceite."
        renderEdit={() => <TextInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+244 9XX XXX XXX" autoFocus />}
        onSave={() => save({ phone: phone.replace(/\D/g, '').length >= 9 ? phone.trim() : null })} />
    </div>
  );
}

function PasswordPanel() {
  const { success } = useToast();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setError(null);
    if (pw.length < 6) return setError('A palavra-passe deve ter pelo menos 6 caracteres.');
    if (pw !== confirm) return setError('As palavras-passe não coincidem.');
    setBusy(true);
    try { await changePassword(pw); setPw(''); setConfirm(''); success('Palavra-passe alterada'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível mudar a palavra-passe.'); }
    finally { setBusy(false); }
  };
  return (
    <div>
      <PanelTitle title="Palavra-passe" description="Escolha uma palavra-passe com pelo menos 6 caracteres." />
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="space-y-1.5">
          <label htmlFor="pw" className="text-[15px] font-medium text-ink-900">Nova palavra-passe</label>
          <TextInput id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => { setPw(e.target.value); setError(null); }} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pw2" className="text-[15px] font-medium text-ink-900">Confirmar palavra-passe</label>
          <TextInput id="pw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(null); }} />
        </div>
        {error && <p className="text-[15px] font-medium text-red-600">{error}</p>}
        <Btn onClick={submit} loading={busy}>Alterar palavra-passe</Btn>
      </Card>
    </div>
  );
}

function PrivacyPanel({ isPro }: { isPro: boolean }) {
  const rows = isPro
    ? [
        ['O que os clientes veem', 'O seu nome, foto, profissão, áreas, empresa, portfólio e avaliações.'],
        ['Contactos', 'O seu telefone só é partilhado com o cliente depois de aceitar o pedido.'],
        ['Pagamentos', 'Os valores ficam retidos pela AUTONOMOUS até o cliente confirmar o serviço.'],
      ]
    : [
        ['O que os profissionais veem', 'O seu nome, foto e os detalhes do pedido que fizer.'],
        ['Contactos', 'O seu telefone só é partilhado com o profissional que aceitar o seu pedido.'],
        ['Pagamentos', 'O valor fica retido pela AUTONOMOUS até confirmar que o serviço foi concluído.'],
      ];
  return (
    <div>
      <PanelTitle title="Privacidade" description="Como os seus dados são usados na AUTONOMOUS." />
      <Card className="divide-y divide-line">
        {rows.map(([t, d]) => (
          <div key={t} className="p-4 sm:p-5">
            <p className="text-[15px] font-semibold text-ink-900">{t}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{d}</p>
          </div>
        ))}
      </Card>
    </div>
  );
}

function FaqPanel() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      <PanelTitle title="Perguntas frequentes" />
      <Card className="divide-y divide-line">
        {FAQS.map((f, i) => (
          <div key={f.q}>
            <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5">
              <span className="text-[15px] font-medium text-ink-900">{f.q}</span>
              <ChevronDown size={18} className={cx('shrink-0 text-ink-400 transition-transform', open === i && 'rotate-180')} />
            </button>
            {open === i && <p className="px-4 pb-4 text-[15px] leading-relaxed text-ink-500 sm:px-5">{f.a}</p>}
          </div>
        ))}
      </Card>
    </div>
  );
}
