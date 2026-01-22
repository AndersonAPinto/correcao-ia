import { NextResponse } from 'next/server';
import { getImageFromMongoDB } from '@/lib/fileStorage';
import { requireAuth } from '@/lib/api-handlers';

/**
 * GET /api/images/[id]
 * Retorna a imagem armazenada no MongoDB GridFS (Apenas usuários autenticados)
 */
export async function GET(request, { params }) {
    try {
        // Adicionar autenticação para segurança
        await requireAuth(request);

        const { id } = params;
        console.log(`🖼️ [IMAGE API] Solicitando imagem ID: ${id}`);

        if (!id || id === 'undefined' || id === 'null') {
            console.error('❌ [IMAGE API] ID inválido fornecido');
            return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
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

