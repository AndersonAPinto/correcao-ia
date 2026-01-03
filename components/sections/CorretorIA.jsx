'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Upload, Plus, X, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { PERIODOS_AVALIATIVOS } from '@/lib/constants';
import PaywallModal from '@/components/PaywallModal';
import { FeaturesSectionWithHoverEffects } from '@/components/ui/feature-section-with-hover-effects';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function CorretorIASection({ onUploadSuccess, setActiveView }) {
  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [gabaritos, setGabaritos] = useState([]);

  const [selectedTurma, setSelectedTurma] = useState('');
  const [selectedAluno, setSelectedAluno] = useState('');
  const [selectedPeriodo, setSelectedPeriodo] = useState('');
  const [selectedGabarito, setSelectedGabarito] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]); // Para upload em lote
  const [uploadMode, setUploadMode] = useState('single'); // 'single' ou 'batch'
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]); // Fila de uploads
  const [planoStatus, setPlanoStatus] = useState(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Dialog states
  const [turmaDialogOpen, setTurmaDialogOpen] = useState(false);
  const [alunoDialogOpen, setAlunoDialogOpen] = useState(false);
  const [novaTurma, setNovaTurma] = useState('');
  const [novoAluno, setNovoAluno] = useState('');

  useEffect(() => {
    loadData();
    loadPlanoStatus();
  }, []);

  const loadPlanoStatus = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/plano/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPlanoStatus(data);
      }
    } catch (error) {
      console.error('Failed to load plano status:', error);
    }
  };

  useEffect(() => {
    if (selectedTurma) {
      loadAlunos(selectedTurma);
    } else {
      setAlunos([]);
      setSelectedAluno('');
    }
  }, [selectedTurma]);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [turmasRes, gabaritosRes] = await Promise.all([
        fetch('/api/turmas', { headers }),
        fetch('/api/gabaritos', { headers })
      ]);

      if (turmasRes.ok) {
        const data = await turmasRes.json();
        setTurmas(data.turmas || []);
      }

      if (gabaritosRes.ok) {
        const data = await gabaritosRes.json();
        setGabaritos(data.gabaritos || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadAlunos = async (turmaId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/alunos/${turmaId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAlunos(data.alunos || []);
      }
    } catch (error) {
      console.error('Failed to load alunos:', error);
    }
  };

  const handleCreateTurma = async () => {
    if (!novaTurma.trim()) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/turmas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nome: novaTurma })
      });

      if (response.ok) {
        toast.success('Turma criada com sucesso!');
        setNovaTurma('');
        setTurmaDialogOpen(false);
        loadData();
      } else {
        toast.error('Erro ao criar turma');
      }
    } catch (error) {
      toast.error('Erro ao criar turma');
    }
  };

  const handleCreateAluno = async () => {
    if (!novoAluno.trim() || !selectedTurma) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/alunos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          turmaId: selectedTurma,
          nome: novoAluno
        })
      });

      if (response.ok) {
        toast.success('Aluno adicionado com sucesso!');
        setNovoAluno('');
        setAlunoDialogOpen(false);
        loadAlunos(selectedTurma);
      } else {
        toast.error('Erro ao adicionar aluno');
      }
    } catch (error) {
      toast.error('Erro ao adicionar aluno');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Criar itens da fila para cada arquivo
      const queueItems = files.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        file,
        fileName: file.name,
        status: 'pending', // pending, uploading, completed, error
        progress: 0,
        alunoId: selectedAluno, // Usar mesmo aluno para todos (pode melhorar depois)
        error: null,
        assessmentId: null,
        nota: null
      }));
      setSelectedFiles(files);
      setUploadQueue(queueItems);
    }
  };

  const removeFileFromQueue = (id) => {
    setUploadQueue(queue => queue.filter(item => item.id !== id));
    setSelectedFiles(files => {
      const item = uploadQueue.find(q => q.id === id);
      if (item) {
        return files.filter(f => f.name !== item.fileName);
      }
      return files;
    });
  };

  const processUploadQueue = async () => {
    const pendingItems = uploadQueue.filter(q => q.status === 'pending');
    if (pendingItems.length === 0) {
      toast.info('Nenhum arquivo pendente para upload');
      return;
    }

    setUploading(true);
    const token = localStorage.getItem('token');
    let completed = 0;
    let errors = 0;

    // Verificar limite antes de processar
    const planoCheck = await fetch('/api/plano/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (planoCheck.ok) {
      const planoData = await planoCheck.json();
      if (!planoData.allowed) {
        setPlanoStatus(planoData);
        setPaywallOpen(true);
        setUploading(false);
        toast.error('Limite mensal atingido. Faça upgrade para continuar.');
        return;
      }
    }

    // Processar cada item da fila sequencialmente
    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];

      // Atualizar status para uploading
      setUploadQueue(prev => prev.map(q =>
        q.id === item.id ? { ...q, status: 'uploading', progress: 0 } : q
      ));

      try {
        const formData = new FormData();
        formData.append('image', item.file);
        formData.append('gabaritoId', selectedGabarito);
        formData.append('turmaId', selectedTurma);
        formData.append('alunoId', item.alunoId || selectedAluno);
        formData.append('periodo', selectedPeriodo);

        // Simular progresso
        setUploadQueue(prev => prev.map(q =>
          q.id === item.id ? { ...q, progress: 30 } : q
        ));

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        setUploadQueue(prev => prev.map(q =>
          q.id === item.id ? { ...q, progress: 70 } : q
        ));

        const data = await response.json();

        if (response.ok) {
          completed++;
          setUploadQueue(prev => prev.map(q =>
            q.id === item.id ? {
              ...q,
              status: 'completed',
              progress: 100,
              assessmentId: data.assessmentId,
              nota: data.nota,
              correcaoAutomatica: data.correcaoAutomatica
            } : q
          ));
        } else {
          errors++;
          setUploadQueue(prev => prev.map(q =>
            q.id === item.id ? {
              ...q,
              status: 'error',
              error: data.error || 'Erro no upload',
              progress: 0
            } : q
          ));
        }
      } catch (error) {
        errors++;
        setUploadQueue(prev => prev.map(q =>
          q.id === item.id ? {
            ...q,
            status: 'error',
            error: error.message || 'Erro ao fazer upload',
            progress: 0
          } : q
        ));
      }

      // Pequeno delay entre uploads para não sobrecarregar
      if (i < pendingItems.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setUploading(false);

    // Notificação final
    if (completed > 0 && errors === 0) {
      toast.success(`${completed} prova(s) enviada(s) com sucesso!`);
      if (onUploadSuccess) onUploadSuccess();
    } else if (completed > 0 && errors > 0) {
      toast.warning(`${completed} sucesso, ${errors} erro(s)`);
    } else if (errors > 0) {
      toast.error(`${errors} erro(s) no upload`);
    }

    // Recarregar status do plano após uploads
    loadPlanoStatus();

    // Limpar após 5 segundos se tudo foi concluído
    if (errors === 0) {
      setTimeout(() => {
        setSelectedFiles([]);
        setUploadQueue([]);
        setSelectedTurma('');
        setSelectedAluno('');
        setSelectedPeriodo('');
        setSelectedGabarito('');
      }, 5000);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedFile || !selectedGabarito || !selectedTurma || !selectedAluno || !selectedPeriodo) {
      toast.error('Preencha todos os campos');
      return;
    }

    setUploading(true);
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('gabaritoId', selectedGabarito);
    formData.append('turmaId', selectedTurma);
    formData.append('alunoId', selectedAluno);
    formData.append('periodo', selectedPeriodo);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        // Verificar se foi correção automática (múltipla escolha)
        if (data.correcaoAutomatica) {
          toast.success(`Correção automática concluída! Nota: ${data.nota?.toFixed(2) || 'N/A'}/10`, {
            duration: 5000
          });
          if (onUploadSuccess) onUploadSuccess();
        } else {
          toast.success('Upload realizado! Processamento iniciado...');
        }
        setSelectedFile(null);
        setSelectedTurma('');
        setSelectedAluno('');
        setSelectedPeriodo('');
        setSelectedGabarito('');
        if (!data.correcaoAutomatica && onUploadSuccess) {
          onUploadSuccess();
        }
      } else {
        // Verificar se é erro de limite de plano
        if (response.status === 403 && data.planoStatus) {
          setPlanoStatus(data.planoStatus);
          setPaywallOpen(true);
        }
        toast.error(data.error || 'Erro no upload');
      }
    } catch (error) {
      toast.error('Erro ao fazer upload');
    }
    setUploading(false);
  };

  const totalProgress = uploadQueue.length > 0
    ? (uploadQueue.filter(q => q.status === 'completed').length / uploadQueue.length) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Painel de Correção</h2>
        <p className="text-gray-600">Envie provas de alunos para correção automática</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Enviar Prova(s) para Correção
          </CardTitle>
          <CardDescription>
            Selecione a turma, aluno, período e gabarito antes de enviar (Custo: 3 créditos por prova)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={uploadMode} onValueChange={setUploadMode} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Upload Único</TabsTrigger>
              <TabsTrigger value="batch">Upload em Lote</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4 mt-4">
              <form onSubmit={handleUpload} className="space-y-4">
                {/* Campos comuns */}
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <div className="flex gap-2">
                    <Select value={selectedTurma || ''} onValueChange={setSelectedTurma}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione a turma" />
                      </SelectTrigger>
                      <SelectContent>
                        {turmas.map((turma) => (
                          <SelectItem key={turma.id} value={turma.id}>
                            {turma.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Dialog open={turmaDialogOpen} onOpenChange={setTurmaDialogOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Criar Nova Turma</DialogTitle>
                          <DialogDescription>
                            Digite o nome da turma (ex: 3º Ano A, 2024)
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            placeholder="Nome da turma"
                            value={novaTurma}
                            onChange={(e) => setNovaTurma(e.target.value)}
                          />
                          <Button onClick={handleCreateTurma} className="w-full">
                            Criar Turma
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {turmas.length === 0 && (
                    <p className="text-sm text-amber-600">Nenhuma turma criada. Crie uma turma primeiro!</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Aluno</Label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedAluno || ''}
                      onValueChange={setSelectedAluno}
                      disabled={!selectedTurma}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione o aluno" />
                      </SelectTrigger>
                      <SelectContent>
                        {alunos.map((aluno) => (
                          <SelectItem key={aluno.id} value={aluno.id}>
                            {aluno.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Dialog open={alunoDialogOpen} onOpenChange={setAlunoDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={!selectedTurma}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Aluno</DialogTitle>
                          <DialogDescription>
                            Digite o nome completo do aluno
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            placeholder="Nome do aluno"
                            value={novoAluno}
                            onChange={(e) => setNovoAluno(e.target.value)}
                          />
                          <Button onClick={handleCreateAluno} className="w-full">
                            Adicionar Aluno
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Período Avaliativo</Label>
                  <Select value={selectedPeriodo || ''} onValueChange={setSelectedPeriodo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIODOS_AVALIATIVOS.map((periodo) => (
                        <SelectItem key={periodo} value={periodo}>
                          {periodo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Gabarito</Label>
                  <Select value={selectedGabarito || ''} onValueChange={setSelectedGabarito}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o gabarito" />
                    </SelectTrigger>
                    <SelectContent>
                      {gabaritos.map((gab) => (
                        <SelectItem key={gab.id} value={gab.id}>
                          {gab.titulo} {gab.tipo === 'multipla_escolha' && '(Correção Automática)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {gabaritos.length === 0 && (
                    <p className="text-sm text-amber-600">Nenhum gabarito criado. Crie um gabarito primeiro!</p>
                  )}
                  {selectedGabarito && (() => {
                    const gab = gabaritos.find(g => g.id === selectedGabarito);
                    return gab?.tipo === 'multipla_escolha' ? (
                      <p className="text-sm text-green-600">
                        ✓ Gabarito de múltipla escolha - Correção será automática e instantânea!
                      </p>
                    ) : null;
                  })()}
                </div>

                <div className="space-y-2">
                  <Label>Imagem da Prova</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  {selectedFile && (
                    <p className="text-sm text-green-600">✓ {selectedFile.name}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={uploading || !selectedFile || !selectedGabarito || !selectedTurma || !selectedAluno || !selectedPeriodo}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    'Enviar para Correção (3 créditos)'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="batch" className="space-y-4 mt-4">
              {/* Campos comuns para lote */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <div className="flex gap-2">
                    <Select value={selectedTurma || ''} onValueChange={setSelectedTurma}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione a turma" />
                      </SelectTrigger>
                      <SelectContent>
                        {turmas.map((turma) => (
                          <SelectItem key={turma.id} value={turma.id}>
                            {turma.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Dialog open={turmaDialogOpen} onOpenChange={setTurmaDialogOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Criar Nova Turma</DialogTitle>
                          <DialogDescription>
                            Digite o nome da turma (ex: 3º Ano A, 2024)
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            placeholder="Nome da turma"
                            value={novaTurma}
                            onChange={(e) => setNovaTurma(e.target.value)}
                          />
                          <Button onClick={handleCreateTurma} className="w-full">
                            Criar Turma
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Aluno (para todas as provas)</Label>
                  <Select
                    value={selectedAluno || ''}
                    onValueChange={setSelectedAluno}
                    disabled={!selectedTurma}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o aluno" />
                    </SelectTrigger>
                    <SelectContent>
                      {alunos.map((aluno) => (
                        <SelectItem key={aluno.id} value={aluno.id}>
                          {aluno.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Todas as provas serão associadas a este aluno
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Período Avaliativo</Label>
                  <Select value={selectedPeriodo || ''} onValueChange={setSelectedPeriodo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIODOS_AVALIATIVOS.map((periodo) => (
                        <SelectItem key={periodo} value={periodo}>
                          {periodo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Gabarito</Label>
                  <Select value={selectedGabarito || ''} onValueChange={setSelectedGabarito}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o gabarito" />
                    </SelectTrigger>
                    <SelectContent>
                      {gabaritos.map((gab) => (
                        <SelectItem key={gab.id} value={gab.id}>
                          {gab.titulo} {gab.tipo === 'multipla_escolha' && '(Correção Automática)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Imagens das Provas (Múltiplas)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFilesChange}
                    disabled={uploading}
                  />
                  <p className="text-xs text-gray-500">
                    Selecione múltiplas imagens para processar em lote
                  </p>
                </div>

                {/* Lista de arquivos selecionados */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Arquivos Selecionados ({selectedFiles.length})</Label>
                    <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="truncate flex-1">{file.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Barra de progresso geral */}
                {uploadQueue.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progresso Geral</span>
                      <span>{Math.round(totalProgress)}%</span>
                    </div>
                    <Progress value={totalProgress} />
                    <p className="text-xs text-gray-500">
                      {uploadQueue.filter(q => q.status === 'completed').length} de {uploadQueue.length} concluído(s)
                    </p>
                  </div>
                )}

                {/* Lista de uploads na fila */}
                {uploadQueue.length > 0 && (
                  <div className="space-y-2">
                    <Label>Status dos Uploads</Label>
                    <div className="border rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                      {uploadQueue.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 p-2 border rounded bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {item.status === 'completed' && (
                                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                              )}
                              {item.status === 'uploading' && (
                                <Clock className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
                              )}
                              {item.status === 'error' && (
                                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                              )}
                              {item.status === 'pending' && (
                                <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              )}
                              <span className="text-sm font-medium truncate">{item.fileName}</span>
                            </div>
                            {item.status === 'uploading' && (
                              <Progress value={item.progress} className="h-1 mt-1" />
                            )}
                            {item.status === 'completed' && item.correcaoAutomatica && item.nota && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ Correção automática: {item.nota.toFixed(2)}/10
                              </p>
                            )}
                            {item.status === 'error' && (
                              <p className="text-xs text-red-600 mt-1">{item.error}</p>
                            )}
                          </div>
                          {item.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFileFromQueue(item.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={processUploadQueue}
                  className="w-full"
                  disabled={
                    uploading ||
                    selectedFiles.length === 0 ||
                    !selectedGabarito ||
                    !selectedTurma ||
                    !selectedAluno ||
                    !selectedPeriodo ||
                    uploadQueue.length === 0
                  }
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processando {uploadQueue.filter(q => q.status === 'uploading').length} de {uploadQueue.length}...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Enviar {selectedFiles.length} Prova(s) ({selectedFiles.length * 3} créditos)
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Paywall Modal */}
      {planoStatus && (
        <PaywallModal
          open={paywallOpen}
          onOpenChange={setPaywallOpen}
          planoStatus={planoStatus}
        />
      )}

      {/* Plano Status Banner */}
      {planoStatus && planoStatus.plano === 'free' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Plano Gratuito</p>
                <p className="text-xs text-gray-600">
                  {planoStatus.usado} de {planoStatus.limites.provasPorMes} provas usadas este mês
                  {planoStatus.restante > 0 && ` • ${planoStatus.restante} restantes`}
                </p>
              </div>
              <Button size="sm" onClick={() => setPaywallOpen(true)}>
                Upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
