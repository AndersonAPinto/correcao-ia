'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Componente para adicionar nova habilidade com IA
 */
export default function AdicionarHabilidadeForm({
  habilidades,
  habilidadesAvaliacao,
  habilidadeSelecionada,
  adicionandoHabilidade,
  onHabilidadeChange,
  onAdicionar
}) {
  const [descricaoFoco, setDescricaoFoco] = useState('');
  const [habilidadeSelecionadaObj, setHabilidadeSelecionadaObj] = useState(null);

  // Atualizar habilidade selecionada e resetar descrição quando mudar
  useEffect(() => {
    if (habilidadeSelecionada) {
      const hab = habilidades.find(h => h.id === habilidadeSelecionada);
      setHabilidadeSelecionadaObj(hab);
      // Preencher com descrição padrão da habilidade se existir
      setDescricaoFoco(hab?.descricao || '');
    } else {
      setHabilidadeSelecionadaObj(null);
      setDescricaoFoco('');
    }
  }, [habilidadeSelecionada, habilidades]);
  const habilidadesDisponiveis = habilidades.filter(
    h => !habilidadesAvaliacao.some(ha => ha.habilidadeId === h.id)
  );

  if (habilidades.length === 0) {
    return (
      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-xs text-gray-600 p-2 bg-yellow-50 border border-yellow-200 rounded">
          ⚠️ Você ainda não criou nenhuma habilidade. Vá em "Habilidades" no menu para criar habilidades que poderão ser avaliadas nas provas.
        </div>
      </div>
    );
  }

  if (habilidadesDisponiveis.length === 0) {
    return (
      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-xs text-green-600 p-2 bg-green-50 border border-green-200 rounded">
          ✅ Todas as habilidades disponíveis já foram adicionadas a esta avaliação.
        </div>
      </div>
    );
  }

  const handleAdicionar = () => {
    onAdicionar(descricaoFoco);
  };

  return (
    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <Label className="text-xs font-semibold mb-2 block text-blue-700">
        Adicionar Habilidade com IA
      </Label>
      <div className="space-y-2">
        <div className="flex gap-2">
          <Select value={habilidadeSelecionada} onValueChange={onHabilidadeChange}>
            <SelectTrigger className="flex-1 h-8 text-xs text-blue-700">
              <SelectValue placeholder="Selecione uma habilidade..." />
            </SelectTrigger>
            <SelectContent>
              {habilidadesDisponiveis.map(h => (
                <SelectItem key={h.id} value={h.id}>
                  {h.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="default"
            size="sm"
            onClick={handleAdicionar}
            disabled={!habilidadeSelecionada || adicionandoHabilidade}
            className="gap-1 h-8 text-xs"
          >
            {adicionandoHabilidade ? (
              <>
                <Sparkles className="h-3 w-3 animate-spin" />
                Avaliando...
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" />
                Adicionar
              </>
            )}
          </Button>
        </div>

        {habilidadeSelecionada && (
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-700">
              Descrição / Foco da Avaliação:
            </Label>
            <Textarea
              value={descricaoFoco}
              onChange={(e) => setDescricaoFoco(e.target.value)}
              placeholder={
                habilidadeSelecionadaObj?.descricao
                  ? `Descreva o que a IA deve focar ao avaliar esta habilidade nesta prova específica...\n\nDescrição padrão da habilidade:\n${habilidadeSelecionadaObj.descricao}`
                  : 'Descreva o que a IA deve focar ao avaliar esta habilidade nesta prova específica. Ex: "Avaliar se o aluno consegue aplicar a fórmula corretamente nas questões 3, 5 e 7"'
              }
              rows={4}
              className="text-xs resize-none"
            />
            <p className="text-xs text-gray-500">
              💡 Descreva especificamente o que a IA deve verificar nesta habilidade para esta prova. Isso ajudará a IA a focar nos aspectos corretos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
