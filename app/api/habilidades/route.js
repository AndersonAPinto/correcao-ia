import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request) {
    try {
        const userId = await requireAuth(request);
        const { db } = await connectToDatabase();

        const habilidades = await db.collection('habilidades')
            .find({ userId })
            .sort({ nome: 1 })
            .toArray();

        return NextResponse.json({ habilidades });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}

export async function POST(request) {
    try {
        const userId = await requireAuth(request);
        const { nome, descricao } = await request.json();

        if (!nome) {
            return NextResponse.json({ error: 'Missing habilidade name' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // Verificar se já existe habilidade com mesmo nome para o usuário
        const existing = await db.collection('habilidades').findOne({
            userId,
            nome: nome.trim()
        });

        if (existing) {
            return NextResponse.json({ error: 'Habilidade já existe' }, { status: 400 });
        }

        const habilidade = {
            id: uuidv4(),
            userId,
            nome: nome.trim(),
            descricao: descricao || '',
            createdAt: new Date()
        };

        await db.collection('habilidades').insertOne(habilidade);
        return NextResponse.json({ habilidade });
    } catch (error) {
        console.error('Create habilidade error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
