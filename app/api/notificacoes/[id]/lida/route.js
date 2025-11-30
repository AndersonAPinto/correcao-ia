import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';

export async function POST(request, { params }) {
    try {
        const userId = await requireAuth(request);
        const notificacaoId = params.id;
        const { db } = await connectToDatabase();

        const result = await db.collection('notificacoes').updateOne(
            { id: notificacaoId, userId },
            { $set: { lida: true } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Notificação not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}
