import { useEffect, useState, type ReactNode } from 'react';
import {
  Bell, Briefcase, Building2, ChevronDown, ChevronLeft, Clock, FileText, HelpCircle, KeyRound, Landmark, LogOut, Mail, MapPin, Pencil,
  PencilLine, ShieldCheck, Smartphone, Sparkles, Tags, UserRound, type LucideIcon,
} from 'lucide-react';
import { useAuth, type AuthUser } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { TextArea, TextInput } from '../../components/Field';
import { FAQS } from '../../components/FaqSection';
import { useCategories } from '../../hooks/useServices';
import { type ProfileInput, profileErrorMessage, providerReviews, updateMyProfile, type ProviderReviews } from '../../lib/hub';
import { changeAvatar, changePassword, saveIdDocument, uploadIdDocument } from '../../lib/profile';
import { formatIban, isValidAoPhone, isValidIban } from '../../lib/phone';
import { hashParam, navigate } from '../../router';
import { AreaPicker } from '../../components/app/AreaPicker';
import { CompanyPicker, FilePick, PasswordInput, PhoneInput, ProvinceSelect } from '../../components/app/forms';
import { ProfessionalForm } from '../../components/app/ProfessionalForm';
import { FeeExplainer } from '../../components/app/FeeExplainer';
import { useInbox } from '../../components/app/Inbox';
import { HeaderIconButton, ProfileHeader, ProfileTabs, ReviewsView, StarsButton } from '../../components/app/profile';
import { ComingSoon } from '../../components/app/ComingSoon';
import { Badge, Btn, Card, Notice, Spinner, cx } from '../../components/app/ui';

type Tab = 'info' | 'portfolio' | 'reviews';
type Panel = 'pessoais' | 'banco' | 'password' | 'privacidade' | 'telefone' | 'taxas' | 'profissional' | 'faq';
type MenuItem = { id: Panel | 'sair'; label: string; icon: LucideIcon; editable?: boolean };

function menuFor(user: AuthUser): MenuItem[] {
  return [
    { id: 'pessoais', label: 'Informações pessoais', icon: UserRound, editable: true },
    ...(user.isProfessional ? [{ id: 'banco', label: 'Dados bancários (IBAN)', icon: Landmark, editable: true } as MenuItem] : []),
    { id: 'password', label: 'Palavra-passe', icon: KeyRound, editable: true },
    { id: 'telefone', label: 'Número de telefone', icon: Smartphone, editable: true },
    { id: 'privacidade', label: 'Privacidade', icon: ShieldCheck },
    { id: 'taxas', label: 'Taxas e pagamentos', icon: FileText },
    ...(!user.isProfessional ? [{ id: 'profissional', label: 'Tornar-me profissional', icon: Sparkles } as MenuItem] : []),
    { id: 'faq', label: 'Perguntas frequentes', icon: HelpCircle },
    { id: 'sair', label: 'Sair', icon: LogOut },
  ];
}

const APPROVAL = {
  approved: { label: 'Perfil aprovado', tone: 'success' },
  pending: { label: 'Em verificação', tone: 'warning' },
  rejected: { label: 'Não aprovado', tone: 'danger' },
} as const;

