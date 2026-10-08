import { lazy, Suspense, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { useRoute, navigate, hashParam } from './router';
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
import { NewRequestPage } from './pages/account/NewRequestPage';
import { RequestStatusPage } from './pages/account/RequestStatusPage';
import { ChatPage } from './pages/account/ChatPage';
import { CallPage } from './pages/account/CallPage';
import { ServicesHub } from './pages/account/ServicesHub';
import { WalletPage } from './pages/account/WalletPage';
import { SettingsPage } from './pages/account/SettingsPage';
import { CatalogPage } from './pages/account/CatalogPage';
import { IncomingCallOverlay } from './components/IncomingCallOverlay';
import { Dock } from './components/Dock';

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

  if (route.name === 'login' || route.name === 'register') {
    if (loading) return <Loading />;
    if (user) { navigate('/conta'); return <Loading />; }
    return route.name === 'login' ? <LoginPage /> : <RegisterPage />;
  }

  if (route.name === 'account') {
    if (loading) return <Loading />;
    if (!user) { navigate('/entrar?next=/conta'); return <Loading />; }
    const section = route.section;

    if (section.startsWith('chamada/')) {
      return <CallPage id={section.slice('chamada/'.length)} />;
    }
    let content;
    if (section === 'pedir') {
      if (user.role === 'professional') { navigate('/conta'); content = <Loading />; }
      else content = <NewRequestPage />;
    } else if (section.startsWith('pedido/')) {
      content = <RequestStatusPage id={section.slice('pedido/'.length)} />;
    } else if (section.startsWith('chat/')) {
      content = <ChatPage id={section.slice('chat/'.length)} />;
    } else if (section === 'servicos') {
      content = <ServicesHub />;
    } else if (section === 'financas') {
      content = <WalletPage />;
    } else if (section === 'definicoes') {
      content = <SettingsPage />;
    } else if (section === 'catalogo') {
      content = <CatalogPage />;
    } else {
      content = <AccountPage />;
    }
    const isChat = section.startsWith('chat/');
    return (
      <div className="min-h-screen bg-white">
        <IncomingCallOverlay />
        <Navbar />
        <main className="overflow-x-clip">{content}</main>
        {!isChat && <Dock />}
      </div>
    );
  }

  if (user && route.name !== 'services') {
    if (route.name === 'request') {
      const cat = hashParam('categoria');
      navigate('/conta/pedir' + (cat ? `?categoria=${encodeURIComponent(cat)}` : ''));
    } else {
      navigate('/conta');
    }
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-white">
      <IncomingCallOverlay />
      <Navbar />
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
