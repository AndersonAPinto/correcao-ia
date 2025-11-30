import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';

export async function GET(request) {
    try {
        const userId = await requireAuth(request);
        const { db } = await connectToDatabase();

        const notificacoes = await db.collection('notificacoes')
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();

        // Contar não lidas
        const naoLidas = await db.collection('notificacoes').countDocuments({
            userId,
            lida: false
        });

        return NextResponse.json({
            notificacoes,
            naoLidas
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}