export function ProfilePage() {
  const { user, refresh, signOut } = useAuth();
  const { success, error: toastError } = useToast();
  const { openNotifications, unread } = useInbox();
  const isPro = !!user?.isProfessional;
  const initialTab = hashParam('tab');
  const initialPanel = hashParam('painel') as Panel | null;
  const [tab, setTab] = useState<Tab>(isPro && initialTab === 'portfolio' ? 'portfolio' : isPro && initialTab === 'avaliacoes' ? 'reviews' : 'info');
  const [panel, setPanel] = useState<Panel | null>(initialPanel);
  const [uploading, setUploading] = useState(false);
  const [reviews, setReviews] = useState<ProviderReviews | null>(null);

  useEffect(() => {
    if (!isPro) return;
    providerReviews().then(setReviews).catch(() => setReviews({ average: 0, count: 0, items: [] }));
  }, [isPro]);

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
  const menu = menuFor(user);

  return (
    <>
      <ProfileHeader
        name={user.name}
        email={user.email || user.phone}
        subtitle={subtitle}
        avatarUrl={user.avatarUrl}
        onAvatar={onAvatar}
        uploading={uploading}
        actions={
          <>
            <HeaderIconButton label="Editar perfil" onClick={() => { setTab('info'); setPanel('pessoais'); }}><PencilLine size={21} /></HeaderIconButton>
            <HeaderIconButton label="Notificações" onClick={openNotifications}>
              <span className="relative">
                <Bell size={21} />
                {unread.notifications > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-brand-cyan" />}
              </span>
            </HeaderIconButton>
          </>
        }
      />

      {isPro && user.approvalStatus === 'approved' && !user.iban && (
        <Notice tone="warning" title="Indique o seu IBAN" className="mt-5" action={<Btn size="md" variant="outline" onClick={() => { setTab('info'); setPanel('banco'); }}>Adicionar IBAN</Btn>}>
          Precisamos do seu IBAN para transferir o valor dos serviços concluídos.
        </Notice>
      )}

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
        <ComingSoon
          title="O portfólio está quase pronto"
          description="Em breve vai poder publicar fotos dos seus trabalhos e organizá-las em álbuns para os clientes verem. Entretanto, mantenha o seu perfil completo."
          action={<Btn variant="outline" onClick={() => { setTab('info'); setPanel('pessoais'); }}>Completar o meu perfil</Btn>}
        />
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
            {menu.map((m) => {
              const active = (panel ?? 'pessoais') === m.id;
              const Icon = m.icon;
              return (
                <button key={m.id} onClick={() => openMenu(m.id)}
                  className={cx(
                    'flex h-14 w-full items-center gap-3 rounded-xl border border-line bg-white px-4 text-left transition-colors hover:bg-cloud-50',
                    active && 'md:border-brand-cyan2 md:bg-brand-cyan/[0.06]',
                  )}>
                  <Icon size={20} className={m.id === 'sair' ? 'text-red-500' : m.id === 'profissional' ? 'text-brand-dark' : 'text-ink-400'} />
                  <span className={cx('flex-1 text-[15px] font-medium', m.id === 'sair' ? 'text-red-600' : 'text-ink-700')}>{m.label}</span>
                  {m.editable && <Pencil size={17} className="text-brand-cyan2" />}
                </button>
              );
            })}
          </nav>

          <section className={cx('min-w-0', !panel && 'hidden md:block')}>
            <button onClick={() => setPanel(null)} className="mb-4 inline-flex items-center gap-1 text-[15px] font-medium text-ink-500 hover:text-ink-900 md:hidden">
              <ChevronLeft size={18} /> Informações
            </button>
            <PanelView panel={panel ?? 'pessoais'} user={user} />
          </section>
        </div>
      )}
    </>
  );
}

function PanelView({ panel, user }: { panel: Panel; user: AuthUser }) {
  switch (panel) {
    case 'pessoais': return <PersonalPanel user={user} />;
    case 'banco': return user.isProfessional ? <BankPanel user={user} /> : <PersonalPanel user={user} />;
    case 'password': return <PasswordPanel />;
    case 'privacidade': return <PrivacyPanel isPro={user.isProfessional} />;
    case 'telefone': return <PhonePanel user={user} />;
    case 'taxas': return <div><PanelTitle title="Taxas e pagamentos" description="Transparência sobre o que a AUTONOMOUS cobra." /><FeeExplainer audience="both" /></div>;
    case 'profissional': return user.isProfessional ? <PersonalPanel user={user} /> : <BecomeProPanel />;
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
  return async (patch: Partial<ProfileInput>) => {
    const isPro = user.isProfessional;
    try {
      await updateMyProfile({
        name: patch.name ?? user.name,
        phone: 'phone' in patch ? patch.phone : user.phone,
        province: 'province' in patch ? patch.province : user.province,
        bio: 'bio' in patch ? patch.bio : user.bio,
        specialty: isPro ? ('specialty' in patch ? patch.specialty : user.specialty) : null,
        workAreas: isPro ? patch.workAreas ?? user.workAreas : null,
        companyId: isPro ? ('companyId' in patch ? patch.companyId : user.companyId) : null,
        iban: isPro ? ('iban' in patch ? patch.iban : user.iban) : null,
        ibanHolder: isPro ? ('ibanHolder' in patch ? patch.ibanHolder : user.ibanHolder) : null,
        experienceYears: isPro ? ('experienceYears' in patch ? patch.experienceYears : user.experienceYears) : null,
      });
      await refresh();
      success('Alteração guardada');
      return true;
    } catch (e) {
      toastError('Não foi possível guardar', profileErrorMessage(e));
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
        <div className={cx('mt-2 break-words pl-8 text-[15px] leading-relaxed', empty ? 'text-ink-400' : 'text-ink-600')}>
          {empty ? placeholder ?? 'Por preencher' : value}
        </div>
      )}
      {hint && !editing && <p className="mt-1.5 pl-8 text-sm text-ink-400">{hint}</p>}
    </Card>
  );
}

