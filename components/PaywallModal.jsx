'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Crown } from 'lucide-react';

export default function PaywallModal({ open, onOpenChange, planoStatus }) {
  if (!planoStatus) return null;

  const features = [
    { name: 'Correção Ilimitada', free: true, premium: true },
    { name: 'Dashboard de Analytics', free: true, premium: true },
    { name: 'Relatórios de Habilidades', free: true, premium: true },
    { name: 'Assistente de Correção Discursiva', free: true, premium: true },
    { name: 'Exportação CSV/Excel', free: true, premium: true },
    { name: 'Upload em Lote', free: true, premium: true },
    { name: 'Suporte Prioritário', free: false, premium: true }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-yellow-600" />
            Upgrade para Premium
          </DialogTitle>
          <DialogDescription>
            Desbloqueie todas as funcionalidades e correção ilimitada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status atual */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-sm">Status Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Plano {planoStatus.plano === 'premium' ? 'Premium' : 'Gratuito (Trial)'}</p>
                  {!planoStatus.isSubscriber && (
                    <p className="text-sm text-gray-600">
                      {planoStatus.trialRemainingDays} dias restantes de acesso gratuito
                    </p>
                  )}
                </div>
                {!planoStatus.isSubscriber && (
                  <Badge variant="outline" className="bg-white">
                    {planoStatus.trialRemainingDays} dias
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Comparação de planos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Plano Gratuito */}
            <Card>
              <CardHeader>
                <CardTitle>Gratuito (Trial)</CardTitle>
                <CardDescription>Ideal para testar a plataforma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-bold">R$ 0</p>
                  <p className="text-sm text-gray-500">por 7 dias</p>
                </div>
                <ul className="space-y-2">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{feature.name}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-blue-600">Acesso total por 7 dias</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Plano Premium */}
            <Card className="border-2 border-yellow-400 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-yellow-500 text-white">Recomendado</Badge>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  Premium
                </CardTitle>
                <CardDescription>Para uso profissional</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-bold">R$ 49,90</p>
                  <p className="text-sm text-gray-500">por mês</p>
                </div>
                <ul className="space-y-2">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{feature.name}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="font-semibold">Correção ilimitada</span>
                  </li>
                </ul>
                <Button className="w-full bg-yellow-600 hover:bg-yellow-700">
                  Fazer Upgrade
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Nota sobre upgrade */}
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
            <p className="font-semibold mb-1">💡 Por que assinar o Premium?</p>
            <p>
              Ao final dos 7 dias de teste, você precisará de uma assinatura ativa para continuar corrigindo provas. 
              Com o plano Premium, você garante acesso contínuo e ilimitado a todas as funcionalidades, 
              além de suporte prioritário para tirar suas dúvidas.
            </p>
          </div>

          {/* Botão de fechar */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

