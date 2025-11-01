'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Settings, User, CreditCard, Key, Webhook, Palette } from 'lucide-react';

export default function ConfiguracoesSection({ user, credits }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    geminiApiKey: '',
    n8nWebhookUrl: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({ ...prev, name: user.name }));
    }
    if (user?.isAdmin) {
      loadAdminSettings();
    }
  }, [user]);

  const loadAdminSettings = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          geminiApiKey: data.geminiApiKey || '',
          n8nWebhookUrl: data.n8nWebhookUrl || ''
        }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Configurações salvas com sucesso!');
      } else {
        toast.error('Erro ao salvar configurações');
      }
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
    setSaving(false);
  };

  const isAdmin = user?.isAdmin === 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Configurações</h2>
        <p className="text-gray-600">Gerencie seu perfil e preferências</p>
      </div>

      {/* Theme Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Aparência
          </CardTitle>
          <CardDescription>
            Personalize o tema da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Tema</Label>
            {mounted && (
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Escolha entre tema claro, escuro ou automático (segue o sistema)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil
          </CardTitle>
          <CardDescription>
            Informações básicas da sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Nome</Label>
              <p className="font-semibold">{user?.name}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Email</Label>
              <p className="font-semibold">{user?.email}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Tipo de Conta</Label>
              <div>
                {isAdmin ? (
                  <Badge className="bg-purple-600">Administrador</Badge>
                ) : (
                  <Badge variant="secondary">Usuário</Badge>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Assinatura Atual</Label>
              <Badge variant="outline" className="capitalize">
                {user?.assinatura || 'Free'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credits Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Créditos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Saldo Atual</p>
              <p className="text-3xl font-bold text-blue-600">{credits} créditos</p>
            </div>
            <Button variant="outline">
              Adicionar Créditos
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Cada correção custa 3 créditos. Adicione mais créditos para continuar usando a plataforma.
          </p>
        </CardContent>
      </Card>

      {/* Upgrade Card (for non-admin) */}
      {!isAdmin && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle>Upgrade de Plano</CardTitle>
            <CardDescription>
              Desbloqueie recursos premium e obtenha mais créditos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              Fazer Upgrade para Pro
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Admin Settings */}
      {isAdmin && (
        <>
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <Settings className="h-5 w-5" />
                Configurações de Administrador
              </CardTitle>
              <CardDescription>
                Configure integrações e APIs (visível apenas para administradores)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gemini-key" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Gemini API Key
                  </Label>
                  <Input
                    id="gemini-key"
                    type="password"
                    placeholder="Digite sua Gemini API key"
                    value={formData.geminiApiKey}
                    onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">
                    Obtenha em: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="n8n-webhook" className="flex items-center gap-2">
                    <Webhook className="h-4 w-4" />
                    N8N Webhook URL
                  </Label>
                  <Input
                    id="n8n-webhook"
                    type="url"
                    placeholder="https://your-n8n-instance.com/webhook/..."
                    value={formData.n8nWebhookUrl}
                    onChange={(e) => setFormData({ ...formData, n8nWebhookUrl: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">
                    URL do webhook do N8N para processar correções
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Add Admin Card */}
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-700">Gerenciar Administradores</CardTitle>
              <CardDescription>
                Adicionar outros usuários como administradores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Para adicionar um admin, entre em contato com o suporte ou use a API diretamente.
              </p>
              <Button variant="outline" disabled>
                Adicionar Administrador
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Security Card */}
      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full">
            Alterar Senha
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
