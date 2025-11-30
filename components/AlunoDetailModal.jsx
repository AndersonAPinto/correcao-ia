'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function AlunoDetailModal({ open, onOpenChange, alunoId }) {
  const [alunoData, setAlunoData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && alunoId) {
      loadAlunoData();
    }
  }, [open, alunoId]);

  const loadAlunoData = async () => {
    if (!alunoId) return;
    
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`/api/analytics/aluno/${alunoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAlunoData(data);
      }
    } catch (error) {
      console.error('Failed to load aluno data:', error);
    }
    
    setLoading(false);
  };

  if (!alunoData && !loading) return null;

  const diferencaMedia = alunoData 
    ? alunoData.mediaAluno - alunoData.mediaTurma 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Aluno</DialogTitle>
          <DialogDescription>
            {alunoData?.aluno.nome} - {alunoData?.aluno.turmaNome}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando dados...</p>
          </div>
        ) : alunoData ? (
          <div className="space-y-6">
            {/* Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Média do Aluno</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{alunoData.mediaAluno.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">de 10.0 pontos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Média da Turma</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{alunoData.mediaTurma.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">de 10.0 pontos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    Comparação
                    {diferencaMedia > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : diferencaMedia < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ) : null}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${
                    diferencaMedia > 0 ? 'text-green-600' : 
                    diferencaMedia < 0 ? 'text-red-600' : 
                    'text-gray-600'
                  }`}>
                    {diferencaMedia > 0 ? '+' : ''}{diferencaMedia.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {diferencaMedia > 0 ? 'Acima da média' : 
                     diferencaMedia < 0 ? 'Abaixo da média' : 
                     'Na média'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Evolução das Notas */}
            {alunoData.evolucao && alunoData.evolucao.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Evolução das Notas</CardTitle>
                  <CardDescription>
                    Últimas {alunoData.evolucao.length} avaliações
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={alunoData.evolucao.map((e, idx) => ({
                      ...e,
                      avaliacao: `Avaliação ${idx + 1}`,
                      dataFormatada: e.data ? format(new Date(e.data), 'dd/MM') : ''
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="avaliacao" 
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis domain={[0, 10]} />
                      <Tooltip 
                        formatter={(value) => [`${value.toFixed(2)}/10`, 'Nota']}
                        labelFormatter={(label) => label}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="nota" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Nota"
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey={() => alunoData.mediaTurma} 
                        stroke="#94a3b8" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        name="Média da Turma"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Áreas de Reforço */}
            {alunoData.areasReforco && alunoData.areasReforco.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Áreas que Precisam de Reforço
                  </CardTitle>
                  <CardDescription>
                    Habilidades com mais erros nas avaliações
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {alunoData.areasReforco.slice(0, 5).map((area, idx) => (
                      <div 
                        key={area.id} 
                        className="flex items-center justify-between p-3 border rounded-lg bg-orange-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-sm font-bold">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold">{area.nome}</p>
                            <p className="text-xs text-gray-600">
                              Errou {area.vezesErrou} vez(es)
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-white">
                          {area.vezesErrou}x
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Histórico de Avaliações */}
            {alunoData.avaliacoes && alunoData.avaliacoes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Avaliações</CardTitle>
                  <CardDescription>
                    {alunoData.totalAvaliacoes} avaliação(ões) validada(s)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {alunoData.avaliacoes.map((av) => (
                      <div 
                        key={av.id} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-semibold">Período: {av.periodo}</p>
                          <p className="text-xs text-gray-500">
                            {av.validadoAt ? format(new Date(av.validadoAt), 'dd/MM/yyyy HH:mm') : 'N/A'}
                          </p>
                        </div>
                        <Badge 
                          className={
                            av.nota >= 8 ? 'bg-green-600' :
                            av.nota >= 6 ? 'bg-blue-600' :
                            av.nota >= 4 ? 'bg-yellow-600' :
                            'bg-red-600'
                          }
                        >
                          {av.nota.toFixed(2)}/10
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {alunoData.totalAvaliacoes === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Nenhuma avaliação validada ainda para este aluno
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

