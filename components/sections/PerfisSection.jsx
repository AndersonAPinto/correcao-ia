'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Award, Sparkles, Upload as UploadIcon, Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PerfisSection() {
  const [perfis, setPerfis] = useState([]);
  const [formData, setFormData] = useState({
    nome: '',
    conteudo: '',
    arquivo: null
  });
  const [criteriosRigor, setCriteriosRigor] = useState([]);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadPerfis();
  }, []);

  const loadPerfis = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/perfis', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPerfis(data.perfis || []);
      }
    } catch (error) {
      console.error('Failed to load perfis:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, arquivo: file });
    }
  };

  const handleGerarComIA = async () => {
    if (!formData.conteudo.trim()) {
      toast.error('Digite algum conteúdo base primeiro');
      return;
    }

    setGenerating(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('/api/perfis/gerar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ conteudo: formData.conteudo })
      });

      if (response.ok) {
        const data = await response.json();
        setFormData({ ...formData, conteudo: data.perfilGerado });
        toast.success('Perfil gerado com IA!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao gerar perfil');
      }
    } catch (error) {
      toast.error('Erro ao gerar perfil com IA');
    }
    setGenerating(false);
  };

  const handleAddCriterio = () => {
    setCriteriosRigor([...criteriosRigor, {
      criterio: '',
      nivelRigor: 'moderado',
      descricao: ''
    }]);
  };

  const handleRemoveCriterio = (index) => {
    setCriteriosRigor(criteriosRigor.filter((_, i) => i !== index));
  };

  const handleCriterioChange = (index, field, value) => {
    const novos = [...criteriosRigor];
    novos[index][field] = value;
    setCriteriosRigor(novos);
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!formData.nome) {
      toast.error('Nome é obrigatório');
      return;
    }

    setCreating(true);
    const token = localStorage.getItem('token');
    const data = new FormData();
    data.append('nome', formData.nome);
    data.append('conteudo', formData.conteudo);
    if (formData.arquivo) {
      data.append('arquivo', formData.arquivo);
    }

    // Filtrar critérios válidos antes de enviar
    const criteriosValidos = criteriosRigor.filter(c => c.criterio.trim() !== '');
    if (criteriosValidos.length > 0) {
      data.append('criteriosRigor', JSON.stringify(criteriosValidos));
    }

    try {
      const response = await fetch('/api/perfis', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: data
      });

      if (response.ok) {
        toast.success('Perfil criado com sucesso!');
        setFormData({ nome: '', conteudo: '', arquivo: null });
        setCriteriosRigor([]);
        loadPerfis();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao criar perfil');
      }
    } catch (error) {
      toast.error('Erro ao criar perfil');
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Perfis de Avaliação</h2>
        <p className="text-gray-600">Defina critérios e diretrizes de correção</p>
      </div>

      {/* Create Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Criar Perfil de Avaliação
          </CardTitle>
          <CardDescription>
            Upload de documento ou digite manualmente. Use IA para gerar perfil customizado!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Perfil *</Label>
              <Input
                id="nome"
                placeholder="ex: Perfil ENEM Redação, Critérios Escola XYZ"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="arquivo-perfil">Upload de Documento (opcional)</Label>
              <Input
                id="arquivo-perfil"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
              />
              <p className="text-xs text-gray-500">
                Envie o documento com critérios de avaliação da sua escola
              </p>
              {formData.arquivo && (
                <p className="text-sm text-green-600">✓ {formData.arquivo.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="conteudo-perfil">Conteúdo do Perfil</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGerarComIA}
                  disabled={generating || !formData.conteudo.trim()}
                  className="gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  {generating ? 'Gerando...' : 'Gerar com IA'}
                </Button>
              </div>
              <Textarea
                id="conteudo-perfil"
                placeholder="Digite os critérios de avaliação, escalas de nota, aspectos a considerar...\n\nExemplo base para IA melhorar:\n- Considerar clareza e coerência\n- Avaliar uso correto de conceitos\n- Pontuar organização e estrutura"
                value={formData.conteudo}
                onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                rows={10}
              />
              <p className="text-xs text-blue-600">
                🧪 Dica: Digite um texto base e clique em "Gerar com IA" para criar um perfil profissional!
              </p>
            </div>

            {/* Critérios de Rigor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Critérios de Rigor (Opcional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCriterio}
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar Critério
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Defina níveis de rigor para diferentes critérios de avaliação (ex: Ortografia, Criatividade, Raciocínio)
              </p>

              {criteriosRigor.length > 0 && (
                <div className="space-y-3 mt-3 p-3 border rounded-lg bg-gray-50">
                  {criteriosRigor.map((criterio, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Nome do critério (ex: Ortografia, Criatividade)"
                          value={criterio.criterio}
                          onChange={(e) => handleCriterioChange(index, 'criterio', e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Select
                            value={criterio.nivelRigor || ''}
                            onValueChange={(value) => handleCriterioChange(index, 'nivelRigor', value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Selecione o nível" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rigoroso">Rigoroso</SelectItem>
                              <SelectItem value="moderado">Moderado</SelectItem>
                              <SelectItem value="flexivel">Flexível</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Descrição (opcional)"
                            value={criterio.descricao}
                            onChange={(e) => handleCriterioChange(index, 'descricao', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCriterio(index)}
                        className="mt-1"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={creating}>
              {creating ? 'Criando...' : 'Criar Perfil'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Seus Perfis</CardTitle>
          <CardDescription>{perfis.length} perfil(is) criado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {perfis.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Nenhum perfil criado ainda. Crie seu primeiro perfil acima!
            </p>
          ) : (
            <div className="space-y-3">
              {perfis.map((perfil) => (
                <div key={perfil.id} className="p-4 border border-border/50 rounded-lg hover:bg-blue-50/10 dark:hover:bg-blue-900/20 hover:border-blue-200 transition-all group">
                  <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">{perfil.nome}</h3>
                  {perfil.conteudo && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                      {perfil.conteudo}
                    </p>
                  )}
                  {perfil.criteriosRigor && perfil.criteriosRigor.length > 0 && (
                    <div className="mt-3 p-2 bg-blue-50/50 dark:bg-blue-900/20 rounded border border-blue-200/50">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2">Critérios de Rigor:</p>
                      <div className="space-y-1">
                        {perfil.criteriosRigor.map((c, idx) => (
                          <div key={idx} className="text-xs text-blue-800 dark:text-blue-400">
                            <span className="font-medium">{c.criterio}</span>:
                            <span className="ml-1 capitalize">{c.nivelRigor}</span>
                            {c.descricao && <span className="ml-1 text-blue-600 dark:text-blue-500">- {c.descricao}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {perfil.arquivoUrl && (
                    <div className="mt-2">
                      <a
                        href={perfil.arquivoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <UploadIcon className="h-3 w-3" />
                        Ver documento anexado
                      </a>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Criado em: {new Date(perfil.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
