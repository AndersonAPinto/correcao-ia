import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request, { params }) {
    try {
        const userId = await requireAuth(request);
        const turmaId = params.id;
        const { db } = await connectToDatabase();

        // Verify turma belongs to user
        const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
        if (!turma) {
            return NextResponse.json({ error: 'Turma not found' }, { status: 404 });
        }

        const alunos = await db.collection('alunos')
            .find({ turmaId })
            .sort({ nome: 1 })
            .toArray();

        return NextResponse.json({ alunos });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}

export async function POST(request, { params }) {
    try {
        const userId = await requireAuth(request);
        const turmaId = params.id;
        const { nome } = await request.json();

        if (!nome) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // Verify turma belongs to user
        const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
        if (!turma) {
            return NextResponse.json({ error: 'Turma not found' }, { status: 404 });
        }

        const aluno = {
            id: uuidv4(),
            turmaId,
            nome,
            createdAt: new Date()
        };

        await db.collection('alunos').insertOne(aluno);
        return NextResponse.json({ aluno });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}
