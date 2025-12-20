'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Award, Target } from 'lucide-react';
import AlunoDetailModal from '@/components/AlunoDetailModal';

export default function AnalyticsSection() {
  const [turmas, setTurmas] = useState([]);
  const [selectedTurma, setSelectedTurma] = useState('');
  const [turmaMetrics, setTurmaMetrics] = useState(null);
  const [habilidadesReport, setHabilidadesReport] = useState([]);
  const [habilidadesEvolucao, setHabilidadesEvolucao] = useState([]);
  const [habilidadesCorrelacao, setHabilidadesCorrelacao] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlunoId, setSelectedAlunoId] = useState(null);
  const [alunoModalOpen, setAlunoModalOpen] = useState(false);

  useEffect(() => {
    loadTurmas();
  }, []);

  useEffect(() => {
    if (selectedTurma) {
      loadAnalytics();
    } else {
      setTurmaMetrics(null);
      setHabilidadesReport([]);
    }
  }, [selectedTurma]);

  const loadTurmas = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/turmas', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTurmas(data.turmas || []);
      }
    } catch (error) {
      console.error('Failed to load turmas:', error);
    }
  };

  const loadAnalytics = async () => {
    if (!selectedTurma) return;

    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      const [metricsRes, habilidadesRes, evolucaoRes, correlacaoRes] = await Promise.all([
        fetch(`/api/analytics/turma/${selectedTurma}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/analytics/habilidades/${selectedTurma}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/analytics/habilidades/${selectedTurma}/evolucao`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/analytics/habilidades/${selectedTurma}/correlacao`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setTurmaMetrics(data);
      }

      if (habilidadesRes.ok) {
        const data = await habilidadesRes.json();
        setHabilidadesReport(data.habilidades || []);
      }

      if (evolucaoRes.ok) {
        const data = await evolucaoRes.json();
        setHabilidadesEvolucao(data.habilidades || []);
      }

      if (correlacaoRes.ok) {
        const data = await correlacaoRes.json();
        setHabilidadesCorrelacao(data.correlacoes || []);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Dashboard de Analytics</h2>
        <p className="text-gray-600">Visualize métricas e insights sobre o desempenho da turma</p>
      </div>

      {/* Seleção de Turma */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Turma</CardTitle>
          <CardDescription>
            Escolha uma turma para visualizar as métricas e análises
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Turma</Label>
            <Select value={selectedTurma || ''} onValueChange={setSelectedTurma}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma turma" />
              </SelectTrigger>
              <SelectContent>
                {turmas.map((turma) => (
                  <SelectItem key={turma.id} value={turma.id}>
                    {turma.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selectedTurma && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Selecione uma turma para visualizar as métricas
          </CardContent>
        </Card>
      )}

      {selectedTurma && loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando métricas...</p>
          </CardContent>
        </Card>
      )}

      {selectedTurma && !loading && turmaMetrics && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="habilidades">Habilidades</TabsTrigger>
            <TabsTrigger value="evolucao">Evolução Temporal</TabsTrigger>
            <TabsTrigger value="correlacao">Correlações</TabsTrigger>
            <TabsTrigger value="alunos">Alunos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Métricas de Alto Nível */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Média da Turma</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{turmaMetrics.mediaTurma.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">de 10.0 pontos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{turmaMetrics.taxaAprovacao.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    {turmaMetrics.totalAvaliacoes > 0
                      ? `${Math.round((turmaMetrics.taxaAprovacao / 100) * turmaMetrics.totalAvaliacoes)} de ${turmaMetrics.totalAvaliacoes} avaliações`
                      : 'Sem avaliações'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{turmaMetrics.totalAvaliacoes}</div>
                  <p className="text-xs text-muted-foreground">Avaliações validadas</p>
                </CardContent>
              </Card>
            </div>

            {/* Distribuição de Notas */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Notas</CardTitle>
                <CardDescription>
                  Quantidade de avaliações por faixa de nota
                </CardDescription>
              </CardHeader>
              <CardContent>
                {turmaMetrics.distribuicaoNotas && turmaMetrics.distribuicaoNotas.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={turmaMetrics.distribuicaoNotas}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#3b82f6" name="Quantidade" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    Sem dados de distribuição de notas
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="habilidades" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Desempenho por Habilidade</CardTitle>
                <CardDescription>
                  Habilidades mais erradas e mais acertadas pela turma
                </CardDescription>
              </CardHeader>
              <CardContent>
                {habilidadesReport.length > 0 ? (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={habilidadesReport.slice(0, 10)}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis dataKey="nome" type="category" width={90} />
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Legend />
                        <Bar dataKey="taxaAcerto" fill="#10b981" name="Taxa de Acerto (%)" />
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Tabela de Habilidades */}
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-3">Detalhamento</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-semibold">Habilidade</th>
                              <th className="px-4 py-2 text-center text-sm font-semibold">Acertos</th>
                              <th className="px-4 py-2 text-center text-sm font-semibold">Erros</th>
                              <th className="px-4 py-2 text-center text-sm font-semibold">Total</th>
                              <th className="px-4 py-2 text-center text-sm font-semibold">Taxa de Acerto</th>
                              <th className="px-4 py-2 text-center text-sm font-semibold">Média Pontuação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {habilidadesReport.map((hab, idx) => {
                              const taxaErro = hab.total > 0 ? ((hab.erros / hab.total) * 100).toFixed(1) : 0;
                              return (
                                <tr key={hab.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="px-4 py-2 text-sm">{hab.nome}</td>
                                  <td className="px-4 py-2 text-center text-sm text-green-600">{hab.acertos}</td>
                                  <td className="px-4 py-2 text-center text-sm text-red-600">{hab.erros}</td>
                                  <td className="px-4 py-2 text-center text-sm">{hab.total}</td>
                                  <td className="px-4 py-2 text-center text-sm">
                                    <span className={hab.taxaAcerto >= 70 ? 'text-green-600' : hab.taxaAcerto >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                                      {hab.taxaAcerto}%
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-center text-sm">
                                    {hab.mediaPontuacao !== null ? (
                                      <span className={hab.mediaPontuacao >= 7 ? 'text-green-600 font-semibold' : hab.mediaPontuacao >= 5 ? 'text-yellow-600' : 'text-red-600'}>
                                        {hab.mediaPontuacao.toFixed(2)}/10
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">N/A</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    Nenhum dado de habilidades disponível. As habilidades são registradas quando você usa gabaritos de múltipla escolha.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evolucao" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolução Temporal das Habilidades</CardTitle>
                <CardDescription>
                  Média de pontuação por habilidade ao longo dos períodos avaliativos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {habilidadesEvolucao.length > 0 ? (() => {
                  // Preparar dados unificados para o gráfico
                  const todosPeriodos = new Set();
                  habilidadesEvolucao.forEach(h => {
                    h.evolucao.forEach(e => todosPeriodos.add(e.periodo));
                  });
                  const periodosArray = Array.from(todosPeriodos).sort();

                  // Criar array de dados com todas as habilidades
                  const dadosGrafico = periodosArray.map(periodo => {
                    const ponto = { periodo };
                    habilidadesEvolucao.forEach(hab => {
                      const evolucaoPonto = hab.evolucao.find(e => e.periodo === periodo);
                      ponto[hab.nome] = evolucaoPonto ? evolucaoPonto.mediaPontuacao : null;
                    });
                    return ponto;
                  });

                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

                  return (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={dadosGrafico}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="periodo"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis domain={[0, 10]} label={{ value: 'Média de Pontuação', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        {habilidadesEvolucao.map((hab, idx) => (
                          <Line
                            key={hab.id}
                            type="monotone"
                            dataKey={hab.nome}
                            name={hab.nome}
                            stroke={colors[idx % colors.length]}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  );
                })() : (
                  <p className="text-center text-gray-500 py-8">
                    Nenhum dado de evolução disponível. As habilidades precisam ter pontuações registradas em múltiplos períodos.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="correlacao" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Correlação entre Habilidades</CardTitle>
                <CardDescription>
                  Habilidades que tendem a ter desempenho similar (correlação positiva) ou oposto (correlação negativa)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {habilidadesCorrelacao.length > 0 ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Habilidade 1</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Habilidade 2</th>
                            <th className="px-4 py-2 text-center text-sm font-semibold">Correlação</th>
                            <th className="px-4 py-2 text-center text-sm font-semibold">Tipo</th>
                            <th className="px-4 py-2 text-center text-sm font-semibold">Amostras</th>
                          </tr>
                        </thead>
                        <tbody>
                          {habilidadesCorrelacao.map((corr, idx) => {
                            const correlacaoAbs = Math.abs(corr.correlacao);
                            const corClass = corr.tipo === 'positiva'
                              ? correlacaoAbs > 0.7 ? 'text-green-700 bg-green-50' : 'text-green-600'
                              : correlacaoAbs > 0.7 ? 'text-red-700 bg-red-50' : 'text-red-600';

                            return (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-2 text-sm font-medium">{corr.habilidade1.nome}</td>
                                <td className="px-4 py-2 text-sm font-medium">{corr.habilidade2.nome}</td>
                                <td className={`px-4 py-2 text-center text-sm font-semibold ${corClass}`}>
                                  {corr.correlacao > 0 ? '+' : ''}{corr.correlacao.toFixed(3)}
                                </td>
                                <td className="px-4 py-2 text-center text-sm">
                                  <span className={`px-2 py-1 rounded text-xs ${corr.tipo === 'positiva'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                    }`}>
                                    {corr.tipo === 'positiva' ? 'Positiva' : 'Negativa'}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-center text-sm text-gray-600">
                                  {corr.amostras} alunos
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-800">
                        <strong>Interpretação:</strong> Correlação positiva indica que alunos com bom desempenho em uma habilidade
                        tendem a ter bom desempenho na outra. Correlação negativa indica o oposto.
                        Valores próximos de ±1 indicam correlação forte.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    Nenhuma correlação significativa encontrada. É necessário ter dados de múltiplos alunos
                    com avaliações em diferentes habilidades.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alunos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ranking de Alunos</CardTitle>
                <CardDescription>
                  Média de notas por aluno (ordenado por melhor desempenho)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {turmaMetrics.alunos && turmaMetrics.alunos.length > 0 ? (
                  <div className="space-y-2">
                    {turmaMetrics.alunos.map((aluno, index) => (
                      <div
                        key={aluno.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedAlunoId(aluno.id);
                          setAlunoModalOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-100 text-gray-700' :
                              index === 2 ? 'bg-orange-100 text-orange-700' :
                                'bg-blue-50 text-blue-700'
                            }`}>
                            {index + 1}º
                          </div>
                          <div>
                            <p className="font-semibold">{aluno.nome}</p>
                            <p className="text-xs text-gray-500">
                              {aluno.totalAvaliacoes} avaliação(ões)
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">
                            {aluno.media.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">média</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    Nenhum aluno com avaliações validadas
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Modal de Detalhe do Aluno */}
      <AlunoDetailModal
        open={alunoModalOpen}
        onOpenChange={setAlunoModalOpen}
        alunoId={selectedAlunoId}
      />
    </div>
  );
}

