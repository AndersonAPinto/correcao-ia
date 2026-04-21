import { NextResponse } from 'next/server';
import { getImageFromMongoDB } from '@/lib/fileStorage';
import { requireAuth } from '@/lib/api-handlers';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * GET /api/images/[id]
 * Retorna a imagem armazenada no MongoDB GridFS.
 * Apenas o dono da avaliação à qual a imagem pertence pode acessá-la.
 */
export async function GET(request, { params }) {
    try {
        const userId = await requireAuth(request);

        const { id } = params;
        console.log(`🖼️ [IMAGE API] Solicitando imagem ID: ${id}`);

        if (!id || id === 'undefined' || id === 'null') {
            return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
        }

        // Verificar se a imagem pertence ao usuário autenticado
        const { db } = await connectToDatabase();
        const avaliacao = await db.collection('avaliacoes_corrigidas').findOne({ imageId: id });
        if (!avaliacao || avaliacao.userId !== userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
        }

        const imageData = await getImageFromMongoDB(id);
        console.log(`✅ [IMAGE API] Imagem encontrada: ${imageData.filename} (${imageData.contentType})`);

        // Headers para PDFs (permitir exibição em iframe)
        const isPdf = imageData.contentType === 'application/pdf';
        const headers = {
            'Content-Type': imageData.contentType,
            'Content-Length': imageData.buffer.length.toString(),
            'Cache-Control': 'no-store, must-revalidate',
        };

        // Adicionar headers específicos para PDFs
        if (isPdf) {
            headers['Content-Disposition'] = `inline; filename="${imageData.filename}"`;
            headers['X-Content-Type-Options'] = 'nosniff';
        }

        return new NextResponse(imageData.buffer, {
            headers,
        });
    } catch (error) {
        console.error(`❌ [IMAGE API] Erro ao recuperar imagem ${params.id}:`, error.message);

        if (error.message === 'Arquivo não encontrado' || error.message.includes('Argument passed in must be a string of 12 bytes')) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        return NextResponse.json({ error: 'Failed to retrieve image: ' + error.message }, { status: 500 });
    }
}