function PersonalPanel({ user }: { user: AuthUser }) {
  const save = useSaveProfile(user);
  const { success, error: toastError } = useToast();
  const { refresh } = useAuth();
  const categories = useCategories();
  const isPro = user.isProfessional;
  const [name, setName] = useState(user.name);
  const [province, setProvince] = useState(user.province ?? '');
  const [specialty, setSpecialty] = useState(user.specialty ?? '');
  const [experience, setExperience] = useState(user.experienceYears != null ? String(user.experienceYears) : '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [areas, setAreas] = useState<string[]>(user.workAreas);
  const [isCompany, setIsCompany] = useState(!!user.companyId);
  const [companyId, setCompanyId] = useState(user.companyId ?? '');
  const [bi, setBi] = useState<File | null>(null);

  return (
    <div>
      <PanelTitle title="Informações pessoais" description="Toque no lápis para editar cada dado." />
      <div className="space-y-3">
        <FieldCard icon={UserRound} label="Nome" value={user.name}
          renderEdit={() => <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />}
          onSave={async () => { if (name.trim().length < 2) { toastError('Indique o seu nome.'); return false; } return save({ name: name.trim() }); }} />
        <FieldCard icon={Mail} label="E-mail" value={user.email || null} placeholder="Conta criada com o número de telefone" editable={false}
          hint={user.email ? 'O email da conta não pode ser alterado.' : undefined} />
        <FieldCard icon={MapPin} label="Província" value={user.province} placeholder="Selecione a província"
          renderEdit={() => <ProvinceSelect value={province} onChange={setProvince} />}
          onSave={() => save({ province: province || null })} />
        {isPro && (
          <>
            <FieldCard icon={Briefcase} label="Especialidade" value={user.specialty} placeholder="Ex.: Reparação de fugas de água"
              renderEdit={() => <TextInput value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ex.: Reparação de fugas de água" autoFocus />}
              onSave={() => save({ specialty: specialty.trim() || null })} />
            <FieldCard icon={Clock} label="Anos de experiência" value={user.experienceYears != null ? `${user.experienceYears} ano${user.experienceYears === 1 ? '' : 's'}` : null}
              renderEdit={() => <TextInput type="number" inputMode="numeric" min={0} max={70} value={experience} onChange={(e) => setExperience(e.target.value)} autoFocus />}
              onSave={async () => {
                const n = Number(experience);
                if (experience === '' || !Number.isInteger(n) || n < 0 || n > 70) { toastError('Indique um número válido.'); return false; }
                return save({ experienceYears: n });
              }} />
            <FieldCard icon={Tags} label="Áreas de atuação" value={user.workAreas.length ? user.workAreas.join(' · ') : null}
              hint="Recebe pedidos apenas destas áreas (máximo 3)."
              renderEdit={() => <AreaPicker options={categories} value={areas} onChange={setAreas} />}
              onSave={async () => { if (!areas.length) { toastError('Escolha pelo menos uma área.'); return false; } return save({ workAreas: areas }); }} />
            <FieldCard icon={Building2} label="Empresa" value={user.companyName ?? 'Trabalho individual'}
              renderEdit={() => <CompanyPicker enabled={isCompany} companyId={companyId} onToggle={setIsCompany} onCompany={(id) => setCompanyId(id)} />}
              onSave={async () => {
                if (isCompany && !companyId) { toastError('Escolha a empresa.'); return false; }
                return save({ companyId: isCompany ? companyId : null });
              }} />
            <FieldCard icon={FileText} label="Bilhete de Identidade" value={user.idDocumentUrl ? <a href={user.idDocumentUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-dark hover:underline">Documento enviado</a> : null}
              placeholder="Ainda não enviou o BI"
              renderEdit={() => <FilePick label="Escolher BI" icon={FileText} accept="image/jpeg,image/png,image/webp,application/pdf" file={bi} onChange={setBi} hint="PDF ou foto legível" />}
              onSave={async () => {
                if (!bi) { toastError('Escolha o ficheiro do BI.'); return false; }
                try { await saveIdDocument(await uploadIdDocument(bi)); await refresh(); success('BI enviado'); return true; }
                catch (e) { toastError('Não foi possível enviar', e instanceof Error ? e.message : undefined); return false; }
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

function BankPanel({ user }: { user: AuthUser }) {
  const save = useSaveProfile(user);
  const { error: toastError } = useToast();
  const [iban, setIban] = useState(user.iban ?? '');
  const [holder, setHolder] = useState(user.ibanHolder ?? user.name);
  return (
    <div>
      <PanelTitle title="Dados bancários" description="A AUTONOMOUS transfere para esta conta o valor dos serviços concluídos (já com a comissão descontada)." />
      <FieldCard icon={Landmark} label="IBAN" value={user.iban ? <span className="font-medium tracking-wide text-ink-900">{formatIban(user.iban)}</span> : null}
        placeholder="Adicione o seu IBAN" hint={user.ibanHolder ? `Titular: ${user.ibanHolder}` : undefined}
        renderEdit={() => (
          <div className="space-y-3">
            <TextInput value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} placeholder="AO06 0000 0000 0000 0000 0000 0" autoFocus />
            <TextInput value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Nome do titular da conta" />
          </div>
        )}
        onSave={async () => {
          if (!isValidIban(iban)) { toastError('IBAN inválido', 'Deve ter 21 dígitos (o prefixo AO06 é opcional).'); return false; }
          if (holder.trim().length < 2) { toastError('Indique o titular da conta.'); return false; }
          return save({ iban, ibanHolder: holder.trim() });
        }} />
    </div>
  );
}

function PhonePanel({ user }: { user: AuthUser }) {
  const save = useSaveProfile(user);
  const { error: toastError } = useToast();
  const [phone, setPhone] = useState(user.phone ?? '');
  return (
    <div>
      <PanelTitle title="Número de telefone" description="Usado para o contacto entre cliente e profissional." />
      <FieldCard icon={Smartphone} label="Telefone / WhatsApp" value={user.phone} placeholder="Adicione o seu número"
        hint={user.email ? 'Só é partilhado com a outra parte depois de um pedido ser aceite.' : 'É também o número com que entra na conta.'}
        renderEdit={() => <PhoneInput value={phone} onChange={setPhone} autoFocus />}
        onSave={async () => {
          if (!phone && !user.isProfessional) return save({ phone: null });
          if (!isValidAoPhone(phone)) { toastError('Número inválido', 'Use 9 dígitos, a começar por 9.'); return false; }
          return save({ phone });
        }} />
      {!user.email && <Notice tone="info" className="mt-3">A sua conta entra com o número com que se registou. Alterar aqui não muda o número de acesso.</Notice>}
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
          <PasswordInput id="pw" value={pw} onChange={(v) => { setPw(v); setError(null); }} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pw2" className="text-[15px] font-medium text-ink-900">Confirmar palavra-passe</label>
          <PasswordInput id="pw2" value={confirm} onChange={(v) => { setConfirm(v); setError(null); }} />
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
        ['O que os clientes veem', 'O seu nome, foto, especialidade, áreas, empresa, portfólio e avaliações.'],
        ['Contactos e morada', 'O seu telefone e a morada do cliente só são partilhados depois de aceitar o pedido.'],
        ['Documentos e IBAN', 'O BI e o IBAN são vistos apenas pela equipa da AUTONOMOUS.'],
      ]
    : [
        ['O que os profissionais veem', 'O seu nome, foto e os detalhes do pedido. A morada completa só é vista pelo profissional que aceitar.'],
        ['Contactos', 'O seu telefone só é partilhado com o profissional que aceitar o seu pedido.'],
        ['Pagamentos', 'Paga depois do serviço, por transferência para a AUTONOMOUS, com comprovativo.'],
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

function BecomeProPanel() {
  const { success } = useToast();
  return (
    <div>
      <PanelTitle title="Tornar-me profissional" description="Use a mesma conta para pedir serviços e para receber pedidos. A nossa equipa verifica o perfil antes de começar." />
      <Card className="p-5 sm:p-6">
        <ProfessionalForm mode="activate" submitLabel="Ativar perfil profissional"
          onDone={() => { success('Perfil profissional criado', 'Vamos verificar os seus dados.'); navigate('/conta'); }} />
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
