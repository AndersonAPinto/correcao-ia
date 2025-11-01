'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Plus } from 'lucide-react';
import { PERIODOS_AVALIATIVOS } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function PainelSection({ onUploadSuccess }) {
  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [gabaritos, setGabaritos] = useState([]);
  
  const [selectedTurma, setSelectedTurma] = useState('');
  const [selectedAluno, setSelectedAluno] = useState('');
  const [selectedPeriodo, setSelectedPeriodo] = useState('');
  const [selectedGabarito, setSelectedGabarito] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Dialog states
  const [turmaDialogOpen, setTurmaDialogOpen] = useState(false);
  const [alunoDialogOpen, setAlunoDialogOpen] = useState(false);
  const [novaTurma, setNovaTurma] = useState('');
  const [novoAluno, setNovoAluno] = useState('');

  useEffect(() => {
    loadData();
  }, []);

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
        toast.success('Upload realizado! Processamento iniciado...');
        setSelectedFile(null);
        setSelectedTurma('');
        setSelectedAluno('');
        setSelectedPeriodo('');
        setSelectedGabarito('');
        if (onUploadSuccess) onUploadSuccess();
      } else {
        toast.error(data.error || 'Erro no upload');
      }
    } catch (error) {
      toast.error('Erro ao fazer upload');
    }
    setUploading(false);
  };

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
            Enviar Prova para Correção
          </CardTitle>
          <CardDescription>
            Selecione a turma, aluno, período e gabarito antes de enviar (Custo: 3 créditos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            {/* Turma */}
            <div className="space-y-2">
              <Label>Turma</Label>
              <div className="flex gap-2">
                <Select value={selectedTurma} onValueChange={setSelectedTurma}>
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

            {/* Aluno */}
            <div className="space-y-2">
              <Label>Aluno</Label>
              <div className="flex gap-2">
                <Select 
                  value={selectedAluno} 
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

            {/* Período */}
            <div className="space-y-2">
              <Label>Período Avaliativo</Label>
              <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
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

            {/* Gabarito */}
            <div className="space-y-2">
              <Label>Gabarito</Label>
              <Select value={selectedGabarito} onValueChange={setSelectedGabarito}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gabarito" />
                </SelectTrigger>
                <SelectContent>
                  {gabaritos.map((gab) => (
                    <SelectItem key={gab.id} value={gab.id}>
                      {gab.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {gabaritos.length === 0 && (
                <p className="text-sm text-amber-600">Nenhum gabarito criado. Crie um gabarito primeiro!</p>
              )}
            </div>

            {/* File Upload */}
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
              {uploading ? 'Enviando...' : 'Enviar para Correção (3 créditos)'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
