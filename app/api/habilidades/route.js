import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth, checkRateLimit } from '@/lib/api-handlers';
import { validateNome, sanitizeString } from '@/lib/utils';
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
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const userId = await requireAuth(request);

        // Rate limiting
        const rateLimit = await checkRateLimit(request, userId, 'create_habilidade', 30, 60);
        if (rateLimit.blocked) {
            return NextResponse.json({
                error: `Muitas tentativas. Tente novamente em ${rateLimit.remainingMinutes} minutos.`
            }, { status: 429 });
        }

        const { nome, descricao } = await request.json();

        // Validar nome com whitelist
        const nomeValidation = validateNome(nome, { minLength: 1, maxLength: 200 });
        if (!nomeValidation.valid) {
            return NextResponse.json({ error: nomeValidation.error }, { status: 400 });
        }

        // Sanitizar descrição
        const sanitizedDescricao = descricao ? sanitizeString(descricao, { maxLength: 2000 }) : '';

        const { db } = await connectToDatabase();

        // Verificar se já existe habilidade com mesmo nome para o usuário
        const existing = await db.collection('habilidades').findOne({
            userId,
            nome: nomeValidation.value
        });

        if (existing) {
            return NextResponse.json({ error: 'Habilidade já existe' }, { status: 400 });
        }

        const habilidade = {
            id: uuidv4(),
            userId,
            nome: nomeValidation.value,
            descricao: sanitizedDescricao,
            createdAt: new Date()
        };

        await db.collection('habilidades').insertOne(habilidade);
        return NextResponse.json({ habilidade });
    } catch (error) {
        console.error('Create habilidade error:', error);
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
