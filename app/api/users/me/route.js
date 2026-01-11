import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';

export async function GET(request) {
    try {
        const userId = await requireAuth(request);
        const { db } = await connectToDatabase();
        const user = await db.collection('users').findOne({ id: userId });

        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                isAdmin: user.isAdmin || 0,
                assinatura: user.assinatura || 'free'
            }
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}
