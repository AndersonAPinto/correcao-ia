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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle2, Image as ImageIcon, Edit2, Save, Award } from 'lucide-react';
import { useState, useEffect } from 'react';
import HabilidadeCard from '@/components/avaliacao/HabilidadeCard';
import AdicionarHabilidadeForm from '@/components/avaliacao/AdicionarHabilidadeForm';

export default function ValidationModal({ open, onOpenChange, avaliacao, onValidated, isPending }) {
  const [validating, setValidating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notaFinal, setNotaFinal] = useState(0);
  const [questoesEditadas, setQuestoesEditadas] = useState([]);
  const [habilidades, setHabilidades] = useState([]);
  const [habilidadesAvaliacao, setHabilidadesAvaliacao] = useState([]);
  const [loadingHabilidades, setLoadingHabilidades] = useState(false);
  const [adicionandoHabilidade, setAdicionandoHabilidade] = useState(false);
  const [habilidadeSelecionada, setHabilidadeSelecionada] = useState('');
  const [editandoHabilidadeId, setEditandoHabilidadeId] = useState(null);
  const [pontuacaoEditando, setPontuacaoEditando] = useState(0);
  const [justificativaEditando, setJustificativaEditando] = useState('');

  useEffect(() => {
    if (avaliacao) {
      // Usar nota ajustada se existir, senão usar nota original
      setNotaFinal(avaliacao.nota || 0);
      // Inicializar questões editadas com valores atuais
      if (avaliacao.exercicios && avaliacao.exercicios.length > 0) {
        setQuestoesEditadas(
          avaliacao.exercicios.map(ex => ({
            numero: ex.numero || 0,
            nota: ex.nota || 0,
            notaMaxima: ex.nota_maxima || 1,
            feedback: ex.feedback || '',
            notaOriginal: ex.nota || 0 // Nota original da IA
          }))
        );
      } else {
        setQuestoesEditadas([]);
      }

      // Carregar habilidades da avaliação
      if (avaliacao.id) {
        loadHabilidadesAvaliacao();
      }
    }
  }, [avaliacao]);

  useEffect(() => {
    if (open && avaliacao) {
      loadHabilidadesDisponiveis();
    }
  }, [open, avaliacao]);

  const loadHabilidadesDisponiveis = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/habilidades', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHabilidades(data.habilidades || []);
      }
    } catch (error) {
      console.error('Erro ao carregar habilidades:', error);
    }
  };

  const loadHabilidadesAvaliacao = async () => {
    if (!avaliacao?.id) return;

    setLoadingHabilidades(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/avaliacoes/${avaliacao.id}/habilidades`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHabilidadesAvaliacao(data.habilidades || []);
        // Atualizar também os arrays de acertadas/erradas se vierem na resposta
        if (data.habilidadesAcertadas) {
          avaliacao.habilidadesAcertadas = data.habilidadesAcertadas;
        }
        if (data.habilidadesErradas) {
          avaliacao.habilidadesErradas = data.habilidadesErradas;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar habilidades da avaliação:', error);
    }
    setLoadingHabilidades(false);
  };

  const handleAdicionarHabilidade = async (descricaoFoco = '') => {
    if (!habilidadeSelecionada) {
      toast.error('Selecione uma habilidade');
      return;
    }

    setAdicionandoHabilidade(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/avaliacoes/${avaliacao.id}/habilidades`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          habilidadeId: habilidadeSelecionada,
          usarIA: true,
          descricaoFoco: descricaoFoco.trim() || undefined // Enviar apenas se preenchido
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Habilidade adicionada e avaliada com IA!');
        setHabilidadeSelecionada('');
        loadHabilidadesAvaliacao();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao adicionar habilidade');
      }
    } catch (error) {
      toast.error('Erro de conexão ao adicionar habilidade');
    }
    setAdicionandoHabilidade(false);
  };

  const handleEditarHabilidade = (hab) => {
    setEditandoHabilidadeId(hab.habilidadeId);
    setPontuacaoEditando(hab.pontuacao);
    setJustificativaEditando(hab.justificativa || '');
  };

  const handleSalvarHabilidade = async (habilidadeId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/avaliacoes/${avaliacao.id}/habilidades/${habilidadeId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pontuacao: pontuacaoEditando,
          justificativa: justificativaEditando
        })
      });

      if (response.ok) {
        toast.success('Habilidade atualizada com sucesso!');
        setEditandoHabilidadeId(null);
        loadHabilidadesAvaliacao();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao atualizar habilidade');
      }
    } catch (error) {
      toast.error('Erro de conexão ao atualizar habilidade');
    }
  };

  const handleReavaliarComIA = async (habilidadeId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/avaliacoes/${avaliacao.id}/habilidades/${habilidadeId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reavaliarComIA: true
        })
      });

      if (response.ok) {
        toast.success('Habilidade reavaliada com IA!');
        loadHabilidadesAvaliacao();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao reavaliar habilidade');
      }
    } catch (error) {
      toast.error('Erro de conexão ao reavaliar habilidade');
    }
  };

  const handleRemoverHabilidade = async (habilidadeId) => {
    if (!confirm('Tem certeza que deseja remover esta habilidade?')) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/avaliacoes/${avaliacao.id}/habilidades/${habilidadeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Habilidade removida com sucesso!');
        loadHabilidadesAvaliacao();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao remover habilidade');
      }
    } catch (error) {
      toast.error('Erro de conexão ao remover habilidade');
    }
  };

  const handleQuestaoChange = (index, field, value) => {
    const novasQuestoes = [...questoesEditadas];
    novasQuestoes[index][field] = field === 'nota' ? parseFloat(value) || 0 : value;
    setQuestoesEditadas(novasQuestoes);

    // Recalcular nota final
    const totalPontos = novasQuestoes.reduce((sum, q) => sum + (q.notaMaxima || 1), 0);
    const pontosObtidos = novasQuestoes.reduce((sum, q) => sum + (q.nota || 0), 0);
    const novaNotaFinal = totalPontos > 0 ? (pontosObtidos / totalPontos) * 10 : 0;
    setNotaFinal(novaNotaFinal);
  };

  const handleValidate = async () => {
    setValidating(true);
    const token = localStorage.getItem('token');

    try {
      // Preparar dados de ajuste
      const notasAjustadas = questoesEditadas
        .filter(q => q.nota !== q.notaOriginal || q.feedback !== (avaliacao.exercicios?.find(ex => ex.numero === q.numero)?.feedback || ''))
        .map(q => ({
          numero: q.numero,
          nota: q.nota,
          feedback: q.feedback
        }));

      const response = await fetch(`/api/avaliacoes/${avaliacao.id}/validar`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notaFinal: notaFinal,
          notasAjustadas: notasAjustadas
        })
      });

      if (response.ok) {
        toast.success('✅ Avaliação validada e finalizada com sucesso!');
        onValidated();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Não foi possível salvar a validação. Tente novamente.');
      }
    } catch (error) {
      toast.error('Erro de conexão ao validar a avaliação.');
    }
    setValidating(false);
  };

  if (!avaliacao) return null;

  const temAjustes = questoesEditadas.some(q =>
    q.nota !== q.notaOriginal ||
    q.feedback !== (avaliacao.exercicios?.find(ex => ex.numero === q.numero)?.feedback || '')
  ) || notaFinal !== (avaliacao.nota || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Correção da Avaliação</span>
            {isPending && (
              <Button
                variant={editing ? "default" : "outline"}
                size="sm"
                onClick={() => setEditing(!editing)}
              >
                {editing ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Ajustar Notas
                  </>
                )}
              </Button>
            )}
          </DialogTitle>
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
                {avaliacao.imageUrl ? (
                  <img
                    src={(() => {
                      const url = avaliacao.imageUrl;

                      // Se já é URL da API (/api/images/...), usar diretamente
                      if (url.startsWith('/api/images/')) {
                        return url;
                      }

                      // Se é URL absoluta (http/https)
                      if (url.startsWith('http://') || url.startsWith('https://')) {
                        // Se contém /api/images/, usar diretamente
                        if (url.includes('/api/images/')) {
                          return url;
                        }
                        // Se contém /uploads/, extrair apenas o path para usar URL relativa
                        const uploadsIndex = url.indexOf('/uploads/');
                        if (uploadsIndex !== -1) {
                          return url.substring(uploadsIndex);
                        }
                        // Caso contrário, usar URL absoluta como está
                        return url;
                      }

                      // Se começa com /, usar diretamente (URL relativa)
                      if (url.startsWith('/')) {
                        return url;
                      }

                      // Caso contrário, adicionar / no início
                      return `/${url}`;
                    })()}
                    alt="Prova do aluno"
                    className="w-full h-auto"
                    onError={(e) => {
                      console.error('Erro ao carregar imagem:', avaliacao.imageUrl);
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'p-4 text-center text-gray-500 bg-red-50 border border-red-200 rounded';
                      errorDiv.innerHTML = `
                        <p class="font-semibold text-red-600">Imagem não encontrada</p>
                        <p class="text-xs text-gray-500 mt-1 break-all">URL: ${avaliacao.imageUrl}</p>
                        <p class="text-xs text-gray-400 mt-1">A imagem pode ter sido deletada ou não existe mais.</p>
                      `;
                      e.target.parentElement.replaceChild(errorDiv, e.target);
                    }}
                  />
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    Imagem não disponível
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right: Correction */}
          <Card className="flex flex-col h-[600px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Correção {editing ? '(Editando)' : ''}</span>
                <div className="flex items-center gap-2">
                  {avaliacao.notaOriginal && Math.abs(avaliacao.notaOriginal - notaFinal) > 0.01 && (
                    <Badge variant="outline" className="text-xs">
                      Original: {avaliacao.notaOriginal.toFixed(2)}
                    </Badge>
                  )}
                  {!avaliacao.notaOriginal && avaliacao.nota && Math.abs(avaliacao.nota - notaFinal) > 0.01 && (
                    <Badge variant="outline" className="text-xs">
                      Sugestão IA: {avaliacao.nota.toFixed(2)}
                    </Badge>
                  )}
                  <Badge className={editing && temAjustes ? "bg-orange-600" : "bg-blue-600"}>
                    {notaFinal.toFixed(2)}/10
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1">
                <div className="space-y-4 pr-4">
                  {/* Nota Final Editável */}
                  {editing && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <Label className="text-sm font-semibold mb-2 block">
                        Nota Final (0-10)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={notaFinal}
                          onChange={(e) => setNotaFinal(parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                        <span className="text-sm text-gray-600">/ 10</span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {avaliacao.nota && `Sugestão da IA: ${avaliacao.nota.toFixed(2)}`}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        A nota final será recalculada automaticamente ao ajustar questões individuais
                      </p>
                    </div>
                  )}

                  {/* Feedback Geral */}
                  <div>
                    <h4 className="font-semibold text-sm mb-2 text-blue-600">Feedback Geral</h4>
                    <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded">
                      {avaliacao.feedback || 'Sem feedback geral'}
                    </p>
                  </div>

                  {/* Exercícios */}
                  {questoesEditadas.length > 0 ? (
                    <div>
                      <h4 className="font-semibold text-sm mb-2 text-blue-600">
                        Feedback por Exercício {editing && '(Clique para editar)'}
                      </h4>
                      <div className="space-y-3">
                        {questoesEditadas.map((questao, idx) => {
                          const questaoOriginal = avaliacao.exercicios?.find(ex => ex.numero === questao.numero);
                          const foiAjustada = questao.nota !== questao.notaOriginal ||
                            questao.feedback !== (questaoOriginal?.feedback || '');

                          return (
                            <div
                              key={idx}
                              className={`border rounded-lg p-3 ${editing
                                ? 'bg-white border-2 border-blue-200'
                                : foiAjustada
                                  ? 'bg-orange-50 border-orange-200'
                                  : 'bg-gray-50'
                                }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-sm text-blue-600">
                                  Exercício {questao.numero}
                                </span>
                                <div className="flex items-center gap-2">
                                  {foiAjustada && editing && (
                                    <Badge variant="outline" className="text-xs bg-orange-100">
                                      Ajustada
                                    </Badge>
                                  )}
                                  {editing ? (
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={questao.nota}
                                        onChange={(e) => handleQuestaoChange(idx, 'nota', e.target.value)}
                                        className="w-16 h-7 text-sm text-blue-600 font-bold"
                                      />
                                      <span className="text-xs text-blue-600">/ {questao.notaMaxima}</span>
                                    </div>
                                  ) : (
                                    <Badge variant="outline" className="text-blue-600 border-blue-200 font-bold">
                                      {questao.nota.toFixed(1)}/{questao.notaMaxima}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {editing ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={questao.feedback}
                                    onChange={(e) => handleQuestaoChange(idx, 'feedback', e.target.value)}
                                    placeholder="Digite o feedback para esta questão..."
                                    rows={3}
                                    className="text-sm"
                                  />
                                  {questaoOriginal && questaoOriginal.feedback && (
                                    <details className="text-xs">
                                      <summary className="cursor-pointer text-gray-500">
                                        Ver sugestão original da IA
                                      </summary>
                                      <p className="mt-1 p-2 bg-gray-100 rounded text-gray-700">
                                        {questaoOriginal.feedback}
                                      </p>
                                    </details>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-700">
                                  {questao.feedback || 'Sem feedback'}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : avaliacao.exercicios && avaliacao.exercicios.length > 0 ? (
                    <div>
                      <h4 className="font-semibold text-sm mb-2 text-blue-600">Feedback por Exercício</h4>
                      <div className="space-y-3">
                        {avaliacao.exercicios.map((ex, idx) => (
                          <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-sm text-blue-600">
                                Exercício {ex.numero || idx + 1}
                              </span>
                              <Badge variant="outline" className="text-blue-600 border-blue-200 font-bold">
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
                  ) : null}

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

                  {/* Habilidades Avaliadas */}
                  <div className="mt-4 border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm text-blue-600 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Habilidades Avaliadas
                      </h4>
                    </div>

                    {/* Adicionar Nova Habilidade - Componente separado */}
                    <AdicionarHabilidadeForm
                      habilidades={habilidades}
                      habilidadesAvaliacao={habilidadesAvaliacao}
                      habilidadeSelecionada={habilidadeSelecionada}
                      adicionandoHabilidade={adicionandoHabilidade}
                      onHabilidadeChange={setHabilidadeSelecionada}
                      onAdicionar={handleAdicionarHabilidade}
                    />

                    {/* Lista de Habilidades - Componente separado */}
                    {loadingHabilidades ? (
                      <p className="text-sm text-gray-500 text-center py-4">Carregando habilidades...</p>
                    ) : habilidadesAvaliacao.length > 0 ? (
                      <div className="space-y-2">
                        {habilidadesAvaliacao.map((hab) => {
                          const isAcertada = hab.pontuacao >= 7;
                          const isEditando = editandoHabilidadeId === hab.habilidadeId;

                          return (
                            <HabilidadeCard
                              key={hab.habilidadeId}
                              habilidade={hab}
                              isAcertada={isAcertada}
                              isEditando={isEditando}
                              pontuacaoEditando={pontuacaoEditando}
                              justificativaEditando={justificativaEditando}
                              onEditar={() => handleEditarHabilidade(hab)}
                              onSalvar={() => handleSalvarHabilidade(hab.habilidadeId)}
                              onCancelar={() => {
                                setEditandoHabilidadeId(null);
                                setPontuacaoEditando(0);
                                setJustificativaEditando('');
                              }}
                              onReavaliarIA={() => handleReavaliarComIA(hab.habilidadeId)}
                              onRemover={() => handleRemoverHabilidade(hab.habilidadeId)}
                              onPontuacaoChange={setPontuacaoEditando}
                              onJustificativaChange={setJustificativaEditando}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Nenhuma habilidade avaliada ainda. Adicione habilidades acima para obter insights mais detalhados.
                      </p>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* Validate Button */}
              {isPending && (
                <div className="mt-4 pt-4 border-t">
                  {temAjustes && editing && (
                    <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
                      ⚠️ Você fez ajustes nas notas. A nota final será recalculada ao validar.
                    </div>
                  )}
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
