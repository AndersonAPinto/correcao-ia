import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth, checkRateLimit } from '@/lib/api-handlers';
import { validateNome } from '@/lib/utils';
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
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const userId = await requireAuth(request);

        // Rate limiting
        const rateLimit = await checkRateLimit(request, userId, 'create_turma', 20, 60);
        if (rateLimit.blocked) {
            return NextResponse.json({
                error: `Muitas tentativas. Tente novamente em ${rateLimit.remainingMinutes} minutos.`
            }, { status: 429 });
        }

        const { nome } = await request.json();

        // Validar nome com whitelist
        const nomeValidation = validateNome(nome, { minLength: 1, maxLength: 200 });
        if (!nomeValidation.valid) {
            return NextResponse.json({ error: nomeValidation.error }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        const turma = {
            id: uuidv4(),
            userId,
            nome: nomeValidation.value,
            createdAt: new Date()
        };

        await db.collection('turmas').insertOne(turma);
        return NextResponse.json({ turma });
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
