import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth, createNotification } from '@/lib/api-handlers';

export async function POST(request, { params }) {
    try {
        const userId = await requireAuth(request);
        const avaliacaoId = params.id;
        const { nota, feedback } = await request.json();

        const { db } = await connectToDatabase();

        const result = await db.collection('avaliacoes_corrigidas').updateOne(
            { id: avaliacaoId, userId },
            {
                $set: {
                    nota: parseFloat(nota),
                    feedback,
                    validado: true,
                    validadoAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Avaliação not found' }, { status: 404 });
        }

        // Criar notificação de validação
        await createNotification(
            db,
            userId,
            'avaliacao_validada',
            `Avaliação validada com sucesso. Nota final: ${nota}`,
            avaliacaoId
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}
