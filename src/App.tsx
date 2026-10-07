import { lazy, Suspense, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { useRoute, navigate } from './router';
import { useScrollReveal, refreshReveal } from './hooks/useScrollReveal';
import { track } from './lib/analytics';
import { useAuth } from './auth/AuthContext';
import { HomePage } from './pages/HomePage';
import { ServicesPage } from './pages/ServicesPage';
import { RequestPage } from './pages/RequestPage';
import { BecomeProPage } from './pages/BecomeProPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { AccountPage } from './pages/account/AccountPage';

// O painel só é descarregado por quem abre #/admin — não pesa no site público.
const AdminApp = lazy(() => import('./admin/AdminApp'));

function Loading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-white">
      <Loader2 className="size-6 animate-spin text-ink-300" />
    </div>
  );
}

function App() {
  const route = useRoute();
  const { user, loading } = useAuth();
  useScrollReveal();

  // Re-scan for new .reveal elements after each route change
  useEffect(() => {
    refreshReveal();
  }, [route.name]);

  useEffect(() => {
    if (route.name !== 'admin' && route.name !== 'account') track('page_view');
  }, [route]);

  if (route.name === 'admin') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-black" />}>
        <AdminApp section={route.section} />
      </Suspense>
    );
  }

  // Páginas de autenticação — ecrã inteiro, sem navbar/rodapé.
  if (route.name === 'login' || route.name === 'register') {
    if (loading) return <Loading />;
    if (user) { navigate('/conta'); return <Loading />; }
    return route.name === 'login' ? <LoginPage /> : <RegisterPage />;
  }

  // Área autenticada.
  if (route.name === 'account') {
    if (loading) return <Loading />;
    if (!user) { navigate('/entrar?next=/conta'); return <Loading />; }
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="overflow-x-clip"><AccountPage /></main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {/* clip: as animações de entrada (reveal-left/right) começam fora do ecrã e não devem alargar a página no telemóvel */}
      <main className="overflow-x-clip">
        {route.name === 'home' && <HomePage />}
        {route.name === 'services' && <ServicesPage />}
        {route.name === 'request' && <RequestPage />}
        {route.name === 'become-pro' && <BecomeProPage />}
        {route.name === 'about' && <AboutPage />}
        {route.name === 'contact' && <ContactPage />}
      </main>
      <Footer />
    </div>
  );
}

export default App;
