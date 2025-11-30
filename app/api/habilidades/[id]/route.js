import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';

export async function DELETE(request, { params }) {
    try {
        const userId = await requireAuth(request);
        const habilidadeId = params.id;
        const { db } = await connectToDatabase();

        const result = await db.collection('habilidades').deleteOne({
            id: habilidadeId,
            userId
        });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'Habilidade not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}
