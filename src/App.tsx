import { useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { useRoute } from './router';
import { useScrollReveal, refreshReveal } from './hooks/useScrollReveal';
import { HomePage } from './pages/HomePage';
import { ServicesPage } from './pages/ServicesPage';
import { RequestPage } from './pages/RequestPage';
import { BecomeProPage } from './pages/BecomeProPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';

function App() {
  const route = useRoute();
  useScrollReveal();

  // Re-scan for new .reveal elements after each route change
  useEffect(() => {
    refreshReveal();
  }, [route.name]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
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
