import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request) {
    try {
        const userId = await requireAuth(request);
        const { db } = await connectToDatabase();

        const turmas = await db.collection('turmas')
            .find({ userId })
            .sort({ createdAt: -1 })
            .toArray();

        return NextResponse.json({ turmas });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}

export async function POST(request) {
    try {
        const userId = await requireAuth(request);
        const { nome } = await request.json();

        if (!nome) {
            return NextResponse.json({ error: 'Missing turma name' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        const turma = {
            id: uuidv4(),
            userId,
            nome,
            createdAt: new Date()
        };

        await db.collection('turmas').insertOne(turma);
        return NextResponse.json({ turma });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}
