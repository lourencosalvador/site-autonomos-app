import { lazy, Suspense, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { useRoute } from './router';
import { useScrollReveal, refreshReveal } from './hooks/useScrollReveal';
import { track } from './lib/analytics';
import { HomePage } from './pages/HomePage';
import { ServicesPage } from './pages/ServicesPage';
import { RequestPage } from './pages/RequestPage';
import { BecomeProPage } from './pages/BecomeProPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';

// O painel só é descarregado por quem abre #/admin — não pesa no site público.
const AdminApp = lazy(() => import('./admin/AdminApp'));

function App() {
  const route = useRoute();
  useScrollReveal();

  // Re-scan for new .reveal elements after each route change
  useEffect(() => {
    refreshReveal();
  }, [route.name]);

  useEffect(() => {
    if (route.name !== 'admin') track('page_view');
  }, [route]);

  if (route.name === 'admin') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-black" />}>
        <AdminApp section={route.section} />
      </Suspense>
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
