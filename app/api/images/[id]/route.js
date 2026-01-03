import { NextResponse } from 'next/server';
import { getImageFromMongoDB } from '@/lib/fileStorage';
import { requireAuth } from '@/lib/api-handlers';

/**
 * GET /api/images/[id]
 * Retorna a imagem armazenada no MongoDB GridFS (Apenas usuários autenticados)
 */
export async function GET(request, { params }) {
    try {
        // LGPD/GDPR: Proteção de dados do aluno. Apenas usuários logados acessam.
        await requireAuth(request);

        const { id } = params;

        if (!id) {
            return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
        }

        const imageData = await getImageFromMongoDB(id);

        return new NextResponse(imageData.buffer, {
            headers: {
                'Content-Type': imageData.contentType,
                'Content-Length': imageData.buffer.length.toString(),
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Erro ao recuperar imagem:', error);

        if (error.message === 'Arquivo não encontrado') {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        return NextResponse.json({ error: 'Failed to retrieve image' }, { status: 500 });
    }
}

