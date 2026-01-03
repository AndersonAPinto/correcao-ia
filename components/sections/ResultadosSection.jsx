'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, Eye, Download } from 'lucide-react';
import ValidationModal from '@/components/ValidationModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ResultadosSection({ view }) {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [selectedAvaliacao, setSelectedAvaliacao] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [turmas, setTurmas] = useState([]);
  const [selectedTurma, setSelectedTurma] = useState('all');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAvaliacoes();
    if (view === 'concluidas') {
      loadTurmas();
    }

    // Auto-refresh every 10 seconds if viewing pendentes
    if (view === 'pendentes') {
      const interval = setInterval(loadAvaliacoes, 10000);
      return () => clearInterval(interval);
    }
  }, [view, selectedTurma]);

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

  const loadAvaliacoes = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const endpoint = view === 'pendentes'
      ? '/api/avaliacoes/pendentes'
      : '/api/avaliacoes/concluidas';

    try {
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        let avaliacoes = data.avaliacoes || [];

        // Aplicar filtro de turma se selecionado (ignorar se for "all")
        if (view === 'concluidas' && selectedTurma && selectedTurma !== 'all') {
          avaliacoes = avaliacoes.filter(av => av.turmaId === selectedTurma);
        }

        setAvaliacoes(avaliacoes);
      }
    } catch (error) {
      console.error('Failed to load avaliacoes:', error);
    }
    setLoading(false);
  };

  const handleView = (avaliacao) => {
    setSelectedAvaliacao(avaliacao);
    setModalOpen(true);
  };

  const handleValidated = () => {
    setModalOpen(false);
    loadAvaliacoes();
  };

  const handleExport = async (format) => {
    if (view !== 'concluidas') {
      toast.error('Exportação disponível apenas para avaliações concluídas');
      return;
    }

    setExporting(true);
    const token = localStorage.getItem('token');

    try {
      const params = new URLSearchParams();
      if (selectedTurma) params.append('turmaId', selectedTurma);

      const response = await fetch(`/api/export/${format}?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `avaliacoes.${format === 'csv' ? 'csv' : 'xls'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Exportação ${format.toUpperCase()} realizada com sucesso!`);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao exportar');
      }
    } catch (error) {
      toast.error('Erro ao exportar dados');
    }

    setExporting(false);
  };

  const title = view === 'pendentes'
    ? 'Aguardando Validação'
    : 'Avaliações Concluídas';

  const description = view === 'pendentes'
    ? 'Avaliações processadas pela IA aguardando sua validação'
    : 'Histórico de avaliações validadas';

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-gray-600">{description}</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="flex items-center gap-2">
                <span>{title}</span>
                <Badge variant="secondary">{avaliacoes.length}</Badge>
              </CardTitle>
              {view === 'concluidas' && avaliacoes.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select value={selectedTurma || 'all'} onValueChange={setSelectedTurma}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtrar por turma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as turmas</SelectItem>
                      {turmas.map((turma) => (
                        <SelectItem key={turma.id} value={turma.id}>
                          {turma.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport('csv')}
                    disabled={exporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport('excel')}
                    disabled={exporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </div>
              )}
            </div>
            <CardDescription>
              {view === 'pendentes'
                ? 'Clique para visualizar e validar cada avaliação'
                : 'Avaliações já validadas e finalizadas'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Carregando...</p>
              </div>
            ) : avaliacoes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {view === 'pendentes'
                  ? 'Nenhuma avaliação aguardando validação'
                  : 'Nenhuma avaliação concluída ainda'}
              </p>
            ) : (
              <div className="space-y-3">
                {avaliacoes.map((av) => {
                  const isProcessing = av.status === 'pending';
                  const isCompleted = av.status === 'completed';

                  return (
                    <div
                      key={av.id}
                      className={`p-4 border border-border/50 rounded-lg transition-all ${isCompleted ? 'hover:bg-blue-50/10 dark:hover:bg-blue-900/20 hover:border-blue-200 cursor-pointer' : 'bg-blue-50/10 border-blue-200/50'
                        } group`}
                      onClick={() => isCompleted && handleView(av)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {isProcessing ? (
                              <div className="relative">
                                <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
                              </div>
                            ) : view === 'pendentes' ? (
                              <Clock className="h-4 w-4 text-yellow-600" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                            <h3 className="font-semibold group-hover:text-blue-600 transition-colors">{av.gabaritoTitulo}</h3>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong className="text-foreground/70">Turma:</strong> {av.turmaNome}</p>
                            <p><strong className="text-foreground/70">Aluno:</strong> {av.alunoNome}</p>
                            <p><strong className="text-foreground/70">Período:</strong> {av.periodo}</p>
                            {av.nota !== null && (
                              <p><strong className="text-foreground/70">Nota:</strong> <span className="text-blue-600 font-semibold group-hover:text-blue-700 transition-colors">{av.nota}/10</span></p>
                            )}
                          </div>
                          <div className="mt-3">
                            {isProcessing ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                🔄 Processando com IA...
                              </Badge>
                            ) : view === 'pendentes' ? (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                ⏳ Aguardando Validação
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          {isCompleted && (
                            <Button size="sm" variant="outline" className="gap-1">
                              <Eye className="h-3 w-3" />
                              Ver
                            </Button>
                          )}
                          {isProcessing && (
                            <p className="text-xs text-blue-600 font-medium">Processando...</p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(av.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedAvaliacao && (
        <ValidationModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          avaliacao={selectedAvaliacao}
          onValidated={handleValidated}
          isPending={view === 'pendentes'}
        />
      )}
    </>
  );
}
