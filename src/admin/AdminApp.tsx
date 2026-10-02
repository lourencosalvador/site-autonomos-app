import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LoginScreen } from './components/LoginScreen';
import { Shell, type SectionId } from './components/Shell';
import { getSession, logout, onSessionExpired, rpc, useAdminQuery } from './lib/api';
import type { AdminSession } from './lib/session';
import type { Overview } from './lib/types';
import { OverviewPage } from './pages/OverviewPage';
import { ActivityPage } from './pages/ActivityPage';
import { RequestsPage } from './pages/RequestsPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { UsersPage } from './pages/UsersPage';
import { ServicesAdminPage } from './pages/ServicesAdminPage';
import { SettingsPage } from './pages/SettingsPage';

const SECTIONS: SectionId[] = ['', 'atividade', 'pedidos', 'candidaturas', 'utilizadores', 'servicos', 'definicoes'];

export default function AdminApp({ section }: { section: string }) {
  const [session, setSession] = useState<AdminSession | null>(getSession);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const previous = document.title;
    document.title = 'Painel · AUTONOMOUS';
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => onSessionExpired(() => setSession(null)), []);

  // Confirma no servidor que o token guardado ainda é válido.
  useEffect(() => {
    if (!session || verified) return;
    rpc('admin_session').then(
      () => setVerified(true),
      () => setSession(null),
    );
  }, [session, verified]);

  const handleLogout = useCallback(() => {
    void logout();
    setSession(null);
    setVerified(false);
  }, []);

  if (!session) {
    return (
      <LoginScreen
        onSuccess={(s) => {
          setSession(s);
          setVerified(true);
        }}
      />
    );
  }

  if (!verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="size-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  const current = (SECTIONS.includes(section as SectionId) ? section : '') as SectionId;
  return <Dashboard section={current} session={session} onLogout={handleLogout} />;
}

function Dashboard({ section, session, onLogout }: { section: SectionId; session: AdminSession; onLogout: () => void }) {
  // Contadores da barra lateral (pedidos por tratar, candidaturas pendentes).
  const counts = useAdminQuery(() => rpc<Overview>('admin_overview', { p_days: 7 }), [], 60_000);

  return (
    <Shell
      section={section}
      session={session}
      onLogout={onLogout}
      counts={{ requests: counts.data?.site_requests.open, applications: counts.data?.applications?.pending }}
    >
      {section === '' && <OverviewPage />}
      {section === 'atividade' && <ActivityPage />}
      {section === 'pedidos' && <RequestsPage onChange={counts.reload} />}
      {section === 'candidaturas' && <ApplicationsPage onChange={counts.reload} />}
      {section === 'utilizadores' && <UsersPage />}
      {section === 'servicos' && <ServicesAdminPage />}
      {section === 'definicoes' && <SettingsPage session={session} onLogout={onLogout} />}
    </Shell>
  );
}
