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
    { name: 'Correção Ilimitada', free: false, premium: true },
    { name: 'Dashboard de Analytics', free: true, premium: true },
    { name: 'Relatórios de Habilidades', free: true, premium: true },
    { name: 'Assistente de Correção Discursiva', free: false, premium: true },
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
                  <p className="font-semibold">Plano {planoStatus.plano === 'free' ? 'Gratuito' : 'Premium'}</p>
                  {planoStatus.plano === 'free' && (
                    <p className="text-sm text-gray-600">
                      {planoStatus.usado} de {planoStatus.limites.provasPorMes} provas usadas este mês
                    </p>
                  )}
                </div>
                {planoStatus.plano === 'free' && (
                  <Badge variant="outline" className="bg-white">
                    {planoStatus.restante} restantes
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
                <CardTitle>Gratuito</CardTitle>
                <CardDescription>Ideal para testar a plataforma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-bold">R$ 0</p>
                  <p className="text-sm text-gray-500">por mês</p>
                </div>
                <ul className="space-y-2">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      {feature.free ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                      <span className={feature.free ? '' : 'text-gray-400'}>{feature.name}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Até {planoStatus.limites.provasPorMes} provas por mês</span>
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
            <p className="font-semibold mb-1">💡 Por que fazer upgrade?</p>
            <p>
              Com o plano Premium, você tem acesso ilimitado a todas as funcionalidades, 
              incluindo correção ilimitada de provas, assistente avançado de correção discursiva 
              e suporte prioritário. Ideal para professores que precisam corrigir muitas provas.
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

