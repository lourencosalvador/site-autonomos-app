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
import { PaymentsPage } from './pages/PaymentsPage';
import { TestPage } from './pages/TestPage';
import { SupportPage } from './pages/SupportPage';
import { AppRequestsPage } from './pages/AppRequestsPage';
import { ProfessionalsPage } from './pages/ProfessionalsPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { SaquesPage } from './pages/SaquesPage';

const SECTIONS: SectionId[] = ['', 'atividade', 'pagamentos', 'apoio', 'pedidos-app', 'saques', 'prestadores', 'empresas', 'pedidos', 'candidaturas', 'utilizadores', 'servicos', 'teste', 'definicoes'];

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
  // Saques por pagar (a migração de pagamentos pode ainda não estar aplicada: nesse caso fica sem número).
  const payCounts = useAdminQuery(
    () => rpc<{ withdrawals_pending: number; charges_pending: number }>('admin_payment_counts').catch(() => null),
    [],
    60_000,
  );
  const supportCount = useAdminQuery(() => rpc<number>('admin_support_count').catch(() => 0), [], 30_000);
  const appCount = useAdminQuery(() => rpc<number>('admin_app_requests_count').catch(() => 0), [], 30_000);
  const saquesCount = useAdminQuery(() => rpc<number>('admin_broadcast_withdrawals_count').catch(() => 0), [], 30_000);
  const proCount = useAdminQuery(() => rpc<number>('admin_professionals_pending').catch(() => 0), [], 60_000);

  return (
    <Shell
      section={section}
      session={session}
      onLogout={onLogout}
      counts={{
        requests: counts.data?.site_requests.open,
        applications: counts.data?.applications?.pending,
        payments: payCounts.data?.withdrawals_pending,
        support: supportCount.data ?? undefined,
        appRequests: appCount.data ?? undefined,
        saques: saquesCount.data ?? undefined,
        professionals: proCount.data ?? undefined,
      }}
    >
      {section === '' && <OverviewPage />}
      {section === 'atividade' && <ActivityPage />}
      {section === 'pagamentos' && <PaymentsPage onChange={payCounts.reload} />}
      {section === 'apoio' && <SupportPage onChange={supportCount.reload} />}
      {section === 'pedidos-app' && <AppRequestsPage onChange={appCount.reload} />}
      {section === 'saques' && <SaquesPage onChange={saquesCount.reload} />}
      {section === 'prestadores' && <ProfessionalsPage onChange={proCount.reload} />}
      {section === 'empresas' && <CompaniesPage />}
      {section === 'pedidos' && <RequestsPage onChange={counts.reload} />}
      {section === 'candidaturas' && <ApplicationsPage onChange={counts.reload} />}
      {section === 'utilizadores' && <UsersPage />}
      {section === 'servicos' && <ServicesAdminPage />}
      {section === 'teste' && <TestPage />}
      {section === 'definicoes' && <SettingsPage session={session} onLogout={onLogout} />}
    </Shell>
  );
}
