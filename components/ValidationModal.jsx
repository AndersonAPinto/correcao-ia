'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';

export default function ValidationModal({ open, onOpenChange, avaliacao, onValidated, isPending }) {
  const [validating, setValidating] = useState(false);

  const handleValidate = async () => {
    setValidating(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`/api/avaliacoes/${avaliacao.id}/validar`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Avaliação validada com sucesso!');
        onValidated();
      } else {
        toast.error('Erro ao validar avaliação');
      }
    } catch (error) {
      toast.error('Erro ao validar avaliação');
    }
    setValidating(false);
  };

  if (!avaliacao) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Correção da Avaliação</DialogTitle>
          <DialogDescription>
            {avaliacao.alunoNome} - {avaliacao.turmaNome} - {avaliacao.periodo}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 overflow-hidden">
          {/* Left: Image */}
          <Card className="flex flex-col h-[600px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Prova do Aluno
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <ScrollArea className="h-full w-full rounded border">
                <img 
                  src={avaliacao.imageUrl} 
                  alt="Prova do aluno"
                  className="w-full h-auto"
                />
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right: Correction */}
          <Card className="flex flex-col h-[600px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Correção da IA</span>
                <Badge className="bg-blue-600">{avaliacao.nota}/10</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1">
                <div className="space-y-4 pr-4">
                  {/* Feedback Geral */}
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Feedback Geral</h4>
                    <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded">
                      {avaliacao.feedback || 'Sem feedback geral'}
                    </p>
                  </div>

                  {/* Exercícios */}
                  {avaliacao.exercicios && avaliacao.exercicios.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Feedback por Exercício</h4>
                      <div className="space-y-3">
                        {avaliacao.exercicios.map((ex, idx) => (
                          <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-sm">
                                Exercício {ex.numero || idx + 1}
                              </span>
                              <Badge variant="outline">
                                {ex.nota || 0}/{ex.nota_maxima || 10}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700">
                              {ex.feedback || 'Sem feedback'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* OCR Text */}
                  {avaliacao.textoOcr && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900">
                        Ver texto transcrito (OCR)
                      </summary>
                      <div className="mt-2 p-3 bg-gray-100 rounded text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {avaliacao.textoOcr}
                      </div>
                    </details>
                  )}
                </div>
              </ScrollArea>

              {/* Validate Button */}
              {isPending && (
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    onClick={handleValidate} 
                    className="w-full gap-2"
                    disabled={validating}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {validating ? 'Validando...' : 'Validar Avaliação'}
                  </Button>
                  <p className="text-xs text-center text-gray-500 mt-2">
                    Ao validar, esta avaliação será movida para "Concluídas"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
