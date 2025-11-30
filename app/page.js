'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Coins, LogOut } from 'lucide-react';

import AppSidebar from '@/components/Sidebar';
import NotificationBell from '@/components/NotificationBell';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import PainelSection from '@/components/sections/PainelSection';
import AnalyticsSection from '@/components/sections/AnalyticsSection';
import GabaritosSection from '@/components/sections/GabaritosSection';
import HabilidadesSection from '@/components/sections/HabilidadesSection';
import PerfisSection from '@/components/sections/PerfisSection';
import ResultadosSection from '@/components/sections/ResultadosSection';
import ConfiguracoesSection from '@/components/sections/ConfiguracoesSection';
import CorretorIASection from '@/components/sections/CorretorIA';

// Landing Page Components
import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Pricing from '@/components/landing/Pricing';
import Footer from '@/components/landing/Footer';
import AuthModal from '@/components/auth/AuthModal';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('painel');
  const [pendingCount, setPendingCount] = useState(0);

  // Auth State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login');

  useEffect(() => {
    // Processar token do callback OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const provider = urlParams.get('provider');
    const error = urlParams.get('error');

    if (error) {
      const errorMessages = {
        'oauth_cancelled': 'Login cancelado',
        'email_not_verified': 'Email não verificado. Verifique seu email no Google.',
        'oauth_failed': 'Erro ao autenticar com Google. Tente novamente.',
        'account_exists_email': 'Conta já existe com email/senha. Use login tradicional.',
        'invalid_token': 'Token inválido',
        'token_expired': 'Token expirado',
        'audience_mismatch': 'Erro de segurança no token',
        'invalid_state': 'Estado inválido. Tente novamente.',
        'state_expired': 'Sessão expirada. Tente novamente.',
        'no_id_token': 'Erro ao obter token de autenticação'
      };
      toast.error(errorMessages[error] || 'Erro na autenticação');
      window.history.replaceState({}, document.title, window.location.pathname);
      checkAuth();
      return;
    }

    if (token && provider === 'google') {
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.setItem('token', token);
      checkAuth();
      toast.success('Login com Google realizado com sucesso!');
    } else {
      checkAuth();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      const interval = setInterval(loadPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
    }
    setLoading(false);
  };

  const loadData = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const creditsRes = await fetch('/api/credits', { headers });
      if (creditsRes.ok) {
        const data = await creditsRes.json();
        setCredits(data.saldo);
      }

      await loadPendingCount();
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadPendingCount = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/avaliacoes?status=pendente', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.avaliacoes?.length || 0);
      }
    } catch (error) {
      console.error('Failed to load pending count:', error);
    }
  };

  const handleAuthSuccess = (data) => {
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    setCredits(0);
    toast.success('Logout realizado');
  };

  const handleUploadSuccess = () => {
    loadData();
    setActiveView('pendentes');
  };

  const openAuth = (tab = 'login') => {
    setAuthTab(tab);
    setShowAuthModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground selection:bg-blue-100 selection:text-blue-900">
        <Header onLoginClick={openAuth} />
        <main>
          <Hero onCtaClick={() => openAuth('register')} />
          <Features />
          <Pricing onRegisterClick={() => openAuth('register')} />
        </main>
        <Footer />

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultTab={authTab}
          onAuthSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar
        activeView={activeView}
        setActiveView={setActiveView}
        pendingCount={pendingCount}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">
                Olá, {user?.name}
              </h1>
              <p className="text-xs text-muted-foreground">
                {user?.isAdmin === 1 ? 'Administrador' : 'Bem-vindo à plataforma'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <Coins className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-blue-900 dark:text-blue-300">{credits} créditos</span>
              </div>
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="min-h-[calc(100vh-4rem)] flex-1 rounded-xl bg-muted/30 p-4 mt-4">
            {activeView === 'painel' && (
              <PainelSection
                onUploadSuccess={handleUploadSuccess}
                setActiveView={setActiveView}
              />
            )}
            {activeView === 'analytics' && <AnalyticsSection />}
            {activeView === 'corretor-ia' && <CorretorIASection />}
            {activeView === 'gabaritos' && <GabaritosSection />}
            {activeView === 'habilidades' && <HabilidadesSection />}
            {activeView === 'perfis' && <PerfisSection />}
            {(activeView === 'pendentes' || activeView === 'concluidas') && (
              <ResultadosSection view={activeView} />
            )}
            {activeView === 'configuracoes' && (
              <ConfiguracoesSection user={user} credits={credits} />
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
