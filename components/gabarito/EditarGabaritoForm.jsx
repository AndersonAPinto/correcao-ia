'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Upload as UploadIcon, X } from 'lucide-react';

export default function EditarGabaritoForm({
    gabarito,
    formData,
    onFormDataChange,
    onSave,
    onCancel,
    saving
}) {
    const [novoArquivo, setNovoArquivo] = useState(null);
    const [removerArquivo, setRemoverArquivo] = useState(false);

    // Resetar estado quando o gabarito mudar
    useEffect(() => {
        if (gabarito) {
            setNovoArquivo(null);
            setRemoverArquivo(false);
        }
    }, [gabarito?.id]);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setNovoArquivo(file);
            setRemoverArquivo(false);
        }
    };

    const handleRemoveFile = () => {
        setNovoArquivo(null);
        setRemoverArquivo(true);
    };

    const handleSave = () => {
        onSave({
            ...formData,
            novoArquivo: novoArquivo,
            removerArquivo: removerArquivo
        });
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="edit-titulo">Título *</Label>
                <Input
                    id="edit-titulo"
                    value={formData.titulo}
                    onChange={(e) => onFormDataChange({ ...formData, titulo: e.target.value })}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="edit-conteudo">Conteúdo do Gabarito</Label>
                <Textarea
                    id="edit-conteudo"
                    value={formData.conteudo}
                    onChange={(e) => onFormDataChange({ ...formData, conteudo: e.target.value })}
                    rows={8}
                />
            </div>

            {/* Upload de Arquivo */}
            <div className="space-y-2">
                <Label htmlFor="edit-arquivo">Arquivo Anexado</Label>

                {/* Arquivo atual */}
                {gabarito?.arquivoUrl && !removerArquivo && !novoArquivo && (
                    <div className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <UploadIcon className="h-4 w-4 text-blue-600" />
                            <a
                                href={gabarito.arquivoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                            >
                                Ver arquivo atual
                            </a>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveFile}
                            className="h-7 text-red-600 hover:text-red-700"
                        >
                            <X className="h-3 w-3 mr-1" />
                            Remover
                        </Button>
                    </div>
                )}

                {/* Novo arquivo selecionado */}
                {novoArquivo && (
                    <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <UploadIcon className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-700 dark:text-green-400">
                                Novo arquivo: {novoArquivo.name}
                            </span>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setNovoArquivo(null);
                                setRemoverArquivo(false);
                            }}
                            className="h-7"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                )}

                {/* Input de upload - sempre visível para permitir substituição */}
                <div>
                    <Input
                        id="edit-arquivo"
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="cursor-pointer file:cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        {gabarito?.arquivoUrl && !novoArquivo && !removerArquivo
                            ? 'Selecione um novo arquivo para substituir o atual ou clique em "Remover" para excluir'
                            : removerArquivo
                                ? 'Selecione um novo arquivo para substituir o atual'
                                : 'Envie um arquivo em formato PDF, Word ou Imagem'}
                    </p>
                </div>
            </div>

            {formData.tipo === 'multipla_escolha' && gabarito?.questoes?.length > 0 && (
                <div className="space-y-2">
                    <Label>Questões ({gabarito.questoes.length})</Label>
                    <div className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            As questões de múltipla escolha não podem ser editadas aqui. Para alterá-las, exclua e recrie o gabarito.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={saving}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="gap-2"
                >
                    <Save className="h-4 w-4" />
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </div>
        </div>
    );
}
