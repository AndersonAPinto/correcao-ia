import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-handlers';
import { deleteImageFromMongoDB, imageExistsInMongoDB } from '@/lib/fileStorage';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * DELETE /api/images/[id]/delete
 * Deleta uma imagem do MongoDB GridFS
 * Verifica se a imagem pertence ao usuário antes de deletar
 */
export async function DELETE(request, { params }) {
    try {
        const userId = await requireAuth(request);
        const { id } = params;
        const { db } = await connectToDatabase();

        if (!id) {
            return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
        }

        // Verificar se a imagem existe
        const exists = await imageExistsInMongoDB(id);
        if (!exists) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        // Verificar se a imagem está sendo usada em alguma avaliação do usuário
        const avaliacao = await db.collection('avaliacoes_corrigidas').findOne({
            userId: userId,
            imageId: id
        });

        if (!avaliacao) {
            // Verificar se está em alguma avaliação (pode ser de outro usuário)
            const anyAvaliacao = await db.collection('avaliacoes_corrigidas').findOne({
                imageId: id
            });

            if (anyAvaliacao && anyAvaliacao.userId !== userId) {
                return NextResponse.json({
                    error: 'Você não tem permissão para deletar esta imagem'
                }, { status: 403 });
            }
        }

        // Deletar a imagem
        await deleteImageFromMongoDB(id);

        // Remover referência da avaliação se existir
        if (avaliacao) {
            await db.collection('avaliacoes_corrigidas').updateOne(
                { id: avaliacao.id },
                { $unset: { imageId: '' } }
            );
        }

        return NextResponse.json({ success: true, message: 'Imagem deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar imagem:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete image' }, { status: 500 });
    }
}

