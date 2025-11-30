'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Coins, LogOut, Chrome } from 'lucide-react';

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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('painel');
  const [pendingCount, setPendingCount] = useState(0);

  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });

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
      // Limpar URL
      window.history.replaceState({}, document.title, window.location.pathname);
      checkAuth();
      return;
    }

    if (token && provider === 'google') {
      // Limpar URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Salvar token
      localStorage.setItem('token', token);
      
      // Verificar autenticação
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
      const response = await fetch('/api/auth/me', {
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
        setCredits(data.saldoAtual);
      }

      await loadPendingCount();
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadPendingCount = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/avaliacoes/pendentes', {
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

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        setIsAuthenticated(true);
        toast.success(authMode === 'login' ? 'Login realizado!' : 'Conta criada!');
      } else {
        toast.error(data.error || 'Falha na autenticação');
      }
    } catch (error) {
      toast.error('Ocorreu um erro');
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold">Corretor 80/20</CardTitle>
            <CardDescription>Plataforma de Correção com IA</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authMode} onValueChange={setAuthMode}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Registrar</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">Entrar</Button>
                </form>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-950 px-2 text-muted-foreground">Ou</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const currentPath = window.location.pathname;
                    window.location.href = `/api/auth/google?redirect=${encodeURIComponent(currentPath)}`;
                  }}
                >
                  <Chrome className="h-4 w-4 mr-2" />
                  Continuar com Google
                </Button>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      placeholder="Seu nome"
                      value={authForm.name}
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Senha</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">Criar Conta</Button>
                </form>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-950 px-2 text-muted-foreground">Ou</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const currentPath = window.location.pathname;
                    window.location.href = `/api/auth/google?redirect=${encodeURIComponent(currentPath)}`;
                  }}
                >
                  <Chrome className="h-4 w-4 mr-2" />
                  Continuar com Google
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
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
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
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
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Coins className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-blue-900 dark:text-blue-300">{credits} créditos</span>
              </div>
              <NotificationBell />
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4">
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
