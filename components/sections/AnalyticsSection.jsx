'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart, LabelList } from 'recharts';
import { TrendingUp, Users, Award, Target, Clock, FileText, Download, CheckCircle, AlertCircle, Sparkles, BarChart3 } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
      // Debounce para evitar múltiplas chamadas rápidas
      const timeoutId = setTimeout(() => {
        loadAnalytics();
      }, 300); // Aguarda 300ms antes de fazer a requisição

      return () => clearTimeout(timeoutId);
    } else {
      setTurmaMetrics(null);
      setHabilidadesReport([]);
      setHabilidadesEvolucao([]);
      setHabilidadesCorrelacao([]);
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

    // AbortController para cancelar requisições se necessário
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // Timeout de 30s

    try {
      const fetchOptions = {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal,
      };

      const [metricsRes, habilidadesRes, evolucaoRes, correlacaoRes] = await Promise.all([
        fetch(`/api/analytics/turma/${selectedTurma}`, fetchOptions).catch(err => {
          if (err.name !== 'AbortError') console.error('Erro ao buscar métricas:', err);
          return null;
        }),
        fetch(`/api/analytics/habilidades/${selectedTurma}`, fetchOptions).catch(err => {
          if (err.name !== 'AbortError') console.error('Erro ao buscar habilidades:', err);
          return null;
        }),
        fetch(`/api/analytics/habilidades/${selectedTurma}/evolucao`, fetchOptions).catch(err => {
          if (err.name !== 'AbortError') console.error('Erro ao buscar evolução:', err);
          return null;
        }),
        fetch(`/api/analytics/habilidades/${selectedTurma}/correlacao`, fetchOptions).catch(err => {
          if (err.name !== 'AbortError') console.error('Erro ao buscar correlações:', err);
          return null;
        })
      ]);

      clearTimeout(timeoutId);

      // Processar respostas com tratamento de erro individual
      if (metricsRes && metricsRes.ok) {
        try {
          const data = await metricsRes.json();
          setTurmaMetrics(data);
        } catch (err) {
          console.error('Erro ao processar métricas:', err);
        }
      } else if (metricsRes) {
        console.error('Erro ao carregar métricas:', metricsRes.status);
      }

      if (habilidadesRes && habilidadesRes.ok) {
        try {
          const data = await habilidadesRes.json();
          // Transformar nomes numéricos em nomes intuitivos (0 -> Questão 1)
          const transformedHabilidades = (data.habilidades || []).map(hab => {
            const isNumeric = /^\d+$/.test(hab.nome);
            return {
              ...hab,
              nome: isNumeric ? `Questão ${parseInt(hab.nome) + 1}` : hab.nome,
              isUnnamed: isNumeric
            };
          }).sort((a, b) => {
            // Priorizar habilidades nomeadas sobre as genéricas (Questão X)
            if (a.isUnnamed && !b.isUnnamed) return 1;
            if (!a.isUnnamed && b.isUnnamed) return -1;
            return b.taxaAcerto - a.taxaAcerto;
          });

          setHabilidadesReport(transformedHabilidades);
        } catch (err) {
          console.error('Erro ao processar habilidades:', err);
        }
      } else if (habilidadesRes) {
        console.error('Erro ao carregar habilidades:', habilidadesRes?.status || 'Network error');
      }

      if (evolucaoRes && evolucaoRes.ok) {
        try {
          const data = await evolucaoRes.json();
          setHabilidadesEvolucao(data.habilidades || []);
        } catch (err) {
          console.error('Erro ao processar evolução:', err);
        }
      } else if (evolucaoRes) {
        console.error('Erro ao carregar evolução:', evolucaoRes?.status || 'Network error');
      }

      if (correlacaoRes && correlacaoRes.ok) {
        try {
          const data = await correlacaoRes.json();
          setHabilidadesCorrelacao(data.correlacoes || []);
        } catch (err) {
          console.error('Erro ao processar correlações:', err);
        }
      } else if (correlacaoRes) {
        console.error('Erro ao carregar correlações:', correlacaoRes?.status || 'Network error');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to load analytics:', error);
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const generateInsights = () => {
    const insights = [];
    if (!turmaMetrics || !habilidadesReport || habilidadesReport.length === 0) return [];

    // Insight 1: Habilidade com maior dificuldade
    const piorHab = [...habilidadesReport].sort((a, b) => a.taxaAcerto - b.taxaAcerto)[0];
    if (piorHab && piorHab.taxaAcerto < 70) {
      insights.push({
        icon: <AlertCircle className="h-4 w-4 text-orange-500" />,
        text: `Habilidade "${piorHab.nome}" precisa de reforço - ${piorHab.erros} erros detectados.`
      });
    }

    // Insight 2: Habilidade de destaque
    const melhorHab = [...habilidadesReport].sort((a, b) => b.taxaAcerto - a.taxaAcerto)[0];
    if (melhorHab && melhorHab.taxaAcerto > 85) {
      insights.push({
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        text: `Excelente desempenho em "${melhorHab.nome}" com ${melhorHab.taxaAcerto}% de acerto.`
      });
    }

    // Insight 3: Alunos com excelência
    const alunosDestaque = turmaMetrics.alunos?.filter(a => a.media >= 9.0).length || 0;
    if (alunosDestaque > 0) {
      insights.push({
        icon: <Sparkles className="h-4 w-4 text-blue-500" />,
        text: `${alunosDestaque} aluno(s) demonstraram excelência em todas as competências avaliadas.`
      });
    }

    // Insight 4: Taxa de erro crítica em questões (simulado se não tiver dados de questões)
    if (piorHab && piorHab.taxaAcerto < 50) {
      insights.push({
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
        text: `Alta taxa de erro detectada em tópicos relacionados a "${piorHab.nome}". Considere revisar este conteúdo.`
      });
    }

    // Insight 4: Tendência temporal (se houver dados)
    if (habilidadesEvolucao && habilidadesEvolucao.length > 0) {
      const temMelhora = habilidadesEvolucao.some(h => {
        if (h.evolucao.length < 2) return false;
        const last = h.evolucao[h.evolucao.length - 1].mediaPontuacao;
        const prev = h.evolucao[h.evolucao.length - 2].mediaPontuacao;
        return last > prev;
      });

      if (temMelhora) {
        insights.push({
          icon: <TrendingUp className="h-4 w-4 text-green-500" />,
          text: `Tendência de melhora detectada em competências específicas nos últimos períodos.`
        });
      }
    }

    return insights;
  };

  const insights = generateInsights();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Resultados e Analytics
          </h2>
          <p className="text-muted-foreground">Visualize o desempenho da turma em tempo real com gráficos interativos e relatórios detalhados.</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedTurma || ''} onValueChange={setSelectedTurma}>
            <SelectTrigger className="w-[200px]">
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
      </div>

      {!selectedTurma && (
        <Card className="border-dashed">
          <CardContent className="py-20 text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <Users className="h-10 w-10 opacity-20" />
              <p>Selecione uma turma para visualizar as métricas e insights</p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedTurma && loading && (
        <Card className="border-none bg-muted/30">
          <CardContent className="py-20 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground font-medium">Analisando dados da turma...</p>
          </CardContent>
        </Card>
      )}

      {selectedTurma && !loading && turmaMetrics && (
        <div className="space-y-6">
          {/* Métricas de Alto Nível - Estilo Cards da Imagem */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Alunos</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{turmaMetrics.alunos?.length || 0}</div>
                <p className="text-xs text-blue-600/70 mt-1">Total na turma</p>
              </CardContent>
            </Card>

            <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">Média Geral</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100">{turmaMetrics.mediaTurma.toFixed(1)}</div>
                <p className="text-xs text-green-600/70 mt-1">Pontuação média</p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">Aprovados</CardTitle>
                <Award className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {Math.round((turmaMetrics.taxaAprovacao / 100) * (turmaMetrics.totalAvaliacoes || 0))}
                </div>
                <p className="text-xs text-purple-600/70 mt-1">{turmaMetrics.taxaAprovacao.toFixed(0)}% da turma</p>
              </CardContent>
            </Card>

            <Card className="bg-orange-50/50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">Tempo Economizado</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {Math.ceil((turmaMetrics.totalAvaliacoes * 12) / 60)}h
                </div>
                <p className="text-xs text-orange-600/70 mt-1">Estimativa de correção</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="habilidades" className="space-y-4">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="habilidades" className="data-[state=active]:bg-background">Habilidades</TabsTrigger>
              <TabsTrigger value="overview" className="data-[state=active]:bg-background">Distribuição</TabsTrigger>
              <TabsTrigger value="evolucao" className="data-[state=active]:bg-background">Evolução</TabsTrigger>
              <TabsTrigger value="correlacao" className="data-[state=active]:bg-background">Correlações</TabsTrigger>
              <TabsTrigger value="alunos" className="data-[state=active]:bg-background">Ranking</TabsTrigger>
            </TabsList>

            <TabsContent value="habilidades" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Desempenho por Habilidade - Estilo da Imagem */}
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      <CardTitle>Desempenho por Habilidade</CardTitle>
                    </div>
                    <CardDescription>Percentual de acerto em cada competência avaliada</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {habilidadesReport.length > 0 ? (
                      <div className="space-y-6">
                        {habilidadesReport.slice(0, 6).map((hab, index) => (
                          <div key={hab.id} className="space-y-2">
                            <div className="flex justify-between text-sm font-medium">
                              <span>{hab.nome}</span>
                              <span className="text-muted-foreground">{hab.taxaAcerto}%</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${hab.taxaAcerto}%` }}
                                transition={{ duration: 1, delay: index * 0.1 }}
                                className={`h-full rounded-full ${hab.taxaAcerto >= 80 ? 'bg-blue-600' :
                                  hab.taxaAcerto >= 70 ? 'bg-green-500' :
                                    hab.taxaAcerto >= 50 ? 'bg-yellow-500' :
                                      'bg-orange-500'
                                  }`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center text-muted-foreground">
                        Nenhum dado de habilidades disponível
                      </div>
                    )}

                    {habilidadesReport.some(h => h.isUnnamed) && (
                      <div className="mt-6 p-3 bg-muted/50 rounded-lg border border-dashed border-border">
                        <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                          * Itens identificados como <strong>"Questão X"</strong> são critérios detectados na correção que ainda não foram associados a uma competência específica na sua base de dados.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Relatórios Disponíveis */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <CardTitle>Relatórios Disponíveis</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-between group hover:border-blue-600 hover:text-blue-600 transition-all">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Relatório Completo da Turma
                      </div>
                      <Download className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                    <Button variant="outline" className="w-full justify-between group hover:border-blue-600 hover:text-blue-600 transition-all">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Análise por Questão
                      </div>
                      <Download className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                    <Button variant="outline" className="w-full justify-between group hover:border-blue-600 hover:text-blue-600 transition-all">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Evolução Individual
                      </div>
                      <Download className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                    <Button variant="outline" className="w-full justify-between group hover:border-blue-600 hover:text-blue-600 transition-all">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Perfis de Aprendizagem
                      </div>
                      <Download className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>

                    <div className="grid grid-cols-2 gap-2 pt-4">
                      <Button size="sm" variant="secondary" className="gap-2">
                        <Download className="h-4 w-4" /> Exportar Excel
                      </Button>
                      <Button size="sm" variant="secondary" className="gap-2">
                        <Download className="h-4 w-4" /> Exportar CSV
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Insights Automáticos */}
              <Card className="border-blue-100 dark:border-blue-900/50 bg-blue-50/20 dark:bg-blue-950/10">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">Insights Automáticos</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {insights.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {insights.map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                          <div className="mt-0.5">{insight.icon}</div>
                          <p className="text-sm font-medium">{insight.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Dados insuficientes para gerar insights automáticos neste momento.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overview" className="space-y-4">
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
                    <ChartContainer
                      config={{
                        count: {
                          label: "Quantidade",
                          color: "hsl(var(--primary))",
                        },
                      }}
                      className="h-[350px] w-full"
                    >
                      <AreaChart
                        data={turmaMetrics.distribuicaoNotas}
                        margin={{ left: -20, right: 12, top: 10 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="range"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          dataKey="count"
                          type="monotone"
                          fill="var(--color-count)"
                          fillOpacity={0.2}
                          stroke="var(--color-count)"
                          strokeWidth={3}
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="py-20 text-center text-muted-foreground">
                      Sem dados de distribuição de notas
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="evolucao" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Evolução Temporal das Habilidades</CardTitle>
                  <CardDescription>
                    Desempenho médio por competência ao longo do tempo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {habilidadesEvolucao.length > 0 ? (
                    <div className="h-[400px]">
                      {(() => {
                        const todosPeriodos = new Set();
                        habilidadesEvolucao.forEach(h => {
                          h.evolucao.forEach(e => todosPeriodos.add(e.periodo));
                        });
                        const periodosArray = Array.from(todosPeriodos).sort();

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
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                              <XAxis dataKey="periodo" tickMargin={10} />
                              <YAxis domain={[0, 10]} tickMargin={10} />
                              <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                              />
                              <Legend />
                              {habilidadesEvolucao.map((hab, idx) => (
                                <Line
                                  key={hab.id}
                                  type="monotone"
                                  dataKey={hab.nome}
                                  stroke={colors[idx % colors.length]}
                                  strokeWidth={3}
                                  dot={{ r: 5, strokeWidth: 2, fill: 'white' }}
                                  activeDot={{ r: 7 }}
                                  connectNulls
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="py-20 text-center text-muted-foreground">
                      Dados insuficientes para análise de evolução temporal
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="correlacao" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Correlação entre Habilidades</CardTitle>
                  <CardDescription>
                    Identifique quais competências estão relacionadas no desempenho dos alunos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {habilidadesCorrelacao.length > 0 ? (
                    <div className="space-y-4">
                      <div className="border rounded-xl overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>Competência A</TableHead>
                              <TableHead>Competência B</TableHead>
                              <TableHead className="text-center">Força</TableHead>
                              <TableHead className="text-center">Amostra</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {habilidadesCorrelacao.map((corr, idx) => {
                              const absCorr = Math.abs(corr.correlacao);
                              let strengthLabel = "";
                              let strengthColor = "";

                              if (absCorr > 0.8) { strengthLabel = "Muito Forte"; strengthColor = "text-blue-600"; }
                              else if (absCorr > 0.6) { strengthLabel = "Forte"; strengthColor = "text-blue-500"; }
                              else if (absCorr > 0.4) { strengthLabel = "Moderada"; strengthColor = "text-blue-400"; }
                              else { strengthLabel = "Fraca"; strengthColor = "text-slate-400"; }

                              return (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{corr.habilidade1.nome}</TableCell>
                                  <TableCell className="font-medium">{corr.habilidade2.nome}</TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex flex-col items-center">
                                      <span className={`text-sm font-bold ${strengthColor}`}>
                                        {corr.correlacao > 0 ? '+' : ''}{corr.correlacao.toFixed(2)}
                                      </span>
                                      <span className="text-[10px] uppercase font-semibold opacity-50">{strengthLabel}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center text-muted-foreground text-sm">
                                    {corr.amostras} alunos
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-lg text-xs flex gap-3 items-start">
                        <AlertCircle className="h-4 w-4 text-blue-500 shrink-0" />
                        <p className="text-muted-foreground">
                          <strong>Como ler:</strong> Valores próximos a +1 indicam que alunos que acertam a Competência A também tendem a acertar a B. Valores próximos a -1 indicam que o acerto em uma está ligado ao erro na outra.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center text-muted-foreground">
                      Nenhuma correlação significativa encontrada até o momento
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alunos" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ranking de Desempenho</CardTitle>
                  <CardDescription>Média geral dos alunos na turma</CardDescription>
                </CardHeader>
                <CardContent>
                  {turmaMetrics.alunos && turmaMetrics.alunos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {turmaMetrics.alunos.map((aluno, index) => (
                        <div
                          key={aluno.id}
                          className="flex items-center justify-between p-4 border border-border/50 rounded-xl hover:bg-blue-50/10 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 cursor-pointer transition-all group"
                          onClick={() => {
                            setSelectedAlunoId(aluno.id);
                            setAlunoModalOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-transform group-hover:scale-110 ${index === 0 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400' :
                              index === 1 ? 'bg-slate-100 text-slate-700 ring-2 ring-slate-300' :
                                index === 2 ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300' :
                                  'bg-muted text-muted-foreground'
                              }`}>
                              {index + 1}º
                            </div>
                            <div>
                              <p className="font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{aluno.nome}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <FileText className="h-3 w-3" />
                                {aluno.totalAvaliacoes} avaliações
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-black text-blue-600 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                              {aluno.media.toFixed(1)}
                            </div>
                            <div className="h-1.5 w-16 bg-muted rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-blue-600 group-hover:bg-blue-500 transition-colors" style={{ width: `${aluno.media * 10}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center text-muted-foreground">
                      Nenhum dado de aluno disponível
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
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

