'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, Eye } from 'lucide-react';
import ValidationModal from '@/components/ValidationModal';

export default function ResultadosSection({ view }) {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [selectedAvaliacao, setSelectedAvaliacao] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvaliacoes();
  }, [view]);

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
        setAvaliacoes(data.avaliacoes || []);
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
            <CardTitle className="flex items-center justify-between">
              <span>{title}</span>
              <Badge variant="secondary">{avaliacoes.length}</Badge>
            </CardTitle>
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
                {avaliacoes.map((av) => (
                  <div 
                    key={av.id} 
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleView(av)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {view === 'pendentes' ? (
                            <Clock className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                          <h3 className="font-semibold">{av.gabaritoTitulo}</h3>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Turma:</strong> {av.turmaNome}</p>
                          <p><strong>Aluno:</strong> {av.alunoNome}</p>
                          <p><strong>Período:</strong> {av.periodo}</p>
                          {av.nota !== null && (
                            <p><strong>Nota:</strong> <span className="text-blue-600 font-semibold">{av.nota}/10</span></p>
                          )}
                        </div>
                        {view === 'pendentes' && (
                          <div className="mt-3">
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              Aguardando Validação
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <Button size="sm" variant="outline" className="gap-1">
                          <Eye className="h-3 w-3" />
                          Ver
                        </Button>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(view === 'pendentes' ? av.completedAt : av.validadoAt).toLocaleString()}
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
