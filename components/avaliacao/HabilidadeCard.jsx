'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Award, Edit2, Trash2, Sparkles } from 'lucide-react';

/**
 * Componente para exibir e editar uma habilidade avaliada
 */
export default function HabilidadeCard({
  habilidade,
  isAcertada,
  isEditando,
  pontuacaoEditando,
  justificativaEditando,
  onEditar,
  onSalvar,
  onCancelar,
  onReavaliarIA,
  onRemover,
  onPontuacaoChange,
  onJustificativaChange
}) {
  return (
    <div
      className={`border rounded-lg p-3 ${isAcertada
          ? 'bg-green-50 border-green-200'
          : 'bg-orange-50 border-orange-200'
        }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Award className={`h-4 w-4 ${isAcertada ? 'text-green-600' : 'text-orange-600'}`} />
            <span className="font-semibold text-sm text-blue-700">{habilidade.nome || 'Habilidade'}</span>
            <Badge
              variant="outline"
              className={`text-xs ${isAcertada
                  ? 'border-green-300 text-green-700 bg-green-100'
                  : 'border-orange-300 text-orange-700 bg-orange-100'
                }`}
            >
              {isAcertada ? 'Demonstrada' : 'Precisa reforço'}
            </Badge>
          </div>
          {isEditando ? (
            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs w-20">Pontuação:</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  value={pontuacaoEditando}
                  onChange={(e) => onPontuacaoChange(parseFloat(e.target.value) || 0)}
                  className="w-20 h-7 text-xs"
                />
                <span className="text-xs text-gray-500">/ 10</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onReavaliarIA}
                  className="h-7 text-xs gap-1 ml-auto"
                >
                  <Sparkles className="h-3 w-3" />
                  Reavaliar IA
                </Button>
              </div>
              <Textarea
                value={justificativaEditando}
                onChange={(e) => onJustificativaChange(e.target.value)}
                placeholder="Justificativa..."
                rows={2}
                className="text-xs"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onSalvar}
                  className="h-7 text-xs"
                >
                  Salvar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelar}
                  className="h-7 text-xs"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-600 text-white">
                  {habilidade.pontuacao.toFixed(1)}/10
                </Badge>
                <div className="flex gap-1 ml-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onEditar}
                    className="h-6 w-6 p-0"
                    title="Editar habilidade"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onRemover}
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                    title="Remover habilidade"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {habilidade.descricaoFoco && (
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs font-semibold text-blue-700 mb-1">📌 Foco da Avaliação:</p>
                  <p className="text-xs text-blue-800">{habilidade.descricaoFoco}</p>
                </div>
              )}
              {habilidade.justificativa && (
                <p className="text-xs text-gray-700 bg-white/50 p-2 rounded">
                  <span className="font-semibold">Justificativa:</span> {habilidade.justificativa}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
