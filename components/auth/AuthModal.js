'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Chrome, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthModal({ isOpen, onClose, defaultTab = 'login', onAuthSuccess }) {
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
    const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const endpoint = activeTab === 'login' ? '/api/auth/login' : '/api/auth/register';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(activeTab === 'login' ? '👋 Bem-vindo de volta! Login realizado.' : '🎉 Conta criada com sucesso! Bem-vindo ao CorregIA.');
                onAuthSuccess(data);
                onClose();
            } else {
                toast.error(data.error || 'Erro na autenticação. Verifique seus dados.');
            }
        } catch (error) {
            toast.error('🌐 Erro de conexão. Verifique sua internet e tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        const currentPath = window.location.pathname;
        window.location.href = `/api/auth/google?redirect=${encodeURIComponent(currentPath)}`;
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setForgotPasswordLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotPasswordEmail })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('📧 Se o e-mail estiver cadastrado, você receberá um link de recuperação em instantes.');
                setShowForgotPassword(false);
                setForgotPasswordEmail('');
            } else {
                toast.error(data.error || 'Ocorreu um erro ao processar a recuperação de senha.');
            }
        } catch (error) {
            toast.error('🌐 Erro de conexão ao solicitar recuperação.');
        } finally {
            setForgotPasswordLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden gap-0">
                <div className="p-6 pb-0">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-2xl text-center">
                            {activeTab === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            {activeTab === 'login'
                                ? 'Entre para acessar suas correções'
                                : 'Comece a corrigir provas com IA hoje mesmo'}
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="login">Login</TabsTrigger>
                            <TabsTrigger value="register">Registrar</TabsTrigger>
                        </TabsList>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {activeTab === 'register' && (
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome Completo</Label>
                                    <Input
                                        id="name"
                                        placeholder="Seu nome"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Senha</Label>
                                    {activeTab === 'login' && (
                                        <button
                                            type="button"
                                            onClick={() => setShowForgotPassword(true)}
                                            className="text-sm text-blue-600 hover:underline"
                                        >
                                            Esqueci minha senha
                                        </button>
                                    )}
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>

                            <Button type="submit" className="w-full h-11" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    activeTab === 'login' ? 'Entrar' : 'Criar Conta'
                                )}
                            </Button>
                        </form>
                    </Tabs>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 mt-6 border-t">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-gray-50 dark:bg-gray-900 px-2 text-muted-foreground">Ou continue com</span>
                        </div>
                    </div>

                    <Button variant="outline" className="w-full bg-white dark:bg-gray-800" onClick={handleGoogleLogin}>
                        <Chrome className="mr-2 h-4 w-4" />
                        Google
                    </Button>
                </div>
            </DialogContent>

            {/* Dialog de Esqueci minha senha */}
            <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Recuperar Senha</DialogTitle>
                        <DialogDescription>
                            Digite seu email e enviaremos um link para redefinir sua senha
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="forgot-email">Email</Label>
                            <Input
                                id="forgot-email"
                                type="email"
                                placeholder="seu@email.com"
                                value={forgotPasswordEmail}
                                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={forgotPasswordLoading}>
                            {forgotPasswordLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                'Enviar Link de Recuperação'
                            )}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
