'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Award, Sparkles, Upload as UploadIcon, Plus, X, Edit2, Save, Eye, Bold, Italic, List, Heading2, Heading3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [expandedPerfis, setExpandedPerfis] = useState(new Set());
  const [editingPerfil, setEditingPerfil] = useState(null);
  const [editFormData, setEditFormData] = useState({
    nome: '',
    conteudo: '',
    criteriosRigor: []
  });
  const [saving, setSaving] = useState(false);
  const [contentEditableRef, setContentEditableRef] = useState(null);

  // Função para inserir markdown no cursor
  const insertMarkdown = (before, after = '', placeholder = 'texto') => {
    const textarea = document.getElementById('edit-conteudo');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = editFormData.conteudo;
    const selectedText = text.substring(start, end);

    const beforeText = text.substring(0, start);
    const afterText = text.substring(end);

    let newText;
    if (selectedText) {
      // Se há texto selecionado, envolver com a formatação
      newText = beforeText + before + selectedText + after + afterText;
    } else {
      // Se não há seleção, inserir placeholder
      newText = beforeText + before + placeholder + after + afterText;
    }

    setEditFormData({ ...editFormData, conteudo: newText });

    // Restaurar foco e posição do cursor
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + (selectedText || placeholder).length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  useEffect(() => {
    loadPerfis();
  }, []);

  const loadPerfis = async () => {
    try {
      const response = await fetch('/api/perfis', { credentials: 'include' });

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

    try {
      const response = await fetch('/api/perfis/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
        credentials: 'include',
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

  const handleEdit = (perfil) => {
    setEditingPerfil(perfil);
    setEditFormData({
      nome: perfil.nome,
      conteudo: perfil.conteudo || '',
      criteriosRigor: perfil.criteriosRigor || []
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPerfil || !editFormData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/perfis?id=${editingPerfil.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nome: editFormData.nome,
          conteudo: editFormData.conteudo,
          criteriosRigor: editFormData.criteriosRigor
        })
      });

      if (response.ok) {
        toast.success('Perfil atualizado com sucesso!');
        setEditingPerfil(null);
        loadPerfis();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao atualizar perfil');
      }
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    }
    setSaving(false);
  };

  // Função para extrair apenas o "Objetivo" do conteúdo (preservando markdown)
  const extractObjetivo = (text) => {
    if (!text) return '';

    // Procurar por "**Objetivo:**" ou "Objetivo:" (com ou sem markdown)
    const objetivoPatterns = [
      /\*\*Objetivo\*\*:\s*([^\n]+(?:\n(?!\*\*|##|###|$)[^\n]+)*)/i,
      /Objetivo:\s*([^\n]+(?:\n(?!\*\*|##|###|$)[^\n]+)*)/i,
      /\*\*Objetivo\*\*[:\s]+([^\n]+(?:\n(?!\*\*|##|###|$)[^\n]+)*)/i
    ];

    for (const pattern of objetivoPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let objetivo = match[1].trim();

        // NÃO limpar markdown - preservar para renderização
        // Parar na primeira linha vazia ou próximo título
        const lines = objetivo.split('\n');
        let result = [];
        for (const line of lines) {
          if (line.trim() === '' || line.trim().startsWith('##') || line.trim().startsWith('###')) {
            break;
          }
          result.push(line);
        }
        objetivo = result.join('\n').trim();

        // Limitar a 300 caracteres (mas preservando markdown)
        if (objetivo.length > 300) {
          // Tentar cortar em um ponto seguro (final de palavra)
          let cutPoint = 300;
          while (cutPoint > 0 && objetivo[cutPoint] !== ' ' && objetivo[cutPoint] !== '\n') {
            cutPoint--;
          }
          objetivo = objetivo.substring(0, cutPoint || 300) + '...';
        }

        if (objetivo) return objetivo;
      }
    }

    // Se não encontrar "Objetivo", retornar primeiras linhas (até 300 chars, preservando markdown)
    const lines = text.split('\n').filter(l => l.trim() && !l.trim().startsWith('##'));
    if (lines.length > 0) {
      let preview = lines.slice(0, 2).join('\n').trim();
      if (preview.length > 300) {
        let cutPoint = 300;
        while (cutPoint > 0 && preview[cutPoint] !== ' ' && preview[cutPoint] !== '\n') {
          cutPoint--;
        }
        preview = preview.substring(0, cutPoint || 300) + '...';
      }
      return preview;
    }

    return '';
  };

  // Função para renderizar markdown de forma mais bonita
  const renderMarkdown = (text) => {
    if (!text) return null;

    // Dividir em linhas para processar melhor
    const lines = text.split('\n');
    const result = [];
    let inList = false;
    let listItems = [];

    const closeList = () => {
      if (inList && listItems.length > 0) {
        result.push(`<ul class="list-disc ml-6 mb-3 space-y-1 text-muted-foreground">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Títulos ##
      if (trimmed.startsWith('## ')) {
        closeList();
        const title = trimmed.substring(3).trim();
        // Processar negrito e itálico no título
        let processedTitle = title
          .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>')
          .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
        result.push(`<h2 class="text-lg font-bold mt-5 mb-3 text-foreground border-b border-border/30 pb-2">${processedTitle}</h2>`);
        return;
      }

      // Subtítulos ###
      if (trimmed.startsWith('### ')) {
        closeList();
        const subtitle = trimmed.substring(4).trim();
        let processedSubtitle = subtitle
          .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
          .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
        result.push(`<h3 class="text-base font-semibold mt-4 mb-2 text-foreground">${processedSubtitle}</h3>`);
        return;
      }

      // Listas com - ou *
      if (trimmed.match(/^[\-\*]\s+/)) {
        if (!inList) {
          inList = true;
        }
        const item = trimmed.replace(/^[\-\*]\s+/, '').trim();
        // Processar negrito e itálico dentro do item
        let processedItem = item
          .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
          .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
        listItems.push(`<li class="mb-1">${processedItem}</li>`);
        return;
      }

      // Listas numeradas
      if (trimmed.match(/^\d+\.\s+/)) {
        if (!inList) {
          inList = true;
        }
        const item = trimmed.replace(/^\d+\.\s+/, '').trim();
        let processedItem = item
          .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
          .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
        listItems.push(`<li class="mb-1">${processedItem}</li>`);
        return;
      }

      // Linha vazia - fechar lista se estiver aberta
      if (trimmed === '') {
        closeList();
        return;
      }

      // Parágrafo normal
      closeList();
      let processedLine = trimmed
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em class="italic text-muted-foreground">$1</em>');

      if (processedLine) {
        result.push(`<p class="mb-3 text-muted-foreground leading-relaxed">${processedLine}</p>`);
      }
    });

    // Fechar lista se ainda estiver aberta
    closeList();

    return result.join('');
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
                className="cursor-pointer file:cursor-pointer"
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
              {perfis.map((perfil) => {
                const isExpanded = expandedPerfis.has(perfil.id);
                const toggleExpand = () => {
                  const newExpanded = new Set(expandedPerfis);
                  if (isExpanded) {
                    newExpanded.delete(perfil.id);
                  } else {
                    newExpanded.add(perfil.id);
                  }
                  setExpandedPerfis(newExpanded);
                };

                const objetivoPreview = extractObjetivo(perfil.conteudo || '');

                return (
                  <div key={perfil.id} className="p-5 border border-border/50 rounded-lg hover:bg-blue-50/10 dark:hover:bg-blue-900/20 hover:border-blue-200 transition-all group bg-card">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">{perfil.nome}</h3>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(perfil)}
                          className="text-xs h-7"
                          title="Editar perfil"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        {perfil.conteudo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleExpand}
                            className="text-xs h-7"
                          >
                            {isExpanded ? 'Recolher' : 'Expandir'}
                          </Button>
                        )}
                      </div>
                    </div>
                    {perfil.conteudo && (
                      <div className="mt-2">
                        {!isExpanded && objetivoPreview ? (
                          <div className="text-sm text-muted-foreground">
                            <p className="font-semibold text-foreground mb-1">Objetivo:</p>
                            <div
                              className="leading-relaxed max-w-none"
                              dangerouslySetInnerHTML={{ __html: renderMarkdown(objetivoPreview) }}
                            />
                          </div>
                        ) : (
                          <div
                            className="text-sm text-muted-foreground max-w-none"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(perfil.conteudo) }}
                          />
                        )}
                      </div>
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
                    <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-border/30">
                      Criado em: {new Date(perfil.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={!!editingPerfil} onOpenChange={(open) => !open && setEditingPerfil(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Perfil de Avaliação</DialogTitle>
            <DialogDescription>
              Atualize as informações do perfil. Use a aba "Visualizar" para ver como ficará renderizado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4 flex-1 overflow-hidden flex flex-col">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome do Perfil *</Label>
              <Input
                id="edit-nome"
                value={editFormData.nome}
                onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <Label>Conteúdo do Perfil</Label>
              <div className="flex-1 flex flex-col min-h-0 border rounded-md overflow-hidden">
                {/* Barra de Ferramentas */}
                <div className="flex items-center gap-1 p-2 border-b bg-muted/50 flex-wrap">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMarkdown('## ', '', 'Título Principal')}
                    className="h-8 gap-1"
                    title="Título Principal"
                  >
                    <Heading2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Título</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMarkdown('### ', '', 'Subtítulo')}
                    className="h-8 gap-1"
                    title="Subtítulo"
                  >
                    <Heading3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Subtítulo</span>
                  </Button>
                  <div className="w-px h-6 bg-border mx-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMarkdown('**', '**')}
                    className="h-8 gap-1"
                    title="Negrito"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMarkdown('*', '*')}
                    className="h-8 gap-1"
                    title="Itálico"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-6 bg-border mx-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const textarea = document.getElementById('edit-conteudo');
                      if (!textarea) return;
                      const start = textarea.selectionStart;
                      const text = editFormData.conteudo;
                      const beforeText = text.substring(0, start);
                      const afterText = text.substring(start);
                      const newText = beforeText + '- ' + afterText;
                      setEditFormData({ ...editFormData, conteudo: newText });
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + 2, start + 2);
                      }, 0);
                    }}
                    className="h-8 gap-1"
                    title="Lista"
                  >
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">Lista</span>
                  </Button>
                </div>

                {/* Layout: Editor e Preview lado a lado */}
                <div className="flex-1 flex gap-2 p-2 min-h-0">
                  {/* Editor (esquerda) */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <Label className="text-xs mb-1 text-muted-foreground">📝 Editar Conteúdo</Label>
                    <ScrollArea className="flex-1 border rounded-md bg-background">
                      <Textarea
                        id="edit-conteudo"
                        value={editFormData.conteudo}
                        onChange={(e) => setEditFormData({ ...editFormData, conteudo: e.target.value })}
                        className="min-h-[400px] border-0 resize-none focus-visible:ring-0 text-sm font-normal leading-relaxed"
                        placeholder="Digite seu conteúdo aqui... 

💡 Dica: Use os botões acima para formatar o texto:
• Clique em 'Título' ou 'Subtítulo' para criar cabeçalhos
• Selecione texto e clique em 'Negrito' ou 'Itálico' para formatar
• Clique em 'Lista' para criar uma lista

A visualização ao lado mostra como ficará o texto formatado."
                      />
                    </ScrollArea>
                  </div>

                  {/* Preview (direita) */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <Label className="text-xs mb-1 text-muted-foreground">👁️ Visualização</Label>
                    <ScrollArea className="flex-1 border rounded-md p-4 bg-card">
                      {editFormData.conteudo ? (
                        <div
                          className="text-sm text-muted-foreground max-w-none prose prose-sm dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(editFormData.conteudo) }}
                        />
                      ) : (
                        <div className="text-center py-8">
                          <Eye className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                          <p className="text-gray-400 italic text-sm">A visualização aparecerá aqui enquanto você digita...</p>
                          <p className="text-xs text-gray-500 mt-2">Use os botões de formatação acima para ver o resultado</p>
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Critérios de Rigor</Label>
              {editFormData.criteriosRigor.length > 0 ? (
                <div className="space-y-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  {editFormData.criteriosRigor.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-blue-600 dark:text-blue-400">{c.criterio}:</span>
                      <span className="capitalize text-orange-600 dark:text-orange-400">{c.nivelRigor}</span>
                      {c.descricao && <span className="text-gray-600 dark:text-gray-400">- {c.descricao}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nenhum critério de rigor definido</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEditingPerfil(null)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
