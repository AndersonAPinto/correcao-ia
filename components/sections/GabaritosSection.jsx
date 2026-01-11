'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { FileText, Upload as UploadIcon, Plus, Trash2, X } from 'lucide-react';
import { TIPO_GABARITO } from '@/lib/constants';

export default function GabaritosSection({ setActiveView }) {
  const [gabaritos, setGabaritos] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [habilidades, setHabilidades] = useState([]);
  const [tipoGabarito, setTipoGabarito] = useState('dissertativa');
  const [formData, setFormData] = useState({
    titulo: '',
    conteudo: '',
    perfilAvaliacaoId: '',
    arquivo: null
  });
  const [questoes, setQuestoes] = useState([]); // Para múltipla escolha
  const [creating, setCreating] = useState(false);
  const [showHabilidadeDialog, setShowHabilidadeDialog] = useState(false);
  const [novaHabilidade, setNovaHabilidade] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [gabaritosRes, perfisRes, habilidadesRes] = await Promise.all([
        fetch('/api/gabaritos', { headers }),
        fetch('/api/perfis', { headers }),
        fetch('/api/habilidades', { headers })
      ]);

      if (gabaritosRes.ok) {
        const data = await gabaritosRes.json();
        setGabaritos(data.gabaritos || []);
      }

      if (perfisRes.ok) {
        const data = await perfisRes.json();
        setPerfis(data.perfis || []);
      }

      if (habilidadesRes.ok) {
        const data = await habilidadesRes.json();
        setHabilidades(data.habilidades || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, arquivo: file });
    }
  };

  const handleAddQuestao = () => {
    setQuestoes([...questoes, {
      numero: questoes.length + 1,
      respostaCorreta: '',
      habilidadeId: '',
      pontuacao: 1
    }]);
  };

  const handleRemoveQuestao = (index) => {
    const novasQuestoes = questoes.filter((_, i) => i !== index);
    // Renumerar questões
    novasQuestoes.forEach((q, i) => {
      q.numero = i + 1;
    });
    setQuestoes(novasQuestoes);
  };

  const handleQuestaoChange = (index, field, value) => {
    const novasQuestoes = [...questoes];
    novasQuestoes[index][field] = value;
    setQuestoes(novasQuestoes);
  };

  const handleCreateHabilidade = async () => {
    if (!novaHabilidade.trim()) {
      toast.error('⚠️ Digite o nome da habilidade.');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/habilidades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nome: novaHabilidade })
      });

      if (response.ok) {
        toast.success('✅ Nova habilidade cadastrada!');
        setNovaHabilidade('');
        setShowHabilidadeDialog(false);
        loadData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao criar habilidade.');
      }
    } catch (error) {
      toast.error('Erro de conexão.');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!formData.titulo) {
      toast.error('⚠️ O título do gabarito é obrigatório.');
      return;
    }

    // Validar questões se for múltipla escolha
    if (tipoGabarito === 'multipla_escolha') {
      if (questoes.length === 0) {
        toast.error('⚠️ Adicione pelo menos uma questão ao gabarito.');
        return;
      }
      for (const q of questoes) {
        if (!q.respostaCorreta || !q.habilidadeId) {
          toast.error(`⚠️ Verifique a Questão ${q.numero}: Resposta e Habilidade são obrigatórias.`);
          return;
        }
      }
    }

    setCreating(true);
    const token = localStorage.getItem('token');
    const data = new FormData();
    data.append('titulo', formData.titulo);
    data.append('conteudo', formData.conteudo);
    data.append('perfilAvaliacaoId', formData.perfilAvaliacaoId);
    data.append('tipo', tipoGabarito);

    if (tipoGabarito === 'multipla_escolha') {
      data.append('questoes', JSON.stringify(questoes));
    }

    if (formData.arquivo) {
      data.append('arquivo', formData.arquivo);
    }

    try {
      const response = await fetch('/api/gabaritos', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: data
      });

      if (response.ok) {
        toast.success('✅ Gabarito salvo com sucesso! Você já pode usá-lo para corrigir provas.');
        setFormData({ titulo: '', conteudo: '', perfilAvaliacaoId: '', arquivo: null });
        setQuestoes([]);
        setTipoGabarito('dissertativa');
        loadData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Ocorreu um erro ao salvar o gabarito.');
      }
    } catch (error) {
      toast.error('Erro de conexão ao salvar gabarito.');
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Gabaritos</h2>
        <p className="text-gray-600">Crie e gerencie gabaritos de avaliação</p>
      </div>

      {/* Create Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Criar Novo Gabarito
          </CardTitle>
          <CardDescription>
            Defina as respostas corretas e critérios de avaliação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                placeholder="ex: Prova de Matemática - Capítulo 5"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Gabarito *</Label>
              <Select value={tipoGabarito} onValueChange={setTipoGabarito}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TIPO_GABARITO.DISSERTATIVA}>Dissertativa (Correção por IA)</SelectItem>
                  <SelectItem value={TIPO_GABARITO.MULTIPLA_ESCOLHA}>Múltipla Escolha (Correção Automática)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {tipoGabarito === 'multipla_escolha'
                  ? 'Correção automática instantânea. Defina questões com alternativas A, B, C, D.'
                  : 'Correção assistida por IA. Defina critérios de avaliação.'}
              </p>
            </div>

            {tipoGabarito === 'multipla_escolha' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Questões de Múltipla Escolha</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddQuestao}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Questão
                  </Button>
                </div>

                {questoes.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nenhuma questão adicionada. Clique em "Adicionar Questão" para começar.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {questoes.map((questao, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold">Questão {questao.numero}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveQuestao(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Resposta Correta *</Label>
                              <Select
                                value={questao.respostaCorreta || ''}
                                onValueChange={(value) => handleQuestaoChange(index, 'respostaCorreta', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="A, B, C, D..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="A">A</SelectItem>
                                  <SelectItem value="B">B</SelectItem>
                                  <SelectItem value="C">C</SelectItem>
                                  <SelectItem value="D">D</SelectItem>
                                  <SelectItem value="E">E</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Pontuação</Label>
                              <Input
                                type="number"
                                min="0.5"
                                step="0.5"
                                value={questao.pontuacao}
                                onChange={(e) => handleQuestaoChange(index, 'pontuacao', parseFloat(e.target.value) || 1)}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label>Habilidade *</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowHabilidadeDialog(true)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Nova
                              </Button>
                            </div>
                            <Select
                              value={questao.habilidadeId || ''}
                              onValueChange={(value) => handleQuestaoChange(index, 'habilidadeId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a habilidade" />
                              </SelectTrigger>
                              <SelectContent>
                                {habilidades.map((hab) => (
                                  <SelectItem key={hab.id} value={hab.id}>
                                    {hab.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="perfil">Perfil de Avaliação</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveView('perfis')}
                      className="text-blue-600 hover:text-blue-700 h-7 px-2"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Novo Perfil
                    </Button>
                  </div>
                  <Select
                    value={formData.perfilAvaliacaoId || ''}
                    onValueChange={(value) => setFormData({ ...formData, perfilAvaliacaoId: value || '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um perfil (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {perfis.map((perfil) => (
                        <SelectItem key={perfil.id} value={perfil.id}>
                          {perfil.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    O perfil de avaliação define critérios específicos para correção (deixe vazio se não quiser usar)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arquivo">Upload de Arquivo (opcional)</Label>
                  <Input
                    id="arquivo"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="cursor-pointer file:cursor-pointer"
                  />
                  <p className="text-xs text-gray-500">
                    Envie o gabarito em formato PDF, Word ou Imagem
                  </p>
                  {formData.arquivo && (
                    <p className="text-sm text-green-600">✓ {formData.arquivo.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conteudo">Conteúdo do Gabarito</Label>
                  <Textarea
                    id="conteudo"
                    placeholder="Digite as respostas corretas ou critérios de avaliação...\n\nExemplo:\n1. A resposta deve mencionar X e Y\n2. Esperado valor = 42\n3. Mínimo 3 argumentos...."
                    value={formData.conteudo}
                    onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                    rows={8}
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={creating}>
              {creating ? 'Criando...' : 'Criar Gabarito'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Dialog para criar habilidade */}
      {showHabilidadeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Nova Habilidade</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowHabilidadeDialog(false);
                    setNovaHabilidade('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome da Habilidade</Label>
                <Input
                  placeholder="ex: Interpretação de Texto"
                  value={novaHabilidade}
                  onChange={(e) => setNovaHabilidade(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateHabilidade();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateHabilidade} className="flex-1">
                  Criar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowHabilidadeDialog(false);
                    setNovaHabilidade('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Seus Gabaritos</CardTitle>
          <CardDescription>{gabaritos.length} gabarito(s) criado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {gabaritos.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Nenhum gabarito criado ainda. Crie seu primeiro gabarito acima!
            </p>
          ) : (
            <div className="space-y-3">
              {gabaritos.map((gab) => (
                <div key={gab.id} className="p-4 border border-border/50 rounded-lg hover:bg-blue-50/10 dark:hover:bg-blue-900/20 hover:border-blue-200 transition-all group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">{gab.titulo}</h3>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                          {gab.tipo === 'multipla_escolha' ? 'Múltipla Escolha' : 'Dissertativa'}
                        </span>
                        {gab.tipo === 'multipla_escolha' && gab.totalQuestoes > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({gab.totalQuestoes} questões)
                          </span>
                        )}
                      </div>
                      {gab.conteudo && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{gab.conteudo}</p>
                      )}
                      {gab.arquivoUrl && (
                        <div className="mt-2">
                          <a
                            href={gab.arquivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <UploadIcon className="h-3 w-3" />
                            Ver arquivo anexado
                          </a>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Criado em: {new Date(gab.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
