import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';

export async function GET(request) {
    try {
        const userId = await requireAuth(request);
        const { db } = await connectToDatabase();

        const creditos = await db.collection('creditos').findOne({ userId });

        return NextResponse.json({
            saldo: creditos ? creditos.saldoAtual : 0
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}
