'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText, Upload as UploadIcon } from 'lucide-react';

export default function GabaritosSection() {
  const [gabaritos, setGabaritos] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [formData, setFormData] = useState({
    titulo: '',
    conteudo: '',
    perfilAvaliacaoId: '',
    arquivo: null
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [gabaritosRes, perfisRes] = await Promise.all([
        fetch('/api/gabaritos', { headers }),
        fetch('/api/perfis', { headers })
      ]);

      if (gabaritosRes.ok) {
        const data = await gabaritosRes.json();
        setGabaritos(data.gabaritos || []);
      }

      if (perfisRes.ok) {
        const data = await perfisRes.json();
        setPerfis(data.perfis || []);
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

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!formData.titulo) {
      toast.error('Título é obrigatório');
      return;
    }

    setCreating(true);
    const token = localStorage.getItem('token');
    const data = new FormData();
    data.append('titulo', formData.titulo);
    data.append('conteudo', formData.conteudo);
    data.append('perfilAvaliacaoId', formData.perfilAvaliacaoId);
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
        toast.success('Gabarito criado com sucesso!');
        setFormData({ titulo: '', conteudo: '', perfilAvaliacaoId: '', arquivo: null });
        loadData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao criar gabarito');
      }
    } catch (error) {
      toast.error('Erro ao criar gabarito');
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
              <Label htmlFor="perfil">Perfil de Avaliação</Label>
              <Select 
                value={formData.perfilAvaliacaoId || undefined} 
                onValueChange={(value) => setFormData({ ...formData, perfilAvaliacaoId: value })}
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

            <Button type="submit" className="w-full" disabled={creating}>
              {creating ? 'Criando...' : 'Criar Gabarito'}
            </Button>
          </form>
        </CardContent>
      </Card>

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
                <div key={gab.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <h3 className="font-semibold text-lg">{gab.titulo}</h3>
                  {gab.conteudo && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{gab.conteudo}</p>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
