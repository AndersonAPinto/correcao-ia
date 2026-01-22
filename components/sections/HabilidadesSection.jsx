'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Award, Plus, Trash2 } from 'lucide-react';
import { HABILIDADES_PADRAO } from '@/lib/constants';

export default function HabilidadesSection() {
  const [habilidades, setHabilidades] = useState([]);
  const [formData, setFormData] = useState({ nome: '', descricao: '' });
  const [creating, setCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [habilidadeToDelete, setHabilidadeToDelete] = useState(null);

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
      toast.error('⚠️ O nome da habilidade é obrigatório.');
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
        toast.success('✅ Habilidade criada com sucesso! Você já pode usá-la em seus gabaritos.');
        setFormData({ nome: '', descricao: '' });
        loadHabilidades();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Não foi possível criar a habilidade no momento.');
      }
    } catch (error) {
      toast.error('Erro de conexão. Verifique sua rede.');
    }
    setCreating(false);
  };

  const handleDelete = (habilidadeId) => {
    setHabilidadeToDelete(habilidadeId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!habilidadeToDelete) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/habilidades/${habilidadeToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('🗑️ Habilidade excluída com sucesso.');
        loadHabilidades();
      } else {
        toast.error('Ocorreu um erro ao tentar excluir a habilidade.');
      }
    } catch (error) {
      toast.error('Erro de conexão ao excluir habilidade.');
    } finally {
      setShowDeleteConfirm(false);
      setHabilidadeToDelete(null);
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
      toast.success(`✨ ${criadas} habilidades padrão foram adicionadas com sucesso!`);
      loadHabilidades();
    }
    if (erros > 0) {
      toast.warning(`ℹ️ ${erros} habilidades já existiam e foram puladas.`);
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
                <div key={hab.id} className="p-4 border border-border/50 rounded-lg hover:bg-blue-50/10 dark:hover:bg-blue-900/20 hover:border-blue-200 transition-all flex items-start justify-between group">
                  <div className="flex-1">
                    <h3 className="font-semibold group-hover:text-blue-600 transition-colors">{hab.nome}</h3>
                    {hab.descricao && (
                      <p className="text-sm text-muted-foreground mt-1">{hab.descricao}</p>
                    )}
                    <p className="text-xs text-muted-foreground/50 mt-2 italic">
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

      {/* Dialog de confirmação para remover habilidade */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta habilidade permanentemente?
            </AlertDialogDescription>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteConfirm(false);
              setHabilidadeToDelete(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

