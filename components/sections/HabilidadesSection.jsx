'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Award, Plus, Trash2 } from 'lucide-react';
import { HABILIDADES_PADRAO } from '@/lib/constants';

export default function HabilidadesSection() {
  const [habilidades, setHabilidades] = useState([]);
  const [formData, setFormData] = useState({ nome: '', descricao: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadHabilidades();
  }, []);

  const loadHabilidades = async () => {
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
      console.error('Failed to load habilidades:', error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error('Nome da habilidade é obrigatório');
      return;
    }

    setCreating(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/habilidades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Habilidade criada com sucesso!');
        setFormData({ nome: '', descricao: '' });
        loadHabilidades();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao criar habilidade');
      }
    } catch (error) {
      toast.error('Erro ao criar habilidade');
    }
    setCreating(false);
  };

  const handleDelete = async (habilidadeId) => {
    if (!confirm('Tem certeza que deseja excluir esta habilidade?')) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/habilidades/${habilidadeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Habilidade excluída!');
        loadHabilidades();
      } else {
        toast.error('Erro ao excluir habilidade');
      }
    } catch (error) {
      toast.error('Erro ao excluir habilidade');
    }
  };

  const handleCreatePadrao = async () => {
    const token = localStorage.getItem('token');
    let criadas = 0;
    let erros = 0;

    for (const nome of HABILIDADES_PADRAO) {
      try {
        const response = await fetch('/api/habilidades', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ nome })
        });

        if (response.ok) {
          criadas++;
        } else {
          erros++;
        }
      } catch (error) {
        erros++;
      }
    }

    if (criadas > 0) {
      toast.success(`${criadas} habilidade(s) criada(s)!`);
      loadHabilidades();
    }
    if (erros > 0) {
      toast.warning(`${erros} habilidade(s) já existiam`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Habilidades</h2>
        <p className="text-gray-600">Gerencie as habilidades usadas para categorizar questões</p>
      </div>

      {/* Create Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Criar Nova Habilidade
          </CardTitle>
          <CardDescription>
            Defina habilidades que serão associadas às questões dos gabaritos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Habilidade *</Label>
              <Input
                id="nome"
                placeholder="ex: Interpretação de Texto, Cálculo, Geometria..."
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva brevemente esta habilidade..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={creating} className="flex-1">
                {creating ? 'Criando...' : 'Criar Habilidade'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCreatePadrao}
              >
                Usar Padrões
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Suas Habilidades</CardTitle>
          <CardDescription>{habilidades.length} habilidade(s) criada(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {habilidades.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Nenhuma habilidade criada ainda.</p>
              <Button variant="outline" onClick={handleCreatePadrao}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Habilidades Padrão
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {habilidades.map((hab) => (
                <div key={hab.id} className="p-4 border rounded-lg hover:bg-gray-50 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{hab.nome}</h3>
                    {hab.descricao && (
                      <p className="text-sm text-gray-600 mt-1">{hab.descricao}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Criada em: {new Date(hab.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(hab.id)}
                    className="ml-2"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

